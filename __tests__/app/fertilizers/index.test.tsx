/**
 * app/fertilizers/index のコンポーネントテスト。
 * 3タブ構成（栄養素・カテゴリ・樹種）・ローディング・エラー・空状態・タップ遷移を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FertilizersScreen from '@/app/fertilizers/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockNutrientsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const mockCategoriesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const mockTreeSpeciesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerNutrientsQuery: () => mockNutrientsQuery,
  useFertilizerCategoriesQuery: () => mockCategoriesQuery,
  useFertilizerTreeSpeciesQuery: () => mockTreeSpeciesQuery,
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizationScheduleQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー — 実際のクエリフックが返す配列型データ
// ---------------------------------------------------------------------------

function makeNutrients() {
  return [
    { id: 'n1', slug: 'nitrogen', name: '窒素', symbol: 'N', description: '葉の成長を促す', category: 'primary' },
    { id: 'n2', slug: 'phosphorus', name: 'リン', symbol: 'P', description: '開花を促す', category: 'primary' },
  ];
}

function makeCategories() {
  return [
    { id: 'c1', code: 'primary', name: '多量栄養素', description: '主要な栄養素' },
    { id: 'c2', code: 'secondary', name: '中量栄養素', description: '二次的な栄養素' },
  ];
}

function makeTreeSpecies() {
  return [
    { id: 'ts1', slug: 'kuromatsu', name: '黒松', category: '松柏類', description: null, fertilizingPolicy: null },
    { id: 'ts2', slug: 'keyaki', name: '欅', category: '雑木類', description: null, fertilizingPolicy: null },
  ];
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockNutrientsQuery.data = undefined;
  mockNutrientsQuery.isLoading = false;
  mockNutrientsQuery.isError = false;
  mockCategoriesQuery.data = undefined;
  mockCategoriesQuery.isLoading = false;
  mockCategoriesQuery.isError = false;
  mockTreeSpeciesQuery.data = undefined;
  mockTreeSpeciesQuery.isLoading = false;
  mockTreeSpeciesQuery.isError = false;
});

// ---------------------------------------------------------------------------
// タブ表示
// ---------------------------------------------------------------------------

describe('FertilizersScreen タブ', () => {
  it('「栄養素」タブが表示される', () => {
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('栄養素')).toBeTruthy();
  });

  it('「カテゴリ」タブが表示される', () => {
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('カテゴリ')).toBeTruthy();
  });

  it('「樹種」タブが表示される', () => {
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('樹種')).toBeTruthy();
  });

  it('初期タブは「栄養素」がアクティブ', () => {
    renderWithProviders(<FertilizersScreen />);
    expect(
      screen.getByLabelText('栄養素').props.accessibilityState?.selected
    ).toBe(true);
  });

  it('「カテゴリ」タブをタップするとアクティブになる', () => {
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('カテゴリ'));
    expect(
      screen.getByLabelText('カテゴリ').props.accessibilityState?.selected
    ).toBe(true);
  });

  it('「樹種」タブをタップするとアクティブになる', () => {
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('樹種'));
    expect(
      screen.getByLabelText('樹種').props.accessibilityState?.selected
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 栄養素タブ
// ---------------------------------------------------------------------------

describe('FertilizersScreen 栄養素タブ', () => {
  it('栄養素一覧が表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('窒素')).toBeTruthy();
    expect(screen.getByText('リン')).toBeTruthy();
  });

  it('栄養素タップで詳細画面へ push する', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('窒素（N）の詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/fertilizers/nutrients/[slug]',
      params: { slug: 'nitrogen' },
    });
  });

  it('栄養素エラー時に ScreenError が表示される', () => {
    mockNutrientsQuery.isError = true;
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('施肥情報を読み込めませんでした。')).toBeTruthy();
  });

  it('栄養素が空（[]）のとき「データがありません」が表示される', () => {
    mockNutrientsQuery.data = [];
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('データがありません')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockNutrientsQuery.isError = true;
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockNutrientsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// カテゴリタブ
// ---------------------------------------------------------------------------

describe('FertilizersScreen カテゴリタブ', () => {
  it('カテゴリタブに切り替えてカテゴリ一覧が表示される', () => {
    mockCategoriesQuery.data = makeCategories();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('カテゴリ'));
    expect(screen.getByText('多量栄養素')).toBeTruthy();
    expect(screen.getByText('中量栄養素')).toBeTruthy();
  });

  it('カテゴリが空（[]）のとき「データがありません」が表示される', () => {
    mockCategoriesQuery.data = [];
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('カテゴリ'));
    expect(screen.getByText('データがありません')).toBeTruthy();
  });

  it('カテゴリエラー時に ScreenError が表示される', () => {
    mockCategoriesQuery.isError = true;
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('カテゴリ'));
    expect(screen.getByText('施肥情報を読み込めませんでした。')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 樹種タブ
// ---------------------------------------------------------------------------

describe('FertilizersScreen 樹種タブ', () => {
  it('樹種タブに切り替えて樹種一覧が表示される', () => {
    mockTreeSpeciesQuery.data = makeTreeSpecies();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('樹種'));
    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.getByText('欅')).toBeTruthy();
  });

  it('樹種タップでスケジュール画面へ push する', () => {
    mockTreeSpeciesQuery.data = makeTreeSpecies();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('樹種'));
    fireEvent.press(screen.getByLabelText('黒松の施肥スケジュールを見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/fertilizers/tree-species/[slug]',
      params: { slug: 'kuromatsu' },
    });
  });

  it('樹種が空（[]）のとき「データがありません」が表示される', () => {
    mockTreeSpeciesQuery.data = [];
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('樹種'));
    expect(screen.getByText('データがありません')).toBeTruthy();
  });

  it('樹種エラー時に ScreenError が表示される', () => {
    mockTreeSpeciesQuery.isError = true;
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('樹種'));
    expect(screen.getByText('施肥情報を読み込めませんでした。')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('FertilizersScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<FertilizersScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
