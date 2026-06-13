/**
 * app/(tabs)/feed の画面テスト。
 * ヘッダー・空状態・OfflineBanner・FAB（新規投稿）の表示と動作を確認する。
 * useFeedQuery / useCurrentUserQuery（TanStack Query）を使うため QueryClientProvider が必要。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import FeedScreen from '@/app/(tabs)/feed/index';
import { ROUTE_POST_NEW, ROUTE_SEARCH } from '@/lib/constants/routes';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

// useOnlineStatus はモジュールレベルでモック（onlineManager への依存を切り離す）
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

// useFeedQuery は空状態（isLoading=false, data=undefined）を返すモック
jest.mock('@/lib/queries/feed', () => ({
  useFeedQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
}));

// useCurrentUserQuery は未ログイン状態を返すモック
jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
  useRegisterMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「ホーム」と表示される', () => {
    renderWithProviders(<FeedScreen />);
    expect(screen.getByRole('header', { name: 'ホーム' })).toBeTruthy();
  });

  it('空状態タイトル「タイムラインに投稿がありません」が表示される', () => {
    renderWithProviders(<FeedScreen />);
    expect(screen.getByText('タイムラインに投稿がありません')).toBeTruthy();
  });

  it('空状態の説明文が表示される', () => {
    renderWithProviders(<FeedScreen />);
    expect(
      screen.getByText('ユーザーをフォローすると、その人の投稿がここに表示されます')
    ).toBeTruthy();
  });

  it('空状態のアクションボタン「ユーザーを検索」が表示される', () => {
    renderWithProviders(<FeedScreen />);
    expect(screen.getByRole('button', { name: 'ユーザーを検索' })).toBeTruthy();
  });

  it('「ユーザーを検索」ボタンタップで検索画面へ遷移する', () => {
    renderWithProviders(<FeedScreen />);
    const searchButton = screen.getByRole('button', { name: 'ユーザーを検索' });
    fireEvent.press(searchButton);
    expect(mockRouter.push).toHaveBeenCalledWith(ROUTE_SEARCH);
  });

  it('新規投稿 FAB が表示される', () => {
    renderWithProviders(<FeedScreen />);
    expect(screen.getByRole('button', { name: '新規投稿' })).toBeTruthy();
  });

  it('FAB タップで posts/new へ遷移する', () => {
    renderWithProviders(<FeedScreen />);
    const fab = screen.getByRole('button', { name: '新規投稿' });
    fireEvent.press(fab);
    expect(mockRouter.push).toHaveBeenCalledWith(ROUTE_POST_NEW);
  });

  describe('OfflineBanner', () => {
    it('オンライン時はバナーに accessibilityLabel が設定されない', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status');
      (useOnlineStatus as jest.Mock).mockReturnValue(true);
      renderWithProviders(<FeedScreen />);
      // isVisible=false 時は accessibilityLabel が undefined になる
      const offlineText = screen.queryByText('オフライン中です。接続が回復したら自動的に更新されます。');
      expect(offlineText).toBeTruthy();
    });

    it('オフライン時はバナーに accessibilityLabel が設定される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status');
      (useOnlineStatus as jest.Mock).mockReturnValue(false);
      renderWithProviders(<FeedScreen />);
      // ERR_OFFLINE の文言が accessibilityLabel に設定される
      expect(
        screen.getByLabelText('オフライン中です。接続が回復したら自動的に更新されます。')
      ).toBeTruthy();
    });
  });
});
