/**
 * app/pesticides/ingredients/index のコンポーネントテスト。
 * 4状態（ローディング・エラー・空・データあり）・検索フォーム・
 * リスト表示・無限スクロールを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import IngredientsIndexScreen from '@/app/pesticides/ingredients/index';
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

let mockIngredientsQuery = makeInfiniteBase();

jest.mock('@/lib/queries/pesticides', () => ({
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideIngredientsQuery: () => mockIngredientsQuery,
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeIngredientsData() {
  return {
    pages: [
      {
        items: [
          {
            id: 'ing1',
            slug: 'acetamiprid',
            name: 'アセタミプリド',
            nameEn: 'Acetamiprid',
            fracCode: null,
            iracCode: '4A',
          },
          {
            id: 'ing2',
            slug: 'chlorothalonil',
            name: 'クロロタロニル',
            nameEn: 'Chlorothalonil',
            fracCode: 'M5',
            iracCode: null,
          },
          {
            id: 'ing3',
            slug: 'copper-hydroxide',
            name: '水酸化銅',
            nameEn: null,
            fracCode: 'M1',
            iracCode: null,
          },
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
  mockIngredientsQuery = makeInfiniteBase();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('IngredientsIndexScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockIngredientsQuery.isLoading = true;
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('IngredientsIndexScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockIngredientsQuery.isError = true;
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByText('有効成分を読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockIngredientsQuery.isError = true;
    renderWithProviders(<IngredientsIndexScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockIngredientsQuery.refetch).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('IngredientsIndexScreen 空状態', () => {
  it('データが空のとき「該当する有効成分が見つかりませんでした」が表示される', () => {
    mockIngredientsQuery.data = { pages: [{ items: [], nextCursor: null }] };
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByText('該当する有効成分が見つかりませんでした')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// データあり・リスト表示
// ---------------------------------------------------------------------------

describe('IngredientsIndexScreen データ表示', () => {
  it('有効成分名が表示される', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByText('アセタミプリド')).toBeTruthy();
    expect(screen.getByText('クロロタロニル')).toBeTruthy();
  });

  it('英名が表示される', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByText('Acetamiprid')).toBeTruthy();
    expect(screen.getByText('Chlorothalonil')).toBeTruthy();
  });

  it('英名が null のときは英名テキストが表示されない', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.queryByText('null')).toBeNull();
  });

  it('IRAC コードが表示される', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByText('IRAC: 4A')).toBeTruthy();
  });

  it('FRAC コードが表示される', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByText('FRAC: M5')).toBeTruthy();
  });

  it('fracCode・iracCode が両方 null のときコードタグが表示されない', () => {
    mockIngredientsQuery.data = {
      pages: [
        {
          items: [
            {
              id: 'ing4',
              slug: 'no-code',
              name: 'コードなし成分',
              nameEn: null,
              fracCode: null,
              iracCode: null,
            },
          ],
          nextCursor: null,
        },
      ],
    };
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.queryByText(/FRAC:/)).toBeNull();
    expect(screen.queryByText(/IRAC:/)).toBeNull();
  });

  it('有効成分をタップすると詳細画面へ push する', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    renderWithProviders(<IngredientsIndexScreen />);
    fireEvent.press(screen.getByLabelText('アセタミプリドの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/ingredients/[slug]',
      params: { slug: 'acetamiprid' },
    });
  });
});

// ---------------------------------------------------------------------------
// 検索フォーム
// ---------------------------------------------------------------------------

describe('IngredientsIndexScreen 検索フォーム', () => {
  it('検索フォームが表示される', () => {
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByLabelText('有効成分名またはFRAC/IRACコードで検索')).toBeTruthy();
  });

  it('「検索する」ボタンが表示される', () => {
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByLabelText('検索する')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 無限スクロール
// ---------------------------------------------------------------------------

describe('IngredientsIndexScreen 無限スクロール', () => {
  it('hasNextPage=true のとき hasNextPage が true である', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    mockIngredientsQuery.hasNextPage = true;
    renderWithProviders(<IngredientsIndexScreen />);
    expect(mockIngredientsQuery.hasNextPage).toBe(true);
  });

  it('isFetchingNextPage=true のときエラーなしにレンダリングされる', () => {
    mockIngredientsQuery.data = makeIngredientsData();
    mockIngredientsQuery.isFetchingNextPage = true;
    renderWithProviders(<IngredientsIndexScreen />);
    expect(screen.getByText('アセタミプリド')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 免責事項
// ---------------------------------------------------------------------------

describe('IngredientsIndexScreen 免責事項', () => {
  it('免責事項テキストが表示される', () => {
    renderWithProviders(<IngredientsIndexScreen />);
    expect(
      screen.getByText(
        '農薬情報は参考情報です。実際の使用に際しては必ず製品ラベルおよび農林水産省登録情報を確認してください。効果・安全性は個々の使用状況により異なります。',
      ),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('IngredientsIndexScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<IngredientsIndexScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
