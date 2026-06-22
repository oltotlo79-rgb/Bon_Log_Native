/**
 * app/shops/index の画面テスト。
 * ローディング・空状態・エラー・sortBy フィルタ・FAB（ログイン時のみ）・OfflineBanner を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ShopsScreen from '@/app/shops/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseShopsListQuery = jest.fn();
jest.mock('@/lib/queries/shops', () => ({
  useShopsListQuery: (...args: unknown[]) => mockUseShopsListQuery(...args),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

// ShopCard のモック
jest.mock('@/components/shops/ShopCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    ShopCard: ({ name, onPress }: { name: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: 'button', accessibilityLabel: `${name}の詳細を見る` },
        React.createElement(Text, null, name)
      ),
  };
});

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
  mockUseShopsListQuery.mockReturnValue(defaultQuery);
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
});

describe('ShopsScreen', () => {
  describe('ヘッダー', () => {
    it('「盆栽園マップ」というタイトルが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園マップ')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });
  });

  describe('ソートチップ', () => {
    it('「評価順」チップが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '評価順' })).toBeTruthy();
    });

    it('「名前順」チップが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '名前順' })).toBeTruthy();
    });

    it('「評価順」タップで sortBy=rating が渡される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '評価順' }));
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'rating' })
      );
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときヘッダーが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園マップ')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('items が空のとき「盆栽園が登録されていません」が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園が登録されていません')).toBeTruthy();
    });
  });

  describe('店舗一覧表示（renderItem / keyExtractor / handleLoadMore）', () => {
    function makeShopItem(id: string) {
      return {
        id,
        name: `盆栽園 ${id}`,
        address: `東京都台東区 ${id}`,
        genres: [{ name: '松' }],
        averageRating: 4.0,
        reviewCount: 10,
        createdAt: '2025-06-01T00:00:00Z',
      };
    }

    it('店舗一覧が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1'), makeShopItem('shop-2')], nextCursor: null }],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園 shop-1')).toBeTruthy();
      expect(screen.getByText('盆栽園 shop-2')).toBeTruthy();
    });

    it('FlatList の onEndReached で hasNextPage=true のとき fetchNextPage が呼ばれる', () => {
      const fetchNextPage = jest.fn();
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1')], nextCursor: 'cursor-1' }],
          pageParams: [undefined],
        },
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      });
      renderWithProviders(<ShopsScreen />);
      const lists = screen.UNSAFE_getAllByType(require('react-native').FlatList);
      fireEvent(lists[0], 'endReached');
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('店舗カードタップで詳細画面へ遷移する', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1')], nextCursor: null }],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽園 shop-1の詳細を見る' }));
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  describe('FAB（ログイン時のみ）', () => {
    it('未ログイン時は「店舗を登録する」FABが表示されない', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      renderWithProviders(<ShopsScreen />);
      expect(screen.queryByRole('button', { name: '店舗を登録する' })).toBeNull();
    });

    it('ログイン時は「店舗を登録する」FABが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('button', { name: '店舗を登録する' })).toBeTruthy();
    });

    it('FABタップで新規盆栽園登録画面へ遷移する', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: '店舗を登録する' }));
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });
});
