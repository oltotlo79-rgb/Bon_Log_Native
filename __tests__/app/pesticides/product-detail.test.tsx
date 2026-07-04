/**
 * app/pesticides/products/[slug]/index のコンポーネントテスト。
 * slug ガード・製品情報・有効成分・対象病害虫・エラー・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProductDetailScreen from '@/app/pesticides/products/[slug]/index';
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

type EffectRatingValue = 'excellent' | 'good' | 'fair' | 'poor' | 'none' | null;

function makeRating(overrides?: {
  preventionLevel?: EffectRatingValue;
  treatmentLevel?: EffectRatingValue;
  efficacyLevel?: EffectRatingValue;
  persistenceLevel?: EffectRatingValue;
}) {
  return {
    preventionLevel: null as EffectRatingValue,
    treatmentLevel: null as EffectRatingValue,
    efficacyLevel: overrides?.efficacyLevel ?? ('good' as EffectRatingValue),
    persistenceLevel: overrides?.persistenceLevel ?? ('fair' as EffectRatingValue),
    ...overrides,
  };
}

function makeProductDetail(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'p1',
    slug: 'product-a',
    name: 'アブラムシ専用殺虫剤A',
    pesticideType: 'insecticide',
    registrationNumber: '第12345号',
    formulationType: { name: '水和剤', code: 'WP' },
    description: '接触型の殺虫剤。速効性がある。',
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
  mockUseOnlineStatus.mockReturnValue(true);
  mockDetailQuery.data = undefined;
  mockDetailQuery.isLoading = false;
  mockDetailQuery.isError = false;
  mockDetailQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'product-a' });
});

// ---------------------------------------------------------------------------
// slug ガード
// ---------------------------------------------------------------------------

describe('ProductDetailScreen slug ガード', () => {
  it('空文字 slug のとき「この情報は見つかりません。」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: '' });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('この情報は見つかりません。')).toBeTruthy();
  });

  it('配列 slug のとき先頭要素を使用し、isError でなければエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: ['product-a', 'other'] });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.queryByText('この情報は見つかりません。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('ProductDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockDetailQuery.isLoading = true;
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('ProductDetailScreen エラー', () => {
  it('isError=true のとき「この情報は見つかりません。」が表示される', () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('この情報は見つかりません。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<ProductDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('ProductDetailScreen 正常表示', () => {
  it('製品名が表示される', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('アブラムシ専用殺虫剤A')).toBeTruthy();
  });

  it('登録番号が農林水産省リンクとして表示される', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('第12345号（農林水産省）↗')).toBeTruthy();
  });

  it('説明が表示される', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('接触型の殺虫剤。速効性がある。')).toBeTruthy();
  });

  it('有効成分セクションが表示される', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('有効成分')).toBeTruthy();
    expect(screen.getByText('ピリミカルブ')).toBeTruthy();
  });

  it('有効成分タップで詳細画面へ push する', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    fireEvent.press(screen.getByLabelText('ピリミカルブの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/ingredients/[slug]',
      params: { slug: 'ingredient-a' },
    });
  });

  it('対象病害虫セクションが表示される', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('効果のある病害虫')).toBeTruthy();
    expect(screen.getByText('アブラムシ')).toBeTruthy();
  });

  it('対象病害虫タップで詳細画面へ push する', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/disease-pests/[slug]',
      params: { slug: 'aphid' },
    });
  });

  it('混用不可農薬セクションが表示される', () => {
    mockDetailQuery.data = makeProductDetail();
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('混用不可の農薬（代表例）')).toBeTruthy();
    expect(screen.getByText('○○殺菌剤')).toBeTruthy();
  });

  it('有効成分が空のとき「有効成分」セクションが表示されない', () => {
    mockDetailQuery.data = makeProductDetail({ activeIngredients: [] });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.queryByText('有効成分')).toBeNull();
  });

  it('登録番号が null のとき「登録番号は未掲載です」バッジが表示される', () => {
    mockDetailQuery.data = makeProductDetail({ registrationNumber: null });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('登録番号は未掲載です')).toBeTruthy();
  });

  it('formulationType が null のとき剤型セクションが表示されない', () => {
    mockDetailQuery.data = makeProductDetail({ formulationType: null });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.queryByText('剤型')).toBeNull();
  });

  it('混用不可農薬が空のとき「特に登録・記載されている混用不可情報はありません。」が表示される', () => {
    mockDetailQuery.data = makeProductDetail({ incompatibilities: [] });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByText('特に登録・記載されている混用不可情報はありません。')).toBeTruthy();
  });

  it('fracCode が null のとき FRAC タグが表示されない', () => {
    mockDetailQuery.data = makeProductDetail({
      activeIngredients: [
        { id: 'i1', slug: 'ingredient-a', name: 'ピリミカルブ', fracCode: null, iracCode: null, resistanceRisk: null },
      ],
      effects: [],
    });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.queryByText(/FRAC:/)).toBeNull();
  });

  it('description が null のとき説明テキストが表示されない', () => {
    mockDetailQuery.data = makeProductDetail({ description: null, effects: [] });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.queryByText('接触型の殺虫剤。速効性がある。')).toBeNull();
  });

  it('effects が空のとき「効果のある病害虫」セクションが表示されない', () => {
    mockDetailQuery.data = makeProductDetail({ effects: [] });
    renderWithProviders(<ProductDetailScreen />);
    expect(screen.queryByText('効果のある病害虫')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('ProductDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<ProductDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
