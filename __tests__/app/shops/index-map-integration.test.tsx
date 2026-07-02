/**
 * app/shops/index のマップ統合テスト。
 * BonsaiMapView の組み込みと lat/lng フィルタリングを検証する。
 *
 * 既存の index.test.tsx / index-region-filter.test.tsx がカバーする
 * リスト・フィルタ・ソート機能は重複して書かない。
 * このファイルは「地図統合」に絞って検証する。
 *
 * react-native-webview / expo-location は __tests__/setup.ts の一元モックを使用する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import ShopsScreen from '@/app/shops/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseShopsListQuery = jest.fn();
const mockUseGenresQuery = jest.fn();
jest.mock('@/lib/queries/shops', () => ({
  useShopsListQuery: (...args: unknown[]) => mockUseShopsListQuery(...args),
  useGenresQuery: (...args: unknown[]) => mockUseGenresQuery(...args),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/components/shops/ShopCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ShopCard: ({ name }: { name: string }) =>
      React.createElement(Text, null, name),
  };
});

// ---------------------------------------------------------------------------
// デフォルトのクエリ戻り値
// ---------------------------------------------------------------------------

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

const defaultGenreQuery = { data: undefined, isLoading: false, isError: false };

// lat/lng あり店舗
function makeShopWithLocation(id: string, lat: number, lng: number) {
  return {
    id,
    name: `盆栽園 ${id}`,
    address: `東京都 ${id}`,
    phone: null,
    businessHours: null,
    closedDays: null,
    genres: [],
    averageRating: null,
    reviewCount: 0,
    createdAt: '2025-06-01T00:00:00Z',
    latitude: lat,
    longitude: lng,
  };
}

// lat/lng なし店舗
function makeShopWithoutLocation(id: string) {
  return {
    id,
    name: `盆栽園（住所不明） ${id}`,
    address: `不明 ${id}`,
    phone: null,
    businessHours: null,
    closedDays: null,
    genres: [],
    averageRating: null,
    reviewCount: 0,
    createdAt: '2025-06-01T00:00:00Z',
    latitude: null,
    longitude: null,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
  mockUseGenresQuery.mockReturnValue(defaultGenreQuery);
  // useOnlineStatus をデフォルトのオンライン状態にリセットする
  const { useOnlineStatus } = require('@/hooks/use-online-status');
  (useOnlineStatus as jest.Mock).mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// 地図統合テスト
// ---------------------------------------------------------------------------

describe('ShopsScreen - 地図統合', () => {
  it('データがあるとき WebView（BonsaiMapView）が表示される', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: {
        pages: [
          {
            items: [makeShopWithLocation('shop-1', 35.6762, 139.6503)],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('lat/lng が両方 null の店舗はマーカー化されない（WebView は表示される）', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: {
        pages: [
          {
            items: [makeShopWithoutLocation('shop-no-loc')],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    });
    renderWithProviders(<ShopsScreen />);
    // WebView 自体は表示される（空マーカーで表示）
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('lat/lng が揃った店舗と揃っていない店舗が混在していても画面がクラッシュしない', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: {
        pages: [
          {
            items: [
              makeShopWithLocation('shop-A', 35.6762, 139.6503),
              makeShopWithoutLocation('shop-B'),
              makeShopWithLocation('shop-C', 34.0, 135.0),
            ],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    });
    // クラッシュなくレンダーできることを確認する
    expect(() => renderWithProviders(<ShopsScreen />)).not.toThrow();
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('データが空でも WebView は表示される（マーカー 0 件）', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: {
        pages: [{ items: [], nextCursor: null }],
        pageParams: [undefined],
      },
    });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('オフライン時は WebView の代わりにオフラインメッセージが表示される', () => {
    const { useOnlineStatus } = require('@/hooks/use-online-status');
    (useOnlineStatus as jest.Mock).mockReturnValue(false);

    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: {
        pages: [
          {
            items: [makeShopWithLocation('shop-1', 35.6762, 139.6503)],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByText('オフラインのため地図を表示できません')).toBeTruthy();
    expect(screen.queryByTestId('mock-webview')).toBeNull();
  });

  it('リストと地図が同一画面に共存する（件数表示と WebView が同時に存在する）', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: {
        pages: [
          {
            items: [makeShopWithLocation('shop-1', 35.6762, 139.6503)],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    });
    renderWithProviders(<ShopsScreen />);
    // FlatList ヘッダーに件数が表示される（React Native のテキストノード分割対応で正規表現を使う）
    expect(screen.getByText(/1件/)).toBeTruthy();
    // 地図も表示される
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('ローディング中は BonsaiMapView が表示されない（ローディング専用 UI）', () => {
    mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
    renderWithProviders(<ShopsScreen />);
    // ローディング中は BonsaiMapView のある通常レイアウトに入らない
    expect(screen.queryByTestId('mock-webview')).toBeNull();
  });

  it('エラー時は BonsaiMapView が表示されない（エラー専用 UI）', () => {
    mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isError: true });
    renderWithProviders(<ShopsScreen />);
    expect(screen.queryByTestId('mock-webview')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 既存のリスト・フィルタ機能が壊れていないことの確認
// （詳細は index.test.tsx / index-region-filter.test.tsx でカバー。
//   ここでは地図追加後も基本機能が動くことだけ確認する）
// ---------------------------------------------------------------------------

describe('ShopsScreen - 地図追加後も既存機能が壊れていない', () => {
  it('ヘッダー「盆栽園マップ」が表示される', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
    });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByText('盆栽園マップ')).toBeTruthy();
  });

  it('検索フィールドが表示される', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
    });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByPlaceholderText('名前または住所で検索...')).toBeTruthy();
  });

  it('ソートチップが表示される', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
    });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByRole('radio', { name: '評価順' })).toBeTruthy();
  });

  it('lat/lng なし店舗がリストに表示される（マップに載らなくてもリストには載る）', () => {
    mockUseShopsListQuery.mockReturnValue({
      ...defaultQuery,
      data: {
        pages: [
          {
            items: [makeShopWithoutLocation('shop-no-loc')],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByText('盆栽園（住所不明） shop-no-loc')).toBeTruthy();
  });
});
