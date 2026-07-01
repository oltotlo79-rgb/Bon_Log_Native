/**
 * @module __tests__/app/messages/messages-list
 * DM 会話一覧画面のテスト。
 * useConversationsQuery と useCurrentUserQuery をモック境界とする。
 * 4 状態（ローディング / 空 / エラー / オフライン）と行タップの遷移を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import MessagesScreen from '@/app/messages/index';
import { makeConversationItem, makeConversationListPage } from '@/__tests__/utils/data-factories';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { routeMessageThread } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseConversationsQuery = jest.fn();

jest.mock('@/lib/queries/messages', () => ({
  useConversationsQuery: (...args: unknown[]) => mockUseConversationsQuery(...args),
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

// ---------------------------------------------------------------------------
// デフォルトのクエリ戻り値
// ---------------------------------------------------------------------------

function makeDefaultQueryReturn(overrides?: Partial<ReturnType<typeof mockUseConversationsQuery>>) {
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

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('MessagesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ローディング状態', () => {
    it('isLoading が true のとき会話一覧コンテンツが表示されない', () => {
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({ isLoading: true })
      );
      renderWithProviders(<MessagesScreen />);
      expect(screen.queryByText('まだメッセージはありません')).toBeNull();
    });

    it('isLoading が true のとき「メッセージ」ヘッダーが表示される', () => {
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({ isLoading: true })
      );
      renderWithProviders(<MessagesScreen />);
      expect(screen.getByRole('header', { name: 'メッセージ' })).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('会話が 0 件のとき「まだメッセージはありません」が表示される', () => {
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({
          data: { pages: [makeConversationListPage([])], pageParams: [undefined] },
        })
      );
      renderWithProviders(<MessagesScreen />);
      expect(screen.getByText('まだメッセージはありません')).toBeTruthy();
    });

    it('空状態の説明文が表示される', () => {
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({
          data: { pages: [makeConversationListPage([])], pageParams: [undefined] },
        })
      );
      renderWithProviders(<MessagesScreen />);
      expect(
        screen.getByText('ユーザーのプロフィールからメッセージを送ることができます')
      ).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError が true のとき「読み込めませんでした」が表示される', () => {
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({
          isError: true,
          error: new Error('fetch failed'),
        })
      );
      renderWithProviders(<MessagesScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });

    it('エラー時に再試行ボタンが表示される', () => {
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({
          isError: true,
          error: new Error('fetch failed'),
        })
      );
      renderWithProviders(<MessagesScreen />);
      expect(screen.getByRole('button', { name: '再試行' })).toBeTruthy();
    });

    it('再試行ボタンタップで refetch が呼ばれる', () => {
      const refetch = jest.fn();
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({
          isError: true,
          error: new Error('fetch failed'),
          refetch,
        })
      );
      renderWithProviders(<MessagesScreen />);
      fireEvent.press(screen.getByRole('button', { name: '再試行' }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('オフライン状態', () => {
    it('オフライン時にオフラインバナーが表示される（エラー状態と組み合わせ）', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);

      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({
          isError: true,
          error: new Error('network error'),
        })
      );
      renderWithProviders(<MessagesScreen />);
      expect(screen.getByText(/オフライン/)).toBeTruthy();
    });
  });

  describe('会話一覧の表示', () => {
    it('会話が 2 件のとき両方のニックネームが表示される', async () => {
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({
          data: {
            pages: [
              makeConversationListPage([
                makeConversationItem({
                  id: 'conv-1',
                  otherUser: { id: 'user-2', nickname: '盆栽花子', avatarUrl: null },
                }),
                makeConversationItem({
                  id: 'conv-2',
                  otherUser: { id: 'user-3', nickname: '松の匠', avatarUrl: null },
                }),
              ]),
            ],
            pageParams: [undefined],
          },
        })
      );
      renderWithProviders(<MessagesScreen />);
      await waitFor(() => {
        expect(screen.getByText('盆栽花子')).toBeTruthy();
        expect(screen.getByText('松の匠')).toBeTruthy();
      });
    });
  });

  describe('行タップ → 会話スレッド遷移', () => {
    it('会話行タップで routeMessageThread の値を引数に router.push が呼ばれる', async () => {
      mockUseConversationsQuery.mockReturnValue(
        makeDefaultQueryReturn({
          data: {
            pages: [
              makeConversationListPage([
                makeConversationItem({
                  id: 'conv-abc',
                  otherUser: { id: 'user-2', nickname: '盆栽花子', avatarUrl: null },
                }),
              ]),
            ],
            pageParams: [undefined],
          },
        })
      );
      renderWithProviders(<MessagesScreen />);

      await waitFor(() => {
        expect(screen.getByText('盆栽花子')).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /盆栽花子との会話/ }));
      expect(mockRouter.push).toHaveBeenCalledWith(
        routeMessageThread('conv-abc', { nickname: '盆栽花子', avatarUrl: null, userId: 'user-2' })
      );
    });
  });

  describe('ナビゲーションバー', () => {
    it('「メッセージ」ヘッダーが表示される', () => {
      mockUseConversationsQuery.mockReturnValue(makeDefaultQueryReturn());
      renderWithProviders(<MessagesScreen />);
      expect(screen.getByRole('header', { name: 'メッセージ' })).toBeTruthy();
    });

    it('戻るボタンが表示される', () => {
      mockUseConversationsQuery.mockReturnValue(makeDefaultQueryReturn());
      renderWithProviders(<MessagesScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('戻るボタンタップで router.back が呼ばれる', () => {
      mockUseConversationsQuery.mockReturnValue(makeDefaultQueryReturn());
      renderWithProviders(<MessagesScreen />);
      fireEvent.press(screen.getByRole('button', { name: '戻る' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });
});
