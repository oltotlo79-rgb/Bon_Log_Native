/**
 * app/shops/[id]/reviews/index の盆栽園レビュー一覧画面テスト。
 * ローディング・エラー・空状態・正常表示・FAB 表示を検証する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import ShopReviewsScreen from '@/app/shops/[id]/reviews/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseShopDetailQuery = jest.fn();
const mockUseShopReviewsQuery = jest.fn();
const mockUseCurrentUserQuery = jest.fn();

jest.mock('@/lib/queries/shops', () => ({
  useShopDetailQuery: (...args: unknown[]) => mockUseShopDetailQuery(...args),
  useShopReviewsQuery: (...args: unknown[]) => mockUseShopReviewsQuery(...args),
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

function makeReview(overrides = {}) {
  return {
    id: 'review-1',
    rating: 4,
    content: '良い店舗でした',
    images: [],
    user: { id: 'user-1', nickname: '盆栽太郎', avatarUrl: null },
    createdAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeReviewsPage(items = [makeReview()]) {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ id: 'shop-1' });
  mockUseShopDetailQuery.mockReturnValue({ data: undefined });
  mockUseShopReviewsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isRefetching: false,
  });
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
});

describe('ShopReviewsScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のとき「レビュー」ヘッダーが表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('レビュー')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('レビューが 0 件のとき「まだレビューはありません」が表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('まだレビューはありません')).toBeTruthy();
    });
  });

  describe('正常表示', () => {
    it('レビュー一覧が表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview({ content: '良い店舗でした' })]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('良い店舗でした')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('レビュアーのニックネームが表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview({ user: { id: 'u1', nickname: '松太郎', avatarUrl: null } })]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('松太郎')).toBeTruthy();
    });

    it('平均評価が表示される（shop データあり）', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: {
          id: 'shop-1',
          name: '松苑',
          averageRating: 4.2,
          reviewCount: 5,
        },
      });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview()]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('5件のレビュー')).toBeTruthy();
    });
  });

  describe('FAB（レビューを書く）', () => {
    it('ログイン済みのときFABが表示される', () => {
      mockUseCurrentUserQuery.mockReturnValue({
        data: { id: 'user-1', nickname: 'テスト', isPremium: false },
      });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview()]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByRole('button', { name: 'レビューを書く' })).toBeTruthy();
    });

    it('未ログインのときFABが表示されない', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview()]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.queryByRole('button', { name: 'レビューを書く' })).toBeNull();
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が空のとき（配列）画面がクラッシュしない', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['shop-1', 'shop-2'] });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('まだレビューはありません')).toBeTruthy();
    });
  });
});
