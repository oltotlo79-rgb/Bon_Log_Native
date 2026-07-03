/**
 * app/fertilizers/products/index のコンポーネントテスト。
 * useFertilizerColumnsQuery を 'product_guide' カテゴリで呼ぶことを検証する。
 * ローディング・エラー・空状態・正常データ・タップ遷移・オフラインを網羅する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FertilizerProductsScreen from '@/app/fertilizers/products/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockColumnsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
};

// 引数を記録して検証できるよう capturedCategory を使う
let capturedCategory: string | undefined;
jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerColumnsQuery: (category: string) => {
    capturedCategory = category;
    return mockColumnsQuery;
  },
  useFertilizerColumnDetailQuery: jest.fn(),
  useFertilizerNutrientsQuery: jest.fn(),
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizerCategoriesQuery: jest.fn(),
  useFertilizerTreeSpeciesQuery: jest.fn(),
  useFertilizationScheduleQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeColumnItem(overrides = {}) {
  return {
    id: 'prod1',
    slug: 'product-guide-slug',
    title: '玉肥の使い方',
    category: 'product_guide',
    publishedAt: '2024-07-15T00:00:00Z',
    ...overrides,
  };
}

function makePages(items: ReturnType<typeof makeColumnItem>[]) {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedCategory = undefined;
  mockUseOnlineStatus.mockReturnValue(true);
  mockColumnsQuery.data = undefined;
  mockColumnsQuery.isLoading = false;
  mockColumnsQuery.isError = false;
  mockColumnsQuery.fetchNextPage = jest.fn();
  mockColumnsQuery.hasNextPage = false;
  mockColumnsQuery.isFetchingNextPage = false;
  mockColumnsQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// category 引数の検証
// ---------------------------------------------------------------------------

describe('FertilizerProductsScreen カテゴリ引数', () => {
  it('useFertilizerColumnsQuery を product_guide カテゴリで呼ぶ', () => {
    mockColumnsQuery.isLoading = true;
    renderWithProviders(<FertilizerProductsScreen />);
    expect(capturedCategory).toBe('product_guide');
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('FertilizerProductsScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockColumnsQuery.isLoading = true;
    renderWithProviders(<FertilizerProductsScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('FertilizerProductsScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<FertilizerProductsScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<FertilizerProductsScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockColumnsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('FertilizerProductsScreen 空状態', () => {
  it('items が空のとき空状態テキストが表示される', () => {
    mockColumnsQuery.data = makePages([]);
    renderWithProviders(<FertilizerProductsScreen />);
    expect(screen.getByText('定番肥料ガイドはまだ公開されていません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常データ
// ---------------------------------------------------------------------------

describe('FertilizerProductsScreen 正常データ', () => {
  it('コラムタイトルが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerProductsScreen />);
    expect(screen.getByText('玉肥の使い方')).toBeTruthy();
  });

  it('「定番肥料ガイド」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerProductsScreen />);
    expect(screen.getByText('定番肥料ガイド')).toBeTruthy();
  });

  it('公開日が表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerProductsScreen />);
    expect(screen.getByText(/2024/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ遷移
// ---------------------------------------------------------------------------

describe('FertilizerProductsScreen タップ遷移', () => {
  it('カードタップでコラム詳細へ push する', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerProductsScreen />);
    fireEvent.press(screen.getByLabelText(/玉肥の使い方を読む（定番肥料ガイド/));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/fertilizers/columns/[slug]',
      params: { slug: 'product-guide-slug' },
    });
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('FertilizerProductsScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerProductsScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
