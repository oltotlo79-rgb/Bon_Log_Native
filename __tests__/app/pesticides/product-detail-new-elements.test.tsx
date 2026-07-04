/**
 * app/pesticides/products/[slug]/index の新要素テスト。
 * 農水省リンクの表示条件・EffectRatingBadge の表示・混用不可行タップ遷移を検証する。
 */

import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react-native';
import ProductDetailScreen from '@/app/pesticides/products/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockDetailQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/pesticides', () => ({
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideIngredientsQuery: jest.fn(),
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductDetailQuery: () => mockDetailQuery,
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeRating(overrides?: Record<string, unknown>) {
  return {
    preventionLevel: null,
    treatmentLevel: null,
    efficacyLevel: 'good',
    persistenceLevel: 'fair',
    ...overrides,
  };
}

function makeProductDetail(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'p1',
    slug: 'product-a',
    name: 'テスト殺虫剤',
    pesticideType: 'insecticide',
    registrationNumber: '第12345号',
    formulationType: { name: '水和剤', code: 'WP' },
    description: 'テスト説明。',
    activeIngredients: [
      { id: 'i1', slug: 'ingredient-a', name: 'ピリミカルブ', fracCode: null, iracCode: null, resistanceRisk: 'low' },
    ],
    effects: [
      {
        diseasePest: { id: 'dp1', slug: 'aphid', name: 'アブラムシ' },
        rating: makeRating(),
      },
    ],
    incompatibilities: [
      { id: 'ic1', slug: 'product-b', name: '○○殺菌剤', formulationTypeName: '乳剤' },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockDetailQuery.data = undefined;
  mockDetailQuery.isLoading = false;
  mockDetailQuery.isError = false;
  mockDetailQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'product-a' });
});

// ---------------------------------------------------------------------------
// 農水省リンクの表示条件
// ---------------------------------------------------------------------------

describe('ProductDetailScreen 農水省リンク', () => {
  it('registrationNumber がある場合、農水省リンクが表示される', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByLabelText('第12345号 農林水産省の詳細ページを開く')).toBeTruthy();
  });

  it('registrationNumber がある場合、リンクテキストに「農林水産省」が含まれる', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('第12345号（農林水産省）↗')).toBeTruthy();
  });

  it('registrationNumber が null の場合、農水省リンクが表示されない', () => {
    mockDetailQuery.data = makeProductDetail({ registrationNumber: null, effects: [] });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.queryByText(/（農林水産省）↗/)).toBeNull();
    expect(screen.queryByLabelText(/農林水産省の詳細ページを開く/)).toBeNull();
  });

  it('registrationNumber が null の場合、「登録番号は未掲載です」バッジが表示される', () => {
    mockDetailQuery.data = makeProductDetail({ registrationNumber: null, effects: [] });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('登録番号は未掲載です')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// EffectRatingBadge の表示（殺虫剤 insecticide）
// ---------------------------------------------------------------------------

describe('ProductDetailScreen EffectRatingBadge（殺虫剤）', () => {
  it('insecticide タイプでは「効果」バッジが表示される', () => {
    mockDetailQuery.data = makeProductDetail({
      pesticideType: 'insecticide',
      effects: [
        {
          diseasePest: { id: 'dp1', slug: 'aphid', name: 'アブラムシ' },
          rating: makeRating({ efficacyLevel: 'excellent' }),
        },
      ],
    });
    renderWithProviders(<ProductDetailScreen />);
    const row = within(screen.getByLabelText('アブラムシの詳細を見る'));
    expect(row.getByText('効果')).toBeTruthy();
    expect(row.getByText('◎')).toBeTruthy();
  });

  it('insecticide タイプでは「持続」バッジが表示される', () => {
    mockDetailQuery.data = makeProductDetail({
      pesticideType: 'insecticide',
      effects: [
        {
          diseasePest: { id: 'dp1', slug: 'aphid', name: 'アブラムシ' },
          rating: makeRating({ efficacyLevel: null, persistenceLevel: 'good' }),
        },
      ],
    });
    renderWithProviders(<ProductDetailScreen />);
    const row = within(screen.getByLabelText('アブラムシの詳細を見る'));
    expect(row.getByText('持続')).toBeTruthy();
    expect(row.getByText('○')).toBeTruthy();
  });

  it('fungicide タイプでは「予防」「治療」バッジが表示される', () => {
    mockDetailQuery.data = makeProductDetail({
      pesticideType: 'fungicide',
      effects: [
        {
          diseasePest: { id: 'dp2', slug: 'powdery-mildew', name: 'うどんこ病' },
          rating: makeRating({ preventionLevel: 'excellent', treatmentLevel: 'good' }),
        },
      ],
    });
    renderWithProviders(<ProductDetailScreen />);
    const row = within(screen.getByLabelText('うどんこ病の詳細を見る'));
    expect(row.getByText('予防')).toBeTruthy();
    expect(row.getByText('治療')).toBeTruthy();
    expect(row.getByText('◎')).toBeTruthy();
    expect(row.getByText('○')).toBeTruthy();
  });

  it('rating フィールドが null の場合でもクラッシュしない', () => {
    mockDetailQuery.data = makeProductDetail({
      pesticideType: 'insecticide',
      effects: [
        {
          diseasePest: { id: 'dp1', slug: 'aphid', name: 'アブラムシ' },
          rating: makeRating({ efficacyLevel: null, persistenceLevel: null }),
        },
      ],
    });
    expect(() => renderWithProviders(<ProductDetailScreen />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 混用不可行タップで詳細遷移
// ---------------------------------------------------------------------------

describe('ProductDetailScreen 混用不可行タップ', () => {
  it('混用不可農薬タップで製品詳細画面に push する', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    fireEvent.press(screen.getByLabelText('○○殺菌剤の詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/products/[slug]',
      params: { slug: 'product-b' },
    });
  });

  it('混用不可農薬が複数ある場合それぞれタップできる', () => {
    mockDetailQuery.data = makeProductDetail({
      incompatibilities: [
        { id: 'ic1', slug: 'product-b', name: '○○殺菌剤', formulationTypeName: '乳剤' },
        { id: 'ic2', slug: 'product-c', name: '△△農薬', formulationTypeName: null },
      ],
    });
    renderWithProviders(<ProductDetailScreen />);
    fireEvent.press(screen.getByLabelText('△△農薬の詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/products/[slug]',
      params: { slug: 'product-c' },
    });
  });
});
