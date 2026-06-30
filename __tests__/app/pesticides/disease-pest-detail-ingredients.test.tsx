/**
 * app/pesticides/disease-pests/[slug]/index の農薬カード表示テスト。
 * 剤型名（formulationType.name）と有効成分（activeIngredients の name / FRAC / IRAC）
 * が農薬カードに正しく表示されることを検証する。
 * 既存の disease-pest-detail.test.tsx にはこれらフィールドのテストがないため別ファイルで管理する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import DiseasePestDetailScreen from '@/app/pesticides/disease-pests/[slug]/index';
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
  usePesticideDiseasePestDetailQuery: () => mockDetailQuery,
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type ActiveIngredient = {
  id: string;
  name: string;
  fracCode: string | null;
  iracCode: string | null;
  resistanceRisk: 'low' | 'medium' | 'high' | null;
  slug: string;
};

type FormulationType = {
  name: string;
  code: string;
} | null;

type PesticideCardData = {
  id: string;
  slug: string;
  name: string;
  pesticideType: 'fungicide' | 'insecticide' | 'acaricide' | 'compound' | 'other';
  formulationType: FormulationType;
  activeIngredients: ActiveIngredient[];
};

function makeDiseasePestDetailWithIngredients(overrides?: {
  pesticide?: Partial<PesticideCardData>;
}) {
  const basePesticide: PesticideCardData = {
    id: 'p1',
    slug: 'product-a',
    name: 'テスト殺虫剤',
    pesticideType: 'insecticide',
    formulationType: { name: '水和剤', code: 'WP' },
    activeIngredients: [
      {
        id: 'ing1',
        name: 'アセタミプリド',
        fracCode: null,
        iracCode: '4A',
        resistanceRisk: 'medium',
        slug: 'acetamiprid',
      },
    ],
    ...overrides?.pesticide,
  };

  return {
    id: 'dp1',
    slug: 'aphid',
    name: 'アブラムシ',
    nameKana: 'あぶらむし',
    category: 'pest' as const,
    description: '新芽に集団付着する小型害虫。',
    imageUrl: null,
    effects: [
      {
        pesticide: basePesticide,
        rating: {
          preventionLevel: null,
          treatmentLevel: null,
          efficacyLevel: 'good' as const,
          persistenceLevel: 'fair' as const,
        },
      },
    ],
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
  mockUseLocalSearchParams.mockReturnValue({ slug: 'aphid' });
});

// ---------------------------------------------------------------------------
// 剤型名（formulationType.name）の表示テスト
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen 剤型名（formulationType.name）', () => {
  it('formulationType.name が農薬カードに表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients();
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('水和剤')).toBeTruthy();
  });

  it('formulationType が null のとき剤型名が表示されない', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: { formulationType: null },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.queryByText('水和剤')).toBeNull();
  });

  it('別の剤型名「乳剤」が表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: { formulationType: { name: '乳剤', code: 'EC' } },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('乳剤')).toBeTruthy();
  });

  it('「フロアブル」剤型名が表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: { formulationType: { name: 'フロアブル', code: 'SC' } },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('フロアブル')).toBeTruthy();
  });

  it('複数農薬カードがある場合にそれぞれの剤型名が表示される', () => {
    mockDetailQuery.data = {
      id: 'dp1',
      slug: 'aphid',
      name: 'アブラムシ',
      nameKana: 'あぶらむし',
      category: 'pest' as const,
      description: null,
      imageUrl: null,
      effects: [
        {
          pesticide: {
            id: 'p1',
            slug: 'product-a',
            name: '殺虫剤A',
            pesticideType: 'insecticide' as const,
            formulationType: { name: '水和剤', code: 'WP' },
            activeIngredients: [],
          },
          rating: { preventionLevel: null, treatmentLevel: null, efficacyLevel: 'good' as const, persistenceLevel: null },
        },
        {
          pesticide: {
            id: 'p2',
            slug: 'product-b',
            name: '殺虫剤B',
            pesticideType: 'acaricide' as const,
            formulationType: { name: '乳剤', code: 'EC' },
            activeIngredients: [],
          },
          rating: { preventionLevel: null, treatmentLevel: null, efficacyLevel: 'fair' as const, persistenceLevel: null },
        },
      ],
    };
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('水和剤')).toBeTruthy();
    expect(screen.getByText('乳剤')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 有効成分名（activeIngredients.name）の表示テスト
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen 有効成分名（activeIngredients.name）', () => {
  it('activeIngredients の name が農薬カードに表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients();
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText(/アセタミプリド/)).toBeTruthy();
  });

  it('複数有効成分の name がすべて表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: {
        activeIngredients: [
          { id: 'ing1', name: 'アセタミプリド', fracCode: null, iracCode: '4A', resistanceRisk: null, slug: 'acetamiprid' },
          { id: 'ing2', name: 'クロチアニジン', fracCode: null, iracCode: '4A', resistanceRisk: null, slug: 'clothianidin' },
        ],
      },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText(/アセタミプリド/)).toBeTruthy();
    expect(screen.getByText(/クロチアニジン/)).toBeTruthy();
  });

  it('activeIngredients が空のとき有効成分タグ行が表示されない', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: { activeIngredients: [] },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.queryByText(/アセタミプリド/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FRAC コードの表示テスト
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen FRAC コード', () => {
  it('fracCode がある場合に「FRAC:X」形式で表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: {
        pesticideType: 'fungicide',
        activeIngredients: [
          { id: 'ing1', name: 'アゾキシストロビン', fracCode: '11', iracCode: null, resistanceRisk: 'medium', slug: 'azoxystrobin' },
        ],
      },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText(/FRAC:11/)).toBeTruthy();
  });

  it('fracCode が null のとき「FRAC:」が表示されない', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: {
        activeIngredients: [
          { id: 'ing1', name: 'アセタミプリド', fracCode: null, iracCode: null, resistanceRisk: null, slug: 'acetamiprid' },
        ],
      },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.queryByText(/FRAC:/)).toBeNull();
  });

  it('fracCode が null で iracCode が null のときコードが表示されない', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: {
        activeIngredients: [
          { id: 'ing1', name: 'テスト成分', fracCode: null, iracCode: null, resistanceRisk: null, slug: 'test' },
        ],
      },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    // 成分名のみ表示される
    expect(screen.getByText(/テスト成分/)).toBeTruthy();
    expect(screen.queryByText(/FRAC:/)).toBeNull();
    expect(screen.queryByText(/IRAC:/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// IRAC コードの表示テスト
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen IRAC コード', () => {
  it('iracCode がある場合に「IRAC:4A」形式で表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients();
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText(/IRAC:4A/)).toBeTruthy();
  });

  it('iracCode が null のとき「IRAC:」が表示されない', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: {
        activeIngredients: [
          { id: 'ing1', name: 'アゾキシストロビン', fracCode: '11', iracCode: null, resistanceRisk: null, slug: 'azoxystrobin' },
        ],
      },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.queryByText(/IRAC:/)).toBeNull();
  });

  it('FRAC と IRAC の両方がある場合に両方表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: {
        pesticideType: 'compound',
        activeIngredients: [
          { id: 'ing1', name: '複合成分', fracCode: '3', iracCode: '1B', resistanceRisk: 'high', slug: 'compound-ing' },
        ],
      },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText(/FRAC:3/)).toBeTruthy();
    expect(screen.getByText(/IRAC:1B/)).toBeTruthy();
  });

  it('有効成分名・FRAC・IRAC が同一タグに含まれる', () => {
    mockDetailQuery.data = makeDiseasePestDetailWithIngredients({
      pesticide: {
        activeIngredients: [
          { id: 'ing1', name: 'テストAI', fracCode: '7', iracCode: '2B', resistanceRisk: null, slug: 'test-ai' },
        ],
      },
    });
    renderWithProviders(<DiseasePestDetailScreen />);
    // テキストは「テストAI  FRAC:7  IRAC:2B」の形式で 1 つのテキスト要素に含まれる
    const tag = screen.getByText(/テストAI/);
    expect(tag).toBeTruthy();
    // children が文字列配列の場合は join して全体テキストを取得する
    const raw = tag.props.children;
    const tagText: string = Array.isArray(raw) ? raw.join('') : String(raw ?? '');
    expect(tagText).toContain('FRAC:7');
    expect(tagText).toContain('IRAC:2B');
  });
});
