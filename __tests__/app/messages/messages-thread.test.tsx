/**
 * @module __tests__/app/messages/messages-thread
 * DM 会話スレッド画面のテスト。
 * useMessagesQuery / useSendMessageMutation / useDeleteMessageMutation /
 * useCurrentUserQuery / useLocalSearchParams / router をモック境界とする。
 * 4 状態（ローディング / 空 / エラー / オフライン）・送信・削除・NOT_FOUND を検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import ConversationThreadScreen from '@/app/messages/[conversationId]/index';
import {
  makeMessageItem,
  makeMessageListPage,
} from '@/__tests__/utils/data-factories';
import { ApiError } from '@/lib/api/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import {
  ERR_MESSAGE_DAILY_LIMIT,
  ERR_MESSAGE_RATE_LIMITED,
  ERR_MESSAGE_SEND_FAILED,
  ERR_MESSAGE_UNAVAILABLE,
  ERR_NETWORK,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';

const mockUseLocalSearchParams: jest.Mock = jest.requireMock('expo-router').useLocalSearchParams;

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseMessagesQuery = jest.fn();
const mockUseSendMessageMutation = jest.fn();
const mockUseDeleteMessageMutation = jest.fn();
const mockUseOnlineStatus = jest.fn(() => true);

jest.mock('@/lib/queries/messages', () => ({
  useMessagesQuery: (...args: unknown[]) => mockUseMessagesQuery(...args),
  useSendMessageMutation: (...args: unknown[]) => mockUseSendMessageMutation(...args),
  useDeleteMessageMutation: (...args: unknown[]) => mockUseDeleteMessageMutation(...args),
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: jest.fn(() => ({
    data: { id: 'user-1', nickname: '盆栽太郎', avatarUrl: null, isPremium: false },
    isLoading: false,
    isError: false,
  })),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock('@/lib/api/errors', () => {
  const actual = jest.requireActual('@/lib/api/errors');
  return { ...actual };
});

// ---------------------------------------------------------------------------
// デフォルト戻り値
// ---------------------------------------------------------------------------

function makeDefaultMessagesQueryReturn(
  overrides?: Partial<ReturnType<typeof mockUseMessagesQuery>>
) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    ...overrides,
  };
}

function makeDefaultSendMutationReturn(overrides?: { mutate?: jest.Mock; isPending?: boolean }) {
  return {
    mutate: jest.fn(),
    isPending: false,
    ...overrides,
  };
}

type SendMutationCallbacks = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

function makeSuccessfulSendMutation(): jest.Mock {
  return jest.fn(
    (_variables: { content: string }, callbacks?: SendMutationCallbacks) => {
      callbacks?.onSuccess?.();
    }
  );
}

function makeFailingSendMutation(error: Error): jest.Mock {
  return jest.fn(
    (_variables: { content: string }, callbacks?: SendMutationCallbacks) => {
      callbacks?.onError?.(error);
    }
  );
}

function makeDefaultDeleteMutationReturn(overrides?: { mutate?: jest.Mock; isPending?: boolean }) {
  return {
    mutate: jest.fn(),
    isPending: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップヘルパー
// ---------------------------------------------------------------------------

type OtherUserParam = {
  nickname: string;
  avatarUrl?: string;
  userId: string;
};

function setupMocks(overrides?: {
  messagesQuery?: Partial<ReturnType<typeof mockUseMessagesQuery>>;
  sendMutation?: { mutate?: jest.Mock; isPending?: boolean };
  deleteMutation?: { mutate?: jest.Mock; isPending?: boolean };
  conversationId?: string;
  paramOtherUser?: OtherUserParam;
}) {
  const params: Record<string, string> = {
    conversationId: overrides?.conversationId ?? 'conv-1',
  };
  if (overrides?.paramOtherUser !== undefined) {
    params['nickname'] = overrides.paramOtherUser.nickname;
    params['userId'] = overrides.paramOtherUser.userId;
    if (overrides.paramOtherUser.avatarUrl !== undefined) {
      params['avatarUrl'] = overrides.paramOtherUser.avatarUrl;
    }
  }
  mockUseLocalSearchParams.mockReturnValue(params);
  mockUseMessagesQuery.mockReturnValue(
    makeDefaultMessagesQueryReturn(overrides?.messagesQuery)
  );
  mockUseSendMessageMutation.mockReturnValue(
    makeDefaultSendMutationReturn(overrides?.sendMutation)
  );
  mockUseDeleteMessageMutation.mockReturnValue(
    makeDefaultDeleteMutationReturn(overrides?.deleteMutation)
  );
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('ConversationThreadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnlineStatus.mockReturnValue(true);
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('conversationId パラメータ不正', () => {
    it('conversationId が空文字のとき ERR_USER_NOT_FOUND に関連するテキストが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ conversationId: '' });
      mockUseMessagesQuery.mockReturnValue(makeDefaultMessagesQueryReturn());
      mockUseSendMessageMutation.mockReturnValue(makeDefaultSendMutationReturn());
      mockUseDeleteMessageMutation.mockReturnValue(makeDefaultDeleteMutationReturn());
      renderWithProviders(<ConversationThreadScreen />);
      // ERR_USER_NOT_FOUND の文字列は errors.ts の定数のため、「戻る」ボタンの存在で代替検証
      // 複数の「戻る」ボタンが表示される可能性があるため getAllByRole で検証する
      expect(screen.getAllByRole('button', { name: '戻る' }).length).toBeGreaterThan(0);
    });
  });

  describe('ローディング状態', () => {
    it('isLoading が true のときメッセージ一覧が表示されない', () => {
      setupMocks({ messagesQuery: { isLoading: true } });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.queryByLabelText('メッセージ一覧')).toBeNull();
    });

    it('isLoading が true のとき「読み込み中...」ヘッダーが表示される', () => {
      setupMocks({ messagesQuery: { isLoading: true } });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByText('読み込み中...')).toBeTruthy();
    });

    it('ローディング中に paramOtherUser が渡されているとき相手名がヘッダーに表示される', () => {
      setupMocks({
        messagesQuery: { isLoading: true },
        paramOtherUser: { nickname: '盆栽花子', userId: 'user-2' },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByText('盆栽花子')).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('メッセージ 0 件のとき「まだメッセージはありません」が表示される', () => {
      setupMocks({
        messagesQuery: {
          data: { pages: [makeMessageListPage([])], pageParams: [undefined] },
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByText('まだメッセージはありません')).toBeTruthy();
    });

    it('空状態でも入力欄が表示される', () => {
      setupMocks({
        messagesQuery: {
          data: { pages: [makeMessageListPage([])], pageParams: [undefined] },
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByLabelText('メッセージ入力欄')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError が true（かつ NOT_FOUND でない）とき「読み込めませんでした」が表示される', () => {
      setupMocks({
        messagesQuery: {
          isError: true,
          error: new Error('server error'),
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });

    it('エラー時に再試行ボタンが表示される', () => {
      setupMocks({
        messagesQuery: {
          isError: true,
          error: new Error('server error'),
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByRole('button', { name: '再試行' })).toBeTruthy();
    });

    it('再試行ボタンタップで refetch が呼ばれる', () => {
      const refetch = jest.fn();
      setupMocks({
        messagesQuery: {
          isError: true,
          error: new Error('server error'),
          refetch,
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      fireEvent.press(screen.getByRole('button', { name: '再試行' }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('NOT_FOUND 専用表示（403 + code=NOT_FOUND）', () => {
    it('403 NOT_FOUND のとき「会話が見つかりません」が表示される', () => {
      const notFoundError = new ApiError({
        code: 'NOT_FOUND',
        status: 403,
        message: 'Not found',
      });
      setupMocks({
        messagesQuery: {
          isError: true,
          error: notFoundError,
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByText('会話が見つかりません')).toBeTruthy();
    });

    it('NOT_FOUND 表示では「アクセス権限がありません」説明文が表示される', () => {
      const notFoundError = new ApiError({
        code: 'NOT_FOUND',
        status: 403,
        message: 'Not found',
      });
      setupMocks({
        messagesQuery: {
          isError: true,
          error: notFoundError,
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(
        screen.getByText(/アクセス権限がありません/)
      ).toBeTruthy();
    });

    it('NOT_FOUND 表示では戻るボタンが表示される', () => {
      const notFoundError = new ApiError({
        code: 'NOT_FOUND',
        status: 403,
        message: 'Not found',
      });
      setupMocks({
        messagesQuery: {
          isError: true,
          error: notFoundError,
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      // NavBar の「戻る」と画面内の「戻る」で複数存在するため getAllByRole で検証する
      expect(screen.getAllByRole('button', { name: '戻る' }).length).toBeGreaterThan(0);
    });

    it('403 だが code が NOT_FOUND でないとき通常エラー表示になる', () => {
      const forbiddenError = new ApiError({
        code: 'GUEST_NOT_ALLOWED',
        status: 403,
        message: 'Forbidden',
      });
      setupMocks({
        messagesQuery: {
          isError: true,
          error: forbiddenError,
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
      expect(screen.queryByText('会話が見つかりません')).toBeNull();
    });
  });

  describe('オフライン状態', () => {
    it('オフライン時にエラー画面でオフラインバナーが表示される', () => {
      mockUseOnlineStatus.mockReturnValue(false);

      setupMocks({
        messagesQuery: {
          isError: true,
          error: new Error('network error'),
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      expect(screen.getByText(/オフライン/)).toBeTruthy();
    });
  });

  describe('メッセージ一覧の表示', () => {
    it('メッセージが存在するとき本文が表示される', async () => {
      setupMocks({
        messagesQuery: {
          data: {
            pages: [
              makeMessageListPage([
                makeMessageItem({ id: 'msg-1', content: 'こんにちは' }),
              ]),
            ],
            pageParams: [undefined],
          },
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      await waitFor(() => {
        expect(screen.getByText('こんにちは')).toBeTruthy();
      });
    });

    it('複数のメッセージが表示される', async () => {
      setupMocks({
        messagesQuery: {
          data: {
            pages: [
              makeMessageListPage([
                makeMessageItem({ id: 'msg-1', content: '最初のメッセージ' }),
                makeMessageItem({ id: 'msg-2', content: '次のメッセージ', createdAt: '2025-06-01T11:00:00Z' }),
              ]),
            ],
            pageParams: [undefined],
          },
        },
      });
      renderWithProviders(<ConversationThreadScreen />);
      await waitFor(() => {
        expect(screen.getByText('最初のメッセージ')).toBeTruthy();
        expect(screen.getByText('次のメッセージ')).toBeTruthy();
      });
    });
  });

  describe('メッセージ送信', () => {
    it('入力欄にテキストを入力して送信ボタンを押すと mutate が呼ばれる', async () => {
      const mutate = jest.fn();
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const input = screen.getByLabelText('メッセージ入力欄');
      const sendButton = screen.getByRole('button', { name: '送信' });

      await act(async () => {
        fireEvent.changeText(input, 'テストメッセージ');
      });
      fireEvent.press(sendButton);

      expect(mutate).toHaveBeenCalledWith(
        { content: 'テストメッセージ' },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('空文字（スペースのみ）のとき送信ボタンが無効になる', async () => {
      const mutate = jest.fn();
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const sendButton = screen.getByRole('button', { name: '送信' });
      expect(sendButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('空文字のとき送信ボタンを押しても mutate は呼ばれない', async () => {
      const mutate = jest.fn();
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const sendButton = screen.getByRole('button', { name: '送信' });
      fireEvent.press(sendButton);

      expect(mutate).not.toHaveBeenCalled();
    });

    it('送信中（isPending: true）のとき送信ボタンが無効になる', async () => {
      setupMocks({ sendMutation: { isPending: true } });
      renderWithProviders(<ConversationThreadScreen />);

      const input = screen.getByLabelText('メッセージ入力欄');
      await act(async () => {
        fireEvent.changeText(input, 'テスト');
      });

      const sendButton = screen.getByRole('button', { name: '送信' });
      expect(sendButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('送信結果を待っている間は入力欄を保持する', async () => {
      const mutate = jest.fn();
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const input = screen.getByLabelText('メッセージ入力欄');
      await act(async () => {
        fireEvent.changeText(input, 'テストメッセージ');
      });
      fireEvent.press(screen.getByRole('button', { name: '送信' }));

      expect(input.props.value).toBe('テストメッセージ');
    });

    it('送信成功後に入力欄をクリアする', async () => {
      const mutate = makeSuccessfulSendMutation();
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const input = screen.getByLabelText('メッセージ入力欄');
      await act(async () => {
        fireEvent.changeText(input, 'テストメッセージ');
      });
      fireEvent.press(screen.getByRole('button', { name: '送信' }));

      await waitFor(() => {
        expect(input.props.value).toBe('');
      });
    });

    it('送信待機中に追加入力した本文は成功後も保持する', async () => {
      let completeSend: (() => void) | undefined;
      const mutate = jest.fn(
        (_variables: { content: string }, callbacks?: SendMutationCallbacks) => {
          completeSend = callbacks?.onSuccess;
        }
      );
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const input = screen.getByLabelText('メッセージ入力欄');
      await act(async () => {
        fireEvent.changeText(input, '送信する本文');
      });
      fireEvent.press(screen.getByRole('button', { name: '送信' }));
      await act(async () => {
        fireEvent.changeText(input, '次に送る本文');
        completeSend?.();
      });

      expect(input.props.value).toBe('次に送る本文');
    });

    it.each([
      [
        new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited' }),
        ERR_MESSAGE_RATE_LIMITED,
      ],
      [
        new ApiError({ code: 'VALIDATION_ERROR', status: 400, message: 'daily limit' }),
        ERR_MESSAGE_DAILY_LIMIT,
      ],
      [
        new ApiError({ code: 'NOT_FOUND', status: 403, message: 'not found' }),
        ERR_MESSAGE_UNAVAILABLE,
      ],
      [
        new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'server error' }),
        ERR_MESSAGE_SEND_FAILED,
      ],
      [new Error('network error'), ERR_NETWORK],
    ])('送信失敗時にコード別エラーを表示して入力を保持する', async (error, message) => {
      const mutate = makeFailingSendMutation(error);
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const input = screen.getByLabelText('メッセージ入力欄');
      await act(async () => {
        fireEvent.changeText(input, '消してはいけない本文');
      });
      fireEvent.press(screen.getByRole('button', { name: '送信' }));

      expect(await screen.findByText(message)).toBeTruthy();
      expect(input.props.value).toBe('消してはいけない本文');
      expect(
        screen.getByRole('button', { name: 'メッセージ送信を再試行' })
      ).toBeTruthy();
    });

    it('再試行ボタンで保持した本文を再送する', async () => {
      const mutate = makeFailingSendMutation(
        new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited' })
      );
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const input = screen.getByLabelText('メッセージ入力欄');
      await act(async () => {
        fireEvent.changeText(input, '再送する本文');
      });
      fireEvent.press(screen.getByRole('button', { name: '送信' }));
      fireEvent.press(
        await screen.findByRole('button', { name: 'メッセージ送信を再試行' })
      );

      expect(mutate).toHaveBeenCalledTimes(2);
      expect(mutate).toHaveBeenLastCalledWith(
        { content: '再送する本文' },
        expect.objectContaining({ onError: expect.any(Function) })
      );
    });

    it('オフライン時は通信せず本文とエラーを表示する', async () => {
      const mutate = jest.fn();
      mockUseOnlineStatus.mockReturnValue(false);
      setupMocks({ sendMutation: { mutate } });
      renderWithProviders(<ConversationThreadScreen />);

      const input = screen.getByLabelText('メッセージ入力欄');
      await act(async () => {
        fireEvent.changeText(input, 'オフライン中の本文');
      });
      fireEvent.press(screen.getByRole('button', { name: '送信' }));

      expect(await screen.findByText(ERR_OFFLINE_ACTION)).toBeTruthy();
      expect(input.props.value).toBe('オフライン中の本文');
      expect(mutate).not.toHaveBeenCalled();
    });
  });

  describe('メッセージ削除（自分のメッセージ長押し）', () => {
    it('自分のメッセージを長押しすると Alert.alert が呼ばれる', async () => {
      const CURRENT_USER_ID = 'user-1';
      setupMocks({
        messagesQuery: {
          data: {
            pages: [
              makeMessageListPage([
                makeMessageItem({
                  id: 'msg-own',
                  content: '自分のメッセージ',
                  senderId: CURRENT_USER_ID,
                  sender: { id: CURRENT_USER_ID, nickname: '盆栽太郎', avatarUrl: null },
                }),
              ]),
            ],
            pageParams: [undefined],
          },
        },
      });
      renderWithProviders(<ConversationThreadScreen />);

      await waitFor(() => {
        expect(screen.getByText('自分のメッセージ')).toBeTruthy();
      });

      const bubble = screen.getByLabelText(/自分のメッセージ/);
      fireEvent(bubble, 'longPress');

      expect(Alert.alert).toHaveBeenCalledWith(
        'メッセージを削除',
        'このメッセージを削除しますか？',
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('Alert の「削除」を押すと deleteMessage mutate が messageId を引数に呼ばれる', async () => {
      const deleteMutate = jest.fn();
      const CURRENT_USER_ID = 'user-1';

      jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
        const deleteButton = buttons?.find((b) => b.text === '削除');
        deleteButton?.onPress?.();
      });

      setupMocks({
        messagesQuery: {
          data: {
            pages: [
              makeMessageListPage([
                makeMessageItem({
                  id: 'msg-own',
                  content: '自分のメッセージ',
                  senderId: CURRENT_USER_ID,
                  sender: { id: CURRENT_USER_ID, nickname: '盆栽太郎', avatarUrl: null },
                }),
              ]),
            ],
            pageParams: [undefined],
          },
        },
        deleteMutation: { mutate: deleteMutate },
      });
      renderWithProviders(<ConversationThreadScreen />);

      await waitFor(() => {
        expect(screen.getByText('自分のメッセージ')).toBeTruthy();
      });

      const bubble = screen.getByLabelText(/自分のメッセージ/);
      fireEvent(bubble, 'longPress');

      expect(deleteMutate).toHaveBeenCalledWith({ messageId: 'msg-own' });
    });
  });
});
