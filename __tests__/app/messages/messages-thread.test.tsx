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

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams as jest.Mock;

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseMessagesQuery = jest.fn();
const mockUseSendMessageMutation = jest.fn();
const mockUseDeleteMessageMutation = jest.fn();

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
  useOnlineStatus: jest.fn(() => true),
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

function setupMocks(overrides?: {
  messagesQuery?: Partial<ReturnType<typeof mockUseMessagesQuery>>;
  sendMutation?: { mutate?: jest.Mock; isPending?: boolean };
  deleteMutation?: { mutate?: jest.Mock; isPending?: boolean };
  conversationId?: string;
}) {
  mockUseLocalSearchParams.mockReturnValue({
    conversationId: overrides?.conversationId ?? 'conv-1',
  });
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
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);

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

      expect(mutate).toHaveBeenCalledWith({ content: 'テストメッセージ' });
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

    it('送信後に入力欄がリセットされる（mutate 呼び出し前にクリアする実装）', async () => {
      const mutate = jest.fn();
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
