/**
 * @module __tests__/app/users/user-following
 * app/users/[id]/following/index の画面テスト。
 * ローディング・一覧表示・バッジ（フォローされています）・空状態・403（非公開）・タップ遷移を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import UserFollowingScreen from '@/app/users/[id]/following/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ApiError } from '@/lib/api/errors';
import { ERR_USER_NOT_FOUND } from '@/lib/constants/errors';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseUserFollowingQuery = jest.fn();
jest.mock('@/lib/queries/follows', () => ({
  useUserFollowingQuery: (...args: unknown[]) => mockUseUserFollowingQuery(...args),
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
    following: true,
    requested: false,
    isFollowedBy: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'user-1' });
  mockUseUserFollowingQuery.mockReturnValue(defaultQuery);
  mockUseUserProfileQuery.mockReturnValue({ data: undefined });
  mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'me-1' } });
});

describe('UserFollowingScreen', () => {
  describe('id パラメータ不正', () => {
    it('id が undefined のとき ERR_USER_NOT_FOUND が表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });
  });

  describe('タイトル', () => {
    it('プロフィール取得前は汎用タイトル「フォロー中」が表示される', () => {
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText('フォロー中')).toBeTruthy();
    });

    it('プロフィール取得後は「{nickname}のフォロー中」が表示される', () => {
      mockUseUserProfileQuery.mockReturnValue({ data: { nickname: '盆栽太郎' } });
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText('盆栽太郎のフォロー中')).toBeTruthy();
    });
  });

  describe('一覧表示', () => {
    it('フォロー中一覧が表示される', () => {
      mockUseUserFollowingQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [makeConnectionItem({ id: 'u-1', nickname: '黒松太郎' })], nextCursor: null }] },
      });
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText('黒松太郎')).toBeTruthy();
    });

    it('isFollowedBy=true のとき「フォローされています」バッジが表示される', () => {
      mockUseUserFollowingQuery.mockReturnValue({
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
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText('フォローされています')).toBeTruthy();
    });

    it('行をタップするとプロフィールへ遷移する', () => {
      mockUseUserFollowingQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: {
          pages: [{ items: [makeConnectionItem({ id: 'user-xyz', nickname: '黒松太郎' })], nextCursor: null }],
        },
      });
      renderWithProviders(<UserFollowingScreen />);
      fireEvent.press(screen.getByText('黒松太郎'));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/user-xyz');
    });
  });

  describe('空状態', () => {
    it('items が空のとき「フォロー中のユーザーはいません」が表示される', () => {
      mockUseUserFollowingQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        data: { pages: [{ items: [], nextCursor: null }] },
      });
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText('フォロー中のユーザーはいません')).toBeTruthy();
    });
  });

  describe('403（非公開アカウント）', () => {
    it('status=403 のとき非公開アカウントの案内が表示される', () => {
      mockUseUserFollowingQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new ApiError({ code: 'NOT_FOUND', status: 403, message: 'forbidden' }),
      });
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText('このアカウントは非公開です')).toBeTruthy();
      expect(
        screen.getByText('フォローリクエストが承認されると、フォロー中一覧を確認できるようになります。')
      ).toBeTruthy();
    });
  });

  describe('404 エラー', () => {
    it('status=404 のとき「ユーザーが見つかりません」が表示される', () => {
      mockUseUserFollowingQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' }),
      });
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText('ユーザーが見つかりません')).toBeTruthy();
    });
  });

  describe('一般エラー', () => {
    it('その他のエラーのとき「読み込めませんでした」が表示される', () => {
      mockUseUserFollowingQuery.mockReturnValue({
        ...defaultQuery,
        isLoading: false,
        isError: true,
        error: new Error('network error'),
      });
      renderWithProviders(<UserFollowingScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });
});
