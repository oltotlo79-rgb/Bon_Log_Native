/**
 * app/fertilizers/nutrients/[slug]/index のコンポーネントテスト。
 * slug ガード・ヘッダー・各セクション・エラー・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import NutrientDetailScreen from '@/app/fertilizers/nutrients/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockDetailQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerNutrientsQuery: jest.fn(),
  useFertilizerCategoriesQuery: jest.fn(),
  useFertilizerTreeSpeciesQuery: jest.fn(),
  useFertilizerNutrientDetailQuery: () => mockDetailQuery,
  useFertilizationScheduleQuery: jest.fn(),
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeNutrientDetail(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'n1',
    slug: 'nitrogen',
    name: '窒素',
    symbol: 'N',
    category: 'primary',
    description: '葉の緑化と成長を促す主要栄養素。',
    bonsaiRole: '盆栽の葉の発達に必須。',
    deficiencySymptoms: '葉が黄化し成長が停滞する。',
    excessSymptoms: '徒長が発生し木が軟弱になる。',
    foodSources: '油粕\n魚粉\n化成肥料',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockDetailQuery.data = undefined;
  mockDetailQuery.isLoading = false;
  mockDetailQuery.isError = false;
  mockDetailQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'nitrogen' });
});

// ---------------------------------------------------------------------------
// slug ガード
// ---------------------------------------------------------------------------

describe('NutrientDetailScreen slug ガード', () => {
  it('空文字 slug のとき「施肥情報を読み込めませんでした。」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: '' });
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByText('施肥情報を読み込めませんでした。')).toBeTruthy();
  });

  it('配列 slug のとき先頭要素を使用し、isError でなければエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: ['nitrogen', 'other'] });
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.queryByText('施肥情報を読み込めませんでした。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('NutrientDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockDetailQuery.isLoading = true;
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('NutrientDetailScreen エラー', () => {
  it('isError=true のとき「施肥情報を読み込めませんでした。」が表示される', () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByText('施肥情報を読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<NutrientDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('NutrientDetailScreen 正常表示', () => {
  it('栄養素名が表示される', () => {
    mockDetailQuery.data = makeNutrientDetail();
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByText('窒素')).toBeTruthy();
  });

  it('化学記号が表示される', () => {
    mockDetailQuery.data = makeNutrientDetail();
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByText('N')).toBeTruthy();
  });

  it('説明が表示される', () => {
    mockDetailQuery.data = makeNutrientDetail();
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByText('葉の緑化と成長を促す主要栄養素。')).toBeTruthy();
  });

  it('欠乏症状セクションが表示される', () => {
    mockDetailQuery.data = makeNutrientDetail();
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByText('欠乏症状')).toBeTruthy();
    expect(screen.getByText('葉が黄化し成長が停滞する。')).toBeTruthy();
  });

  it('過剰症状セクションが表示される', () => {
    mockDetailQuery.data = makeNutrientDetail();
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByText('過剰症状')).toBeTruthy();
    expect(screen.getByText('徒長が発生し木が軟弱になる。')).toBeTruthy();
  });

  it('多く含む肥料・資材が複数行で表示される', () => {
    mockDetailQuery.data = makeNutrientDetail();
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.getByText('多く含む肥料・資材')).toBeTruthy();
    expect(screen.getByText('・油粕')).toBeTruthy();
    expect(screen.getByText('・魚粉')).toBeTruthy();
    expect(screen.getByText('・化成肥料')).toBeTruthy();
  });

  it('欠乏症状が null のときセクションが表示されない', () => {
    mockDetailQuery.data = makeNutrientDetail({ deficiencySymptoms: null });
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.queryByText('欠乏症状')).toBeNull();
  });

  it('過剰症状が null のときセクションが表示されない', () => {
    mockDetailQuery.data = makeNutrientDetail({ excessSymptoms: null });
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.queryByText('過剰症状')).toBeNull();
  });

  it('foodSources が null のとき「多く含む肥料・資材」セクションが表示されない', () => {
    mockDetailQuery.data = makeNutrientDetail({ foodSources: null });
    renderWithProviders(<NutrientDetailScreen />);
    expect(screen.queryByText('多く含む肥料・資材')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('NutrientDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<NutrientDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
