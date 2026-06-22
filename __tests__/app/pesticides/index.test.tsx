/**
 * app/pesticides/index のコンポーネントテスト。
 * 3タブ構成（病害虫・農薬製品・農薬成分）・エラー・空状態・タップ遷移・無限スクロール・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import PesticidesScreen from '@/app/pesticides/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const makeInfiniteBase = () => ({
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
});

let mockDiseasePestsQuery = makeInfiniteBase();
let mockProductsQuery = makeInfiniteBase();
let mockIngredientsQuery = makeInfiniteBase();

jest.mock('@/lib/queries/pesticides', () => ({
  usePesticideDiseasePestsQuery: () => mockDiseasePestsQuery,
  usePesticideProductsQuery: () => mockProductsQuery,
  usePesticideIngredientsQuery: () => mockIngredientsQuery,
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeDiseasePestsData() {
  return {
    pages: [
      {
        items: [
          { id: 'dp1', slug: 'aphid', name: 'アブラムシ', category: '害虫', description: '新芽に付く小型害虫' },
          { id: 'dp2', slug: 'spider-mite', name: 'ハダニ', category: '害虫', description: null },
        ],
        nextCursor: null,
      },
    ],
  };
}

function makeProductsData() {
  return {
    pages: [
      {
        items: [
          { id: 'p1', slug: 'product-a', name: '殺虫剤A', pesticideType: '殺虫剤', description: '接触型殺虫剤' },
          { id: 'p2', slug: 'product-b', name: '殺菌剤B', pesticideType: '殺菌剤', description: null },
        ],
        nextCursor: null,
      },
    ],
  };
}

function makeIngredientsData() {
  return {
    pages: [
      {
        items: [
          { id: 'i1', slug: 'ingredient-a', name: 'ピリミカルブ', nameEn: 'Pirimicarb' },
          { id: 'i2', slug: 'ingredient-b', name: 'アバメクチン', nameEn: null },
        ],
        nextCursor: null,
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
  mockDiseasePestsQuery = makeInfiniteBase();
  mockProductsQuery = makeInfiniteBase();
  mockIngredientsQuery = makeInfiniteBase();
});

// ---------------------------------------------------------------------------
// タブ表示
// ---------------------------------------------------------------------------

describe('PesticidesScreen タブ', () => {
  it('「病害虫」タブが表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('病害虫')).toBeTruthy();
  });

  it('「農薬製品」タブが表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('農薬製品')).toBeTruthy();
  });

  it('「農薬成分」タブが表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('農薬成分')).toBeTruthy();
  });

  it('初期タブは「病害虫」がアクティブ', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(
      screen.getByLabelText('病害虫').props.accessibilityState?.selected
    ).toBe(true);
  });

  it('「農薬製品」タブをタップするとアクティブになる', () => {
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬製品'));
    expect(
      screen.getByLabelText('農薬製品').props.accessibilityState?.selected
    ).toBe(true);
  });

  it('「農薬成分」タブをタップするとアクティブになる', () => {
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬成分'));
    expect(
      screen.getByLabelText('農薬成分').props.accessibilityState?.selected
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 病害虫タブ
// ---------------------------------------------------------------------------

describe('PesticidesScreen 病害虫タブ', () => {
  it('病害虫一覧が表示される', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByText('アブラムシ')).toBeTruthy();
    expect(screen.getByText('ハダニ')).toBeTruthy();
  });

  it('病害虫行タップで詳細画面へ push する', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/disease-pests/[slug]',
      params: { slug: 'aphid' },
    });
  });

  it('病害虫が空のとき「データがありません」が表示される', () => {
    mockDiseasePestsQuery.data = { pages: [{ items: [], nextCursor: null }] };
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByText('データがありません')).toBeTruthy();
  });

  it('病害虫エラー時に ScreenError が表示される', () => {
    mockDiseasePestsQuery.isError = true;
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByText('図鑑を読み込めませんでした。')).toBeTruthy();
  });

  it('病害虫エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDiseasePestsQuery.isError = true;
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDiseasePestsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 農薬製品タブ
// ---------------------------------------------------------------------------

describe('PesticidesScreen 農薬製品タブ', () => {
  it('農薬製品タブに切り替えると製品一覧が表示される', () => {
    mockProductsQuery.data = makeProductsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬製品'));
    expect(screen.getByText('殺虫剤A')).toBeTruthy();
    expect(screen.getByText('殺菌剤B')).toBeTruthy();
  });

  it('農薬製品行タップで詳細画面へ push する', () => {
    mockProductsQuery.data = makeProductsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬製品'));
    fireEvent.press(screen.getByLabelText('殺虫剤Aの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/products/[slug]',
      params: { slug: 'product-a' },
    });
  });

  it('農薬製品が空のとき「データがありません」が表示される', () => {
    mockProductsQuery.data = { pages: [{ items: [], nextCursor: null }] };
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬製品'));
    expect(screen.getByText('データがありません')).toBeTruthy();
  });

  it('農薬製品エラー時に ScreenError が表示される', () => {
    mockProductsQuery.isError = true;
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬製品'));
    expect(screen.getByText('図鑑を読み込めませんでした。')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 農薬成分タブ
// ---------------------------------------------------------------------------

describe('PesticidesScreen 農薬成分タブ', () => {
  it('農薬成分タブに切り替えると成分一覧が表示される', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬成分'));
    expect(screen.getByText('ピリミカルブ')).toBeTruthy();
    expect(screen.getByText('アバメクチン')).toBeTruthy();
  });

  it('農薬成分行タップで詳細画面へ push する', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬成分'));
    fireEvent.press(screen.getByLabelText('ピリミカルブの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/ingredients/[slug]',
      params: { slug: 'ingredient-a' },
    });
  });

  it('農薬成分が空のとき「データがありません」が表示される', () => {
    mockIngredientsQuery.data = { pages: [{ items: [], nextCursor: null }] };
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬成分'));
    expect(screen.getByText('データがありません')).toBeTruthy();
  });

  it('農薬成分エラー時に ScreenError が表示される', () => {
    mockIngredientsQuery.isError = true;
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('農薬成分'));
    expect(screen.getByText('図鑑を読み込めませんでした。')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('PesticidesScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<PesticidesScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
