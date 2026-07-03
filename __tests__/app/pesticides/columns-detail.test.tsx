/**
 * app/pesticides/columns/[slug]/index のコンポーネントテスト。
 * ローディング・エラー・タイトル・カテゴリ・日付・本文・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import ColumnDetailScreen from '@/app/pesticides/columns/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockColumnDetailQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/lib/queries/pesticides', () => ({
  usePesticideColumnDetailQuery: () => mockColumnDetailQuery,
  usePesticideColumnsQuery: jest.fn(),
  useSpreaderTypesQuery: jest.fn(),
  useSpreaderTypeDetailQuery: jest.fn(),
  useSpreaderProductsQuery: jest.fn(),
  useFormulationTypesQuery: jest.fn(),
  useMixingDataQuery: jest.fn(),
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientsQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

function makeColumnData(overrides = {}) {
  return {
    id: 'col1',
    slug: 'column-slug',
    title: '農薬混用の基礎',
    category: 'mixing_order',
    publishedAt: '2024-03-10T00:00:00Z',
    content: 'この記事では農薬の混用について解説します。',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ slug: 'column-slug' });
  mockColumnDetailQuery.data = undefined as unknown;
  mockColumnDetailQuery.isLoading = false;
  mockColumnDetailQuery.isError = false;
  mockColumnDetailQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('ColumnDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockColumnDetailQuery.isLoading = true;
    renderWithProviders(<ColumnDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('ColumnDetailScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockColumnDetailQuery.isError = true;
    renderWithProviders(<ColumnDetailScreen />);
    expect(screen.getByText('記事を読み込めませんでした')).toBeTruthy();
  });

  it('data=undefined のとき ScreenError が表示される', () => {
    mockColumnDetailQuery.data = undefined;
    renderWithProviders(<ColumnDetailScreen />);
    expect(screen.getByText('記事を読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockColumnDetailQuery.isError = true;
    renderWithProviders(<ColumnDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockColumnDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 正常データ
// ---------------------------------------------------------------------------

describe('ColumnDetailScreen 正常データ', () => {
  it('タイトルが表示される', () => {
    mockColumnDetailQuery.data = makeColumnData();
    renderWithProviders(<ColumnDetailScreen />);
    expect(screen.getByText('農薬混用の基礎')).toBeTruthy();
  });

  it('category=mixing_order のとき「混用技術」バッジが表示される', () => {
    mockColumnDetailQuery.data = makeColumnData({ category: 'mixing_order' });
    renderWithProviders(<ColumnDetailScreen />);
    expect(screen.getByText('混用技術')).toBeTruthy();
  });

  it('category=general のとき「一般知識」バッジが表示される', () => {
    mockColumnDetailQuery.data = makeColumnData({ category: 'general', id: 'col2' });
    renderWithProviders(<ColumnDetailScreen />);
    expect(screen.getByText('一般知識')).toBeTruthy();
  });

  it('公開日が表示される', () => {
    mockColumnDetailQuery.data = makeColumnData();
    renderWithProviders(<ColumnDetailScreen />);
    // toLocaleDateString('ja-JP') の形式は環境依存のため部分一致
    expect(screen.getByText(/2024/)).toBeTruthy();
  });

  it('本文が表示される', () => {
    mockColumnDetailQuery.data = makeColumnData();
    renderWithProviders(<ColumnDetailScreen />);
    expect(screen.getByText('この記事では農薬の混用について解説します。')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('ColumnDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockColumnDetailQuery.data = makeColumnData();
    renderWithProviders(<ColumnDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
