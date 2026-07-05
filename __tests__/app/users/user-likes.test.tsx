/**
 * @module __tests__/app/users/user-likes
 * app/users/[id]/likes/index の画面テスト。
 * ローディング・一覧表示・空状態・403（非公開）・404・オフライン・FlatList の onEndReached を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import UserLikesScreen from '@/app/users/[id]/likes/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ApiError } from '@/lib/api/errors';
import { ERR_USER_NOT_FOUND, ERR_OFFLINE } from '@/lib/constants/errors';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

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

const mockUseUserLikedPostsQuery = jest.fn();
jest.mock('@/lib/queries/posts', () => ({
  useUserLikedPostsQuery: (...args: unknown[]) => mockUseUserLikedPostsQuery(...args),
}));

const mockUseUserProfileQuery = jest.fn();
jest.mock('@/lib/queries/users', () => ({
  useUserProfileQuery: (...args: unknown[]) => mockUseUserProfileQuery(...args),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

const defaultQuery = {
  data: undefined,
  isLoading: true,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'user-1' });
  mockUseUserLikedPostsQuery.mockReturnValue(defaultQuery);
  mockUseUserProfileQuery.mockReturnValue({ data: undefined });
  mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'me-1' } });
});

describe('UserLikesScreen', () => {
  describe('id パラメータ不正', () => {
    it('id が undefined のとき ERR_USER_NOT_FOUND が表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });
  });

  describe('タイトル', () => {
    it('プロフィール取得前は汎用タイトル「いいね」が表示される', () => {
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByText('いいね')).toBeTruthy();
    });

    it('プロフィール取得後は「{nickname}のいいね」が表示される', () => {
      mockUseUserProfileQuery.mockReturnValue({ data: { nickname: '盆栽太郎' } });
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByText('盆栽太郎のいいね')).toBeTruthy();
    });
  });

  describe('一覧表示', () => {
    it('いいねした投稿一覧が表示される', () => {
      mockUseUserLikedPostsQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [{ id: 'post-1' }, { id: 'post-2' }], nextCursor: null }] },
      });
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByTestId('post-card-post-1')).toBeTruthy();
      expect(screen.getByTestId('post-card-post-2')).toBeTruthy();
    });

    it('FlatList の onEndReached で hasNextPage=true のとき fetchNextPage が呼ばれる', () => {
      const fetchNextPage = jest.fn();
      mockUseUserLikedPostsQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [{ id: 'post-1' }], nextCursor: 'cursor-1' }] },
        hasNextPage: true,
        fetchNextPage,
      });
      renderWithProviders(<UserLikesScreen />);
      const lists = screen.UNSAFE_getAllByType(require('react-native').FlatList);
      fireEvent(lists[0], 'endReached');
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('hasNextPage=false のとき onEndReached で fetchNextPage が呼ばれない', () => {
      const fetchNextPage = jest.fn();
      mockUseUserLikedPostsQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [{ id: 'post-1' }], nextCursor: null }] },
        hasNextPage: false,
        fetchNextPage,
      });
      renderWithProviders(<UserLikesScreen />);
      const lists = screen.UNSAFE_getAllByType(require('react-native').FlatList);
      fireEvent(lists[0], 'endReached');
      expect(fetchNextPage).not.toHaveBeenCalled();
    });
  });

  describe('空状態', () => {
    it('items が空のとき「いいねした投稿がありません」が表示される', () => {
      mockUseUserLikedPostsQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [], nextCursor: null }] },
      });
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByText('いいねした投稿がありません')).toBeTruthy();
    });
  });

  describe('403（非公開アカウント）', () => {
    it('status=403 のとき非公開アカウントの案内が表示される', () => {
      mockUseUserLikedPostsQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new ApiError({ code: 'NOT_FOUND', status: 403, message: 'forbidden' }),
      });
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByText('このアカウントは非公開です')).toBeTruthy();
      expect(
        screen.getByText('フォローリクエストが承認されると、いいねした投稿を閲覧できるようになります。')
      ).toBeTruthy();
    });
  });

  describe('404 エラー', () => {
    it('status=404 のとき「ユーザーが見つかりません」が表示される', () => {
      mockUseUserLikedPostsQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' }),
      });
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByText('ユーザーが見つかりません')).toBeTruthy();
    });
  });

  describe('一般エラー', () => {
    it('その他のエラーのとき「読み込めませんでした」が表示される', () => {
      mockUseUserLikedPostsQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new Error('network error'),
      });
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('オフライン', () => {
    it('オフライン時に OfflineBanner が表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      mockUseUserLikedPostsQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [], nextCursor: null }] },
      });
      renderWithProviders(<UserLikesScreen />);
      expect(screen.getByLabelText(ERR_OFFLINE)).toBeTruthy();
    });
  });
});
