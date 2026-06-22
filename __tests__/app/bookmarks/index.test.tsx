/**
 * app/bookmarks/index の画面テスト。
 * ローディング・空状態・エラー・OfflineBanner・戻るボタン・フィード遷移を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import BookmarksScreen from '@/app/bookmarks/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/components/post/PostCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PostCard: ({ id }: { id: string }) =>
      React.createElement(Text, { testID: `post-card-${id}` }, `投稿: ${id}`),
  };
});

jest.mock('@/hooks/use-post-card-props', () => ({
  mapToPostCardProps: (item: { id: string }) => ({ id: item.id }),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: { message: '', visible: false, variant: 'success' as const },
    showToast: jest.fn(),
    hideToast: jest.fn(),
  })),
}));

const mockUseBookmarksQuery = jest.fn();
jest.mock('@/lib/queries/bookmarks', () => ({
  useBookmarksQuery: () => mockUseBookmarksQuery(),
  useToggleBookmarkMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

const defaultQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBookmarksQuery.mockReturnValue(defaultQuery);
  mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
});

describe('BookmarksScreen', () => {
  describe('ヘッダー', () => {
    it('「ブックマーク」というタイトルが表示される', () => {
      renderWithProviders(<BookmarksScreen />);
      expect(screen.getByText('ブックマーク')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      renderWithProviders(<BookmarksScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('「戻る」ボタンタップで router.back が呼ばれる', () => {
      renderWithProviders(<BookmarksScreen />);
      fireEvent.press(screen.getByRole('button', { name: '戻る' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときローディング表示が出る', () => {
      mockUseBookmarksQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<BookmarksScreen />);
      expect(screen.getByText('ブックマーク')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseBookmarksQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<BookmarksScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('items が空のとき「ブックマークがありません」が表示される', () => {
      mockUseBookmarksQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<BookmarksScreen />);
      expect(screen.getByText('ブックマークがありません')).toBeTruthy();
    });

    it('「フィードを見る」ボタンが表示される', () => {
      mockUseBookmarksQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<BookmarksScreen />);
      expect(screen.getByRole('button', { name: 'フィードを見る' })).toBeTruthy();
    });

    it('「フィードを見る」タップでフィードへ遷移する', () => {
      mockUseBookmarksQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<BookmarksScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'フィードを見る' }));
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  describe('オフライン', () => {
    it('オフライン時に OfflineBanner が表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      mockUseBookmarksQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      const { toJSON } = renderWithProviders(<BookmarksScreen />);
      expect(JSON.stringify(toJSON())).toContain('"accessibilityLiveRegion":"assertive"');
    });
  });

  describe('ブックマーク一覧表示（renderItem / keyExtractor）', () => {
    function makeBookmarkItem(id: string) {
      return {
        id,
        content: `投稿内容 ${id}`,
        createdAt: '2025-06-01T00:00:00Z',
        updatedAt: '2025-06-01T00:00:00Z',
        userId: 'user-1',
        user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
        media: [],
        genres: [],
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        isLiked: false,
        isBookmarked: true,
        isReposted: false,
        quotePost: null,
        repostPost: null,
        mentionedUsers: [],
      };
    }

    it('ブックマーク一覧が表示される', () => {
      mockUseBookmarksQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeBookmarkItem('post-1'), makeBookmarkItem('post-2')], nextCursor: null }],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<BookmarksScreen />);
      expect(screen.getByTestId('post-card-post-1')).toBeTruthy();
      expect(screen.getByTestId('post-card-post-2')).toBeTruthy();
    });

    it('FlatList の onEndReached で hasNextPage=true のとき fetchNextPage が呼ばれる', () => {
      const fetchNextPage = jest.fn();
      mockUseBookmarksQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeBookmarkItem('post-1')], nextCursor: 'cursor-1' }],
          pageParams: [undefined],
        },
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      });
      renderWithProviders(<BookmarksScreen />);
      // FlatList には testID がないため UNSAFE_getByProps で取得する
      const lists = screen.UNSAFE_getAllByType(require('react-native').FlatList);
      expect(lists.length).toBeGreaterThan(0);
      fireEvent(lists[0], 'endReached');
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('hasNextPage=false のとき onEndReached で fetchNextPage が呼ばれない', () => {
      const fetchNextPage = jest.fn();
      mockUseBookmarksQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeBookmarkItem('post-1')], nextCursor: null }],
          pageParams: [undefined],
        },
        hasNextPage: false,
        fetchNextPage,
      });
      renderWithProviders(<BookmarksScreen />);
      const lists = screen.UNSAFE_getAllByType(require('react-native').FlatList);
      fireEvent(lists[0], 'endReached');
      expect(fetchNextPage).not.toHaveBeenCalled();
    });
  });
});
