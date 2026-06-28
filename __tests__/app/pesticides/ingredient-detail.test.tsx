/**
 * app/pesticides/ingredients/[slug]/index のコンポーネントテスト。
 * slug ガード・成分情報・含む製品リスト・タップ遷移・エラー・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import IngredientDetailScreen from '@/app/pesticides/ingredients/[slug]/index';
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
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientDetailQuery: () => mockDetailQuery,
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeIngredientDetail(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'i1',
    slug: 'pirimicarb',
    name: 'ピリミカルブ',
    nameEn: 'Pirimicarb',
    fracCode: null,
    iracCode: 'IRAC-1A',
    resistanceRisk: 'low',
    ingredientGroup: 'カルバメート系',
    description: 'アブラムシ類に選択的に効果を示す殺虫成分。',
    pesticides: [
      {
        pesticide: {
          id: 'p1',
          slug: 'product-a',
          name: 'アブラムシ殺虫剤A',
          formulationTypeName: '水和剤',
        },
        contentLabel: '50%含有',
      },
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
  mockUseLocalSearchParams.mockReturnValue({ slug: 'pirimicarb' });
});

// ---------------------------------------------------------------------------
// slug ガード
// ---------------------------------------------------------------------------

describe('IngredientDetailScreen slug ガード', () => {
  it('空文字 slug のとき「この情報は見つかりません。」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: '' });
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('この情報は見つかりません。')).toBeTruthy();
  });

  it('配列 slug のとき先頭要素を使用し、isError でなければエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: ['pirimicarb', 'other'] });
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.queryByText('この情報は見つかりません。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('IngredientDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockDetailQuery.isLoading = true;
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('IngredientDetailScreen エラー', () => {
  it('isError=true のとき「この情報は見つかりません。」が表示される', () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('この情報は見つかりません。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<IngredientDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('IngredientDetailScreen 正常表示', () => {
  it('成分名が表示される', () => {
    mockDetailQuery.data = makeIngredientDetail();
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('ピリミカルブ')).toBeTruthy();
  });

  it('英名が表示される', () => {
    mockDetailQuery.data = makeIngredientDetail();
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('Pirimicarb')).toBeTruthy();
  });

  it('IRAC コードのチップが表示される', () => {
    mockDetailQuery.data = makeIngredientDetail();
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('IRACコード')).toBeTruthy();
    expect(screen.getByText('IRAC-1A')).toBeTruthy();
  });

  it('成分グループが表示される', () => {
    mockDetailQuery.data = makeIngredientDetail();
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('カルバメート系')).toBeTruthy();
  });

  it('説明が表示される', () => {
    mockDetailQuery.data = makeIngredientDetail();
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('アブラムシ類に選択的に効果を示す殺虫成分。')).toBeTruthy();
  });

  it('含む製品セクションが表示される', () => {
    mockDetailQuery.data = makeIngredientDetail();
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('この原体を含む薬剤（1件）')).toBeTruthy();
    expect(screen.getByText('アブラムシ殺虫剤A')).toBeTruthy();
  });

  it('製品タップで製品詳細へ push する', () => {
    mockDetailQuery.data = makeIngredientDetail();
    renderWithProviders(<IngredientDetailScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシ殺虫剤Aの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/products/[slug]',
      params: { slug: 'product-a' },
    });
  });

  it('含む製品が空のとき「含む製品」セクションが表示されない', () => {
    mockDetailQuery.data = makeIngredientDetail({ pesticides: [] });
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.queryByText(/この原体を含む薬剤/)).toBeNull();
  });

  it('英名が null のとき英名が表示されない', () => {
    mockDetailQuery.data = makeIngredientDetail({ nameEn: null });
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.queryByText('Pirimicarb')).toBeNull();
  });

  it('低耐性リスクの日本語ラベルが表示される', () => {
    mockDetailQuery.data = makeIngredientDetail({ resistanceRisk: 'low' });
    renderWithProviders(<IngredientDetailScreen />);
    expect(screen.getByText('耐性リスク')).toBeTruthy();
    expect(screen.getByText('つきにくい')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('IngredientDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<IngredientDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
