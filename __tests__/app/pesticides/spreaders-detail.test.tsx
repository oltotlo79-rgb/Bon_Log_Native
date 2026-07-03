/**
 * app/pesticides/spreaders/[slug]/index のコンポーネントテスト。
 * ローディング・エラー・概要/効果/注意・製品リスト・タップ遷移・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import SpreaderTypeDetailScreen from '@/app/pesticides/spreaders/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockSpreaderTypeDetailQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/pesticides', () => ({
  useSpreaderTypeDetailQuery: () => mockSpreaderTypeDetailQuery,
  useSpreaderTypesQuery: jest.fn(),
  useSpreaderProductsQuery: jest.fn(),
  usePesticideColumnsQuery: jest.fn(),
  usePesticideColumnDetailQuery: jest.fn(),
  useFormulationTypesQuery: jest.fn(),
  useMixingDataQuery: jest.fn(),
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientsQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

function makeDetailData() {
  return {
    id: 'st1',
    slug: 'silicone',
    name: 'シリコーン系',
    description: 'シリコーン由来の展着剤です',
    effect: '薬液の付着力を高める',
    usageNote: '高温時の散布は避けること',
    products: [
      {
        id: 'p1',
        slug: 'product-a',
        name: 'サンダーSG',
        description: '高品質シリコーン展着剤',
        formulationType: { name: '液剤', code: 'L' },
      },
      {
        id: 'p2',
        slug: 'product-b',
        name: 'アプローチBI',
        description: null,
        formulationType: null,
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ slug: 'silicone' });
  mockSpreaderTypeDetailQuery.data = undefined as unknown;
  mockSpreaderTypeDetailQuery.isLoading = false;
  mockSpreaderTypeDetailQuery.isError = false;
  mockSpreaderTypeDetailQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('SpreaderTypeDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockSpreaderTypeDetailQuery.isLoading = true;
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('SpreaderTypeDetailScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockSpreaderTypeDetailQuery.isError = true;
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('data が undefined でも ScreenError が表示される', () => {
    mockSpreaderTypeDetailQuery.data = undefined;
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockSpreaderTypeDetailQuery.isError = true;
    renderWithProviders(<SpreaderTypeDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockSpreaderTypeDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 正常データ
// ---------------------------------------------------------------------------

describe('SpreaderTypeDetailScreen 正常データ', () => {
  it('該当する製品の見出しが表示される', () => {
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText(/該当する製品/)).toBeTruthy();
  });

  it('概要セクションが表示される', () => {
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('概要')).toBeTruthy();
    expect(screen.getByText('シリコーン由来の展着剤です')).toBeTruthy();
  });

  it('効果セクションが表示される', () => {
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('効果')).toBeTruthy();
    expect(screen.getByText('薬液の付着力を高める')).toBeTruthy();
  });

  it('利用時の注意セクションが表示される', () => {
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('利用時の注意')).toBeTruthy();
    expect(screen.getByText('高温時の散布は避けること')).toBeTruthy();
  });

  it('製品リストが表示される', () => {
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('サンダーSG')).toBeTruthy();
    expect(screen.getByText('アプローチBI')).toBeTruthy();
  });

  it('製品の description が表示される', () => {
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('高品質シリコーン展着剤')).toBeTruthy();
  });

  it('formulationType がある場合に名称とコードが表示される', () => {
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('液剤（L）')).toBeTruthy();
  });

  it('製品0件のとき空メッセージが表示される', () => {
    mockSpreaderTypeDetailQuery.data = { ...makeDetailData(), products: [] };
    renderWithProviders(<SpreaderTypeDetailScreen />);
    expect(screen.getByText('この型の製品はまだ登録されていません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ遷移
// ---------------------------------------------------------------------------

describe('SpreaderTypeDetailScreen タップ遷移', () => {
  it('製品タップで製品詳細画面へ push する', () => {
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    fireEvent.press(screen.getByLabelText('サンダーSGの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/products/[slug]',
      params: { slug: 'product-a' },
    });
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('SpreaderTypeDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockSpreaderTypeDetailQuery.data = makeDetailData();
    renderWithProviders(<SpreaderTypeDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
