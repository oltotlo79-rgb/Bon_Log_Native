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
    { id: 'n1', slug: 'nitrogen', name: '窒素', symbol: 'N', description: '葉の成長を促す', category: 'primary', bonsaiRole: '葉と枝の生長を促進する' },
    { id: 'n2', slug: 'phosphorus', name: 'リン', symbol: 'P', description: '開花を促す', category: 'primary', bonsaiRole: '花芽と根の発達を助ける' },
  ];
}

function makeCategories() {
  return [
    { id: 'c1', code: 'organic', name: '有機肥料', description: '天然素材由来の肥料', merit: '土壌を豊かにする', demerit: '即効性がない', bonsaiUsage: '春先の置き肥に最適' },
    { id: 'c2', code: 'chemical', name: '化成肥料', description: '化学的に合成された肥料', merit: null, demerit: null, bonsaiUsage: null },
  ];
}

function makeTreeSpecies() {
  return [
    { id: 'ts1', slug: 'kuromatsu', name: '黒松', category: 'conifer', description: null, fertilizingPolicy: '春と秋に施肥する' },
    { id: 'ts2', slug: 'keyaki', name: '欅', category: 'deciduous', description: null, fertilizingPolicy: null },
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
    expect(screen.getByText('有機肥料')).toBeTruthy();
    expect(screen.getByText('化成肥料')).toBeTruthy();
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

  it('樹種タップでスケジュール画面へ push する（name パラメータを含む）', () => {
    mockTreeSpeciesQuery.data = makeTreeSpecies();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('樹種'));
    fireEvent.press(screen.getByLabelText('黒松の施肥スケジュールを見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/fertilizers/tree-species/[slug]',
      params: { slug: 'kuromatsu', name: '黒松' },
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

// ---------------------------------------------------------------------------
// 季節TIPS — 日付をモックして全季節を決定的にテストする
// フレークを防ぐため Date.prototype.getMonth を各テストで固定する。
// ---------------------------------------------------------------------------

describe('FertilizersScreen 季節TIPS', () => {
  let dateSpy: jest.SpyInstance;

  afterEach(() => {
    dateSpy?.mockRestore();
  });

  function mockMonth(month: number) {
    dateSpy = jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(month - 1);
  }

  it('3月（春）は春のTIPSタイトルが表示される', () => {
    mockMonth(3);
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('春の施肥 — 成長期の始まり')).toBeTruthy();
  });

  it('6月（夏）は夏のTIPSタイトルが表示される', () => {
    mockMonth(6);
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('夏の施肥 — 控えめに管理')).toBeTruthy();
  });

  it('9月（秋）は秋のTIPSタイトルが表示される', () => {
    mockMonth(9);
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('秋の施肥 — 冬越し準備')).toBeTruthy();
  });

  it('12月（冬）は冬のTIPSタイトルが表示される', () => {
    mockMonth(12);
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('冬の施肥 — 休眠期は原則不要')).toBeTruthy();
  });

  it('2月（冬）は冬のTIPSタイトルが表示される', () => {
    mockMonth(2);
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('冬の施肥 — 休眠期は原則不要')).toBeTruthy();
  });

  it('8月（夏）は夏のTIPSタイトルが表示される', () => {
    mockMonth(8);
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('夏の施肥 — 控えめに管理')).toBeTruthy();
  });
});
