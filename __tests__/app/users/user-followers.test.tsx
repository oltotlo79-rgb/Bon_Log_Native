/**
 * @module __tests__/app/users/user-followers
 * app/users/[id]/followers/index の画面テスト。
 * ローディング・一覧表示・バッジ（フォローされています）・空状態・403（非公開）・タップ遷移を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import UserFollowersScreen from '@/app/users/[id]/followers/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ApiError } from '@/lib/api/errors';
import { ERR_USER_NOT_FOUND } from '@/lib/constants/errors';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseUserFollowersQuery = jest.fn();
jest.mock('@/lib/queries/follows', () => ({
  useUserFollowersQuery: (...args: unknown[]) => mockUseUserFollowersQuery(...args),
}));

const mockUseUserProfileQuery = jest.fn();
jest.mock('@/lib/queries/users', () => ({
  useUserProfileQuery: (...args: unknown[]) => mockUseUserProfileQuery(...args),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/components/user/FollowButton', () => ({
  FollowButton: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="follow-button">
        <Text>フォロー</Text>
      </View>
    );
  },
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

function makeConnectionItem(overrides?: Record<string, unknown>) {
  return {
    id: 'user-2',
    nickname: '松の匠',
    avatarUrl: null,
    bio: null,
    isPublic: true,
    following: false,
    requested: false,
    isFollowedBy: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'user-1' });
  mockUseUserFollowersQuery.mockReturnValue(defaultQuery);
  mockUseUserProfileQuery.mockReturnValue({ data: undefined });
  mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'me-1' } });
});

describe('UserFollowersScreen', () => {
  describe('id パラメータ不正', () => {
    it('id が undefined のとき ERR_USER_NOT_FOUND が表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });
  });

  describe('タイトル', () => {
    it('プロフィール取得前は汎用タイトル「フォロワー」が表示される', () => {
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText('フォロワー')).toBeTruthy();
    });

    it('プロフィール取得後は「{nickname}のフォロワー」が表示される', () => {
      mockUseUserProfileQuery.mockReturnValue({ data: { nickname: '盆栽太郎' } });
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText('盆栽太郎のフォロワー')).toBeTruthy();
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときタイトルは表示される（スケルトン描画）', () => {
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByRole('header')).toBeTruthy();
    });
  });

  describe('一覧表示', () => {
    it('フォロワー一覧が表示される', () => {
      mockUseUserFollowersQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [makeConnectionItem({ id: 'u-1', nickname: '黒松太郎' })], nextCursor: null }] },
      });
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText('黒松太郎')).toBeTruthy();
    });

    it('isFollowedBy=true のとき「フォローされています」バッジが表示される', () => {
      mockUseUserFollowersQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: {
          pages: [
            {
              items: [makeConnectionItem({ id: 'u-1', nickname: '黒松太郎', isFollowedBy: true })],
              nextCursor: null,
            },
          ],
        },
      });
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText('フォローされています')).toBeTruthy();
    });

    it('isFollowedBy=false のときバッジは表示されない', () => {
      mockUseUserFollowersQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: {
          pages: [
            { items: [makeConnectionItem({ id: 'u-1', nickname: '黒松太郎', isFollowedBy: false })], nextCursor: null },
          ],
        },
      });
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.queryByText('フォローされています')).toBeNull();
    });

    it('行をタップするとプロフィールへ遷移する', () => {
      mockUseUserFollowersQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: {
          pages: [{ items: [makeConnectionItem({ id: 'user-xyz', nickname: '黒松太郎' })], nextCursor: null }],
        },
      });
      renderWithProviders(<UserFollowersScreen />);
      fireEvent.press(screen.getByText('黒松太郎'));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/user-xyz');
    });
  });

  describe('空状態', () => {
    it('items が空のとき「フォロワーはいません」が表示される', () => {
      mockUseUserFollowersQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [], nextCursor: null }] },
      });
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText('フォロワーはいません')).toBeTruthy();
    });
  });

  describe('403（非公開アカウント）', () => {
    it('status=403 のとき非公開アカウントの案内が表示される', () => {
      mockUseUserFollowersQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new ApiError({ code: 'NOT_FOUND', status: 403, message: 'forbidden' }),
      });
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText('このアカウントは非公開です')).toBeTruthy();
      expect(
        screen.getByText('フォローリクエストが承認されると、フォロワー一覧を確認できるようになります。')
      ).toBeTruthy();
    });
  });

  describe('404 エラー', () => {
    it('status=404 のとき「ユーザーが見つかりません」が表示される', () => {
      mockUseUserFollowersQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' }),
      });
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText('ユーザーが見つかりません')).toBeTruthy();
    });
  });

  describe('一般エラー', () => {
    it('その他のエラーのとき「読み込めませんでした」が表示される', () => {
      mockUseUserFollowersQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new Error('network error'),
      });
      renderWithProviders(<UserFollowersScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });
});
