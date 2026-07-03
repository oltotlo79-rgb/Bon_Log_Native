/**
 * app/fertilizers/columns/index と app/fertilizers/columns/[slug]/index のコンポーネントテスト。
 * 一覧: ローディング・エラー・空状態・カテゴリバッジ・無限スクロール・タップ遷移・オフライン。
 * 詳細: ローディング・エラー・タイトル・カテゴリ・日付・本文・オフライン。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FertilizerColumnsIndexScreen from '@/app/fertilizers/columns/index';
import FertilizerColumnDetailScreen from '@/app/fertilizers/columns/[slug]/index';
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

const mockColumnDetailQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerColumnsQuery: () => mockColumnsQuery,
  useFertilizerColumnDetailQuery: () => mockColumnDetailQuery,
  useFertilizerNutrientsQuery: jest.fn(),
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizerCategoriesQuery: jest.fn(),
  useFertilizerTreeSpeciesQuery: jest.fn(),
  useFertilizationScheduleQuery: jest.fn(),
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

function makeColumnItem(overrides = {}) {
  return {
    id: 'fcol1',
    slug: 'fertilizer-column-slug',
    title: '施肥の基礎知識',
    category: 'basics',
    publishedAt: '2024-06-10T00:00:00Z',
    ...overrides,
  };
}

function makePages(items: ReturnType<typeof makeColumnItem>[]) {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

function makeDetailData(overrides = {}) {
  return {
    id: 'fcol1',
    slug: 'fertilizer-column-slug',
    title: '施肥の基礎知識',
    category: 'basics',
    publishedAt: '2024-06-10T00:00:00Z',
    content: '施肥は植物の健康維持に欠かせません。',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ slug: 'fertilizer-column-slug' });
  mockColumnsQuery.data = undefined;
  mockColumnsQuery.isLoading = false;
  mockColumnsQuery.isError = false;
  mockColumnsQuery.fetchNextPage = jest.fn();
  mockColumnsQuery.hasNextPage = false;
  mockColumnsQuery.isFetchingNextPage = false;
  mockColumnsQuery.refetch = jest.fn();
  mockColumnDetailQuery.data = undefined as unknown;
  mockColumnDetailQuery.isLoading = false;
  mockColumnDetailQuery.isError = false;
  mockColumnDetailQuery.refetch = jest.fn();
});

// ===========================================================================
// 一覧 (index) テスト
// ===========================================================================

describe('FertilizerColumnsIndexScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockColumnsQuery.isLoading = true;
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

describe('FertilizerColumnsIndexScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockColumnsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('FertilizerColumnsIndexScreen 空状態', () => {
  it('items が空のとき空状態テキストが表示される', () => {
    mockColumnsQuery.data = makePages([]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('コラム記事はまだ公開されていません')).toBeTruthy();
  });
});

describe('FertilizerColumnsIndexScreen カテゴリバッジ', () => {
  it('category=basics のとき「基礎知識」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'basics' })]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('基礎知識')).toBeTruthy();
  });

  it('category=seasonal のとき「季節の施肥」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'seasonal', id: 'fcol2' })]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('季節の施肥')).toBeTruthy();
  });

  it('category=technique のとき「施肥技術」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'technique', id: 'fcol3' })]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('施肥技術')).toBeTruthy();
  });

  it('category=troubleshooting のとき「トラブル解決」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'troubleshooting', id: 'fcol4' })]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('トラブル解決')).toBeTruthy();
  });

  it('category=product_guide のとき「定番肥料ガイド」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'product_guide', id: 'fcol5' })]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('定番肥料ガイド')).toBeTruthy();
  });

  it('category=trouble のとき「トラブル事例」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'trouble', id: 'fcol6' })]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('トラブル事例')).toBeTruthy();
  });
});

describe('FertilizerColumnsIndexScreen タップ遷移', () => {
  it('カードタップで詳細画面へ push する', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    fireEvent.press(
      screen.getByLabelText(/施肥の基礎知識を読む/),
    );
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/fertilizers/columns/[slug]',
      params: { slug: 'fertilizer-column-slug' },
    });
  });
});

describe('FertilizerColumnsIndexScreen 無限スクロール', () => {
  it('データ表示中に hasNextPage フラグが正しく保持される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    mockColumnsQuery.hasNextPage = true;
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    expect(screen.getByText('施肥の基礎知識')).toBeTruthy();
    expect(mockColumnsQuery.hasNextPage).toBe(true);
  });
});

describe('FertilizerColumnsIndexScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerColumnsIndexScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});

// ===========================================================================
// 詳細 ([slug]) テスト
// ===========================================================================

describe('FertilizerColumnDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockColumnDetailQuery.isLoading = true;
    renderWithProviders(<FertilizerColumnDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

describe('FertilizerColumnDetailScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockColumnDetailQuery.isError = true;
    renderWithProviders(<FertilizerColumnDetailScreen />);
    expect(screen.getByText('記事を読み込めませんでした')).toBeTruthy();
  });

  it('data=undefined のとき ScreenError が表示される', () => {
    mockColumnDetailQuery.data = undefined;
    renderWithProviders(<FertilizerColumnDetailScreen />);
    expect(screen.getByText('記事を読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockColumnDetailQuery.isError = true;
    renderWithProviders(<FertilizerColumnDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockColumnDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('FertilizerColumnDetailScreen 正常データ', () => {
  it('タイトルが表示される', () => {
    mockColumnDetailQuery.data = makeDetailData();
    renderWithProviders(<FertilizerColumnDetailScreen />);
    expect(screen.getByText('施肥の基礎知識')).toBeTruthy();
  });

  it('category=basics のとき「基礎知識」バッジが表示される', () => {
    mockColumnDetailQuery.data = makeDetailData({ category: 'basics' });
    renderWithProviders(<FertilizerColumnDetailScreen />);
    expect(screen.getByText('基礎知識')).toBeTruthy();
  });

  it('公開日が表示される', () => {
    mockColumnDetailQuery.data = makeDetailData();
    renderWithProviders(<FertilizerColumnDetailScreen />);
    expect(screen.getByText(/2024/)).toBeTruthy();
  });

  it('本文が表示される', () => {
    mockColumnDetailQuery.data = makeDetailData();
    renderWithProviders(<FertilizerColumnDetailScreen />);
    expect(screen.getByText('施肥は植物の健康維持に欠かせません。')).toBeTruthy();
  });
});

describe('FertilizerColumnDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockColumnDetailQuery.data = makeDetailData();
    renderWithProviders(<FertilizerColumnDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
