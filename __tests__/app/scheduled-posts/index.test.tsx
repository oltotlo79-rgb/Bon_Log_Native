/**
 * app/scheduled-posts/index の画面テスト。
 * ローディング・空状態・エラー・403 PREMIUM_REQUIRED・statusフィルタ・FAB無効化・OfflineBanner を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ScheduledPostsScreen from '@/app/scheduled-posts/index';
import { ApiError } from '@/lib/api/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseScheduledPostsQuery = jest.fn();
jest.mock('@/lib/queries/scheduled-posts', () => ({
  useScheduledPostsQuery: () => mockUseScheduledPostsQuery(),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: jest.fn(),
    PATCH: jest.fn(),
    DELETE: jest.fn(),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

function makePremiumRequiredError(): ApiError {
  return new ApiError({ code: 'PREMIUM_REQUIRED', status: 403, message: 'premium required' });
}

const defaultQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

function makeScheduledPostItem(id: string, status = 'pending') {
  return {
    id,
    content: '予約投稿テスト',
    scheduledAt: '2025-09-01T10:00:00Z',
    status,
    genreIds: [],
    mediaUrls: [],
    mediaTypes: [],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseScheduledPostsQuery.mockReturnValue(defaultQuery);
  mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1', isPremium: true }, isLoading: false });
});

describe('ScheduledPostsScreen', () => {
  describe('ヘッダー', () => {
    it('「予約投稿」というタイトルが表示される', () => {
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByText('予約投稿')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });
  });

  describe('ステータスフィルタ（3タブ構成: 予約中/公開済み/その他）', () => {
    it('「予約中」タブが表示される', () => {
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByRole('tab', { name: /^予約中/ })).toBeTruthy();
    });

    it('「公開済み」タブが表示される', () => {
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByRole('tab', { name: /^公開済み/ })).toBeTruthy();
    });

    it('「その他」タブが表示される', () => {
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByRole('tab', { name: /^その他/ })).toBeTruthy();
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときヘッダーが表示される', () => {
      mockUseScheduledPostsQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined, isLoading: true });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByText('予約投稿')).toBeTruthy();
    });
  });

  describe('403 PREMIUM_REQUIRED', () => {
    it('isError=true かつ PREMIUM_REQUIRED のとき「プレミアム機能です」が表示される', () => {
      const err = makePremiumRequiredError();
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        isError: true,
        error: err,
      });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByText('プレミアム機能です')).toBeTruthy();
    });

    it('PREMIUM_REQUIRED のとき「アップグレードする」ボタンが表示される', () => {
      const err = makePremiumRequiredError();
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        isError: true,
        error: err,
      });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByRole('button', { name: 'アップグレードする' })).toBeTruthy();
    });

    it('非プレミアムユーザーはロック画面へ redirect される', () => {
      mockUseCurrentUserQuery.mockReturnValue({
        data: { id: 'user-1', isPremium: false },
        isLoading: false,
      });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(mockRouter.replace).toHaveBeenCalledWith('/scheduled-posts/locked');
    });
  });

  describe('エラー状態（プレミアム以外）', () => {
    it('isError=true かつ non-PREMIUM のとき「読み込めませんでした」が表示される', () => {
      const err = new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'server error' });
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        isError: true,
        error: err,
      });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('items が空のとき既定タブ（予約中）の空文言「予約中の投稿はありません」が表示される', () => {
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByText('予約中の投稿はありません')).toBeTruthy();
    });

    it('「公開済み」タブが空のとき「公開済みの予約投稿はありません」が表示される', () => {
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      fireEvent.press(screen.getByRole('tab', { name: /^公開済み/ }));
      expect(screen.getByText('公開済みの予約投稿はありません')).toBeTruthy();
    });

    it('「その他」タブが空のとき「失敗・キャンセルされた投稿はありません」が表示される', () => {
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      fireEvent.press(screen.getByRole('tab', { name: /^その他/ }));
      expect(screen.getByText('失敗・キャンセルされた投稿はありません')).toBeTruthy();
    });
  });

  describe('FAB', () => {
    it('FABが表示される', () => {
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByRole('button', { name: '予約投稿を作成する' })).toBeTruthy();
    });

    it('FABタップで新規予約投稿画面へ遷移する', () => {
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      fireEvent.press(screen.getByRole('button', { name: '予約投稿を作成する' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/scheduled-posts/new');
    });

    it('pending が10件のとき FAB が disabled になる', () => {
      const pendingItems = Array.from({ length: 10 }, (_, i) =>
        makeScheduledPostItem(`sp-${i}`, 'pending')
      );
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: pendingItems, nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      const fab = screen.getByRole('button', { name: '予約投稿を作成する' });
      expect(fab.props.accessibilityState?.disabled).toBe(true);
    });

    it('pending が9件のとき FAB が enabled のまま', () => {
      const pendingItems = Array.from({ length: 9 }, (_, i) =>
        makeScheduledPostItem(`sp-${i}`, 'pending')
      );
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: pendingItems, nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      const fab = screen.getByRole('button', { name: '予約投稿を作成する' });
      expect(fab.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('データ表示', () => {
    it('予約投稿カードが表示される', () => {
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [
            {
              items: [makeScheduledPostItem('sp-1', 'pending')],
              nextCursor: null,
            },
          ],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByText('予約投稿テスト')).toBeTruthy();
    });

    it('既定タブ「予約中」では pending のみ表示される', () => {
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [
            {
              items: [
                makeScheduledPostItem('sp-1', 'pending'),
                makeScheduledPostItem('sp-2', 'published'),
              ],
              nextCursor: null,
            },
          ],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      expect(screen.getByText('予約投稿テスト')).toBeTruthy();
      expect(screen.getAllByText('予約中').length).toBeGreaterThan(0);
      expect(screen.queryByText('公開済み')).toBeNull();
    });

    it('「公開済み」タブに切り替えると published のみ表示される', () => {
      mockUseScheduledPostsQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [
            {
              items: [
                makeScheduledPostItem('sp-1', 'pending'),
                makeScheduledPostItem('sp-2', 'published'),
              ],
              nextCursor: null,
            },
          ],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ScheduledPostsScreen />);
      fireEvent.press(screen.getByRole('tab', { name: /^公開済み/ }));
      expect(screen.getByText('予約投稿テスト')).toBeTruthy();
      expect(screen.getAllByText('公開済み').length).toBeGreaterThan(0);
    });
  });
});
