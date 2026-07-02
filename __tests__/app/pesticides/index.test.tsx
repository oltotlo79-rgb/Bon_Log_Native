/**
 * app/pesticides/index のコンポーネントテスト。
 * NavCard ハブ + フィルタチップ + 病害虫グリッド / 製品リストの切り替えを検証する。
 * 旧タブ構成（病害虫・農薬製品・農薬成分）は廃止済み。農薬成分はサブ画面 /pesticides/ingredients へ独立。
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

jest.mock('@/lib/queries/pesticides', () => ({
  usePesticideDiseasePestsQuery: () => mockDiseasePestsQuery,
  usePesticideProductsQuery: () => mockProductsQuery,
  usePesticideIngredientsQuery: jest.fn(),
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
          {
            id: 'dp1',
            slug: 'aphid',
            name: 'アブラムシ',
            nameKana: 'あぶらむし',
            category: 'pest' as const,
            description: '新芽に付く小型害虫',
            imageUrl: 'https://cdn.example.com/aphid.jpg',
          },
          {
            id: 'dp2',
            slug: 'spider-mite',
            name: 'ハダニ',
            nameKana: 'はだに',
            category: 'pest' as const,
            description: null,
            imageUrl: null,
          },
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
          {
            id: 'p1',
            slug: 'product-a',
            name: '殺虫剤A',
            pesticideType: 'insecticide' as const,
            description: '接触型殺虫剤',
          },
          {
            id: 'p2',
            slug: 'product-b',
            name: '殺菌剤B',
            pesticideType: 'fungicide' as const,
            description: null,
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
  mockDiseasePestsQuery = makeInfiniteBase();
  mockProductsQuery = makeInfiniteBase();
});

// ---------------------------------------------------------------------------
// ヘッダー・説明文
// ---------------------------------------------------------------------------

describe('PesticidesScreen ヘッダー', () => {
  it('説明文が表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(
      screen.getByText('病害虫を選んで効く薬剤を検索、または薬剤名で直接検索できます'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// NavCard（サブ画面へのナビゲーション）
// ---------------------------------------------------------------------------

describe('PesticidesScreen NavCard', () => {
  it('「病害虫・益虫図鑑」NavCard が表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('病害虫・益虫図鑑へ移動')).toBeTruthy();
  });

  it('「有効成分（原体）一覧」NavCard が表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('有効成分（原体）一覧へ移動')).toBeTruthy();
  });

  it('「希釈計算ツール」NavCard が表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('希釈計算ツールへ移動')).toBeTruthy();
  });

  it('「散布方法ガイド」NavCard が表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('散布方法ガイドへ移動')).toBeTruthy();
  });

  it('「病害虫・益虫図鑑」タップで /pesticides/disease-pests へ push する', () => {
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('病害虫・益虫図鑑へ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/pesticides/disease-pests');
  });

  it('「有効成分（原体）一覧」タップで /pesticides/ingredients へ push する', () => {
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('有効成分（原体）一覧へ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/pesticides/ingredients');
  });

  it('「希釈計算ツール」タップで /pesticides/dilution-calculator へ push する', () => {
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('希釈計算ツールへ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/pesticides/dilution-calculator');
  });

  it('「散布方法ガイド」タップで /pesticides/spray-guide へ push する', () => {
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('散布方法ガイドへ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/pesticides/spray-guide');
  });
});

// ---------------------------------------------------------------------------
// フィルタチップ
// ---------------------------------------------------------------------------

describe('PesticidesScreen フィルタチップ', () => {
  it('「全て」フィルタチップが表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('全てでフィルタ')).toBeTruthy();
  });

  it('「害虫」フィルタチップが表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('害虫でフィルタ')).toBeTruthy();
  });

  it('「病気」フィルタチップが表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('病気でフィルタ')).toBeTruthy();
  });

  it('「全て」チップは初期状態で selected になっている', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(
      screen.getByLabelText('全てでフィルタ').props.accessibilityState?.selected
    ).toBe(true);
  });

  it('「害虫」チップをタップすると selected になる', () => {
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('害虫でフィルタ'));
    expect(
      screen.getByLabelText('害虫でフィルタ').props.accessibilityState?.selected
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 病害虫グリッド（害虫フィルタ選択時）
// ---------------------------------------------------------------------------

describe('PesticidesScreen 病害虫グリッド', () => {
  it('害虫フィルタ選択後に病害虫名が表示される', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('害虫でフィルタ'));
    expect(screen.getByText('アブラムシ')).toBeTruthy();
    expect(screen.getByText('ハダニ')).toBeTruthy();
  });

  it('病害虫タップで農薬を絞り込む（selectedDiseasePestId が設定される）', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('害虫でフィルタ'));
    fireEvent.press(screen.getByLabelText('アブラムシで農薬を絞り込む'));
    // タップ後はフィルタが「全て」に戻り製品リストモードになる
    expect(
      screen.getByLabelText('全てでフィルタ').props.accessibilityState?.selected
    ).toBe(true);
  });

  it('imageUrl がある病害虫アイテムのサムネイルが表示される', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('害虫でフィルタ'));
    expect(screen.getByLabelText('アブラムシのサムネイル')).toBeTruthy();
  });

  it('imageUrl が null の病害虫アイテムはサムネイルを表示しない', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('害虫でフィルタ'));
    expect(screen.queryByLabelText('ハダニのサムネイル')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 農薬製品グリッド（殺虫剤フィルタ選択時）
// ---------------------------------------------------------------------------

describe('PesticidesScreen 農薬製品グリッド', () => {
  it('殺虫剤フィルタ選択後に製品名が表示される', () => {
    mockProductsQuery.data = makeProductsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('殺虫剤でフィルタ'));
    expect(screen.getByText('殺虫剤A')).toBeTruthy();
  });

  it('農薬製品タップで詳細画面へ push する', () => {
    mockProductsQuery.data = makeProductsData();
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('殺虫剤でフィルタ'));
    fireEvent.press(screen.getByLabelText('殺虫剤Aの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/products/[slug]',
      params: { slug: 'product-a' },
    });
  });
});

// ---------------------------------------------------------------------------
// あいうえお順全一覧（デフォルト「全て」状態）
// ---------------------------------------------------------------------------

describe('PesticidesScreen あいうえお順全一覧', () => {
  it('デフォルト状態で見出し「あいうえお順一覧」が表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByText('あいうえお順一覧')).toBeTruthy();
  });

  it('病害虫 + 製品を混在表示する', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    mockProductsQuery.data = makeProductsData();
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByText('アブラムシ')).toBeTruthy();
    expect(screen.getByText('殺虫剤A')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 検索フォーム
// ---------------------------------------------------------------------------

describe('PesticidesScreen 検索フォーム', () => {
  it('検索フォームが表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('薬剤名または登録番号で検索')).toBeTruthy();
  });

  it('「検索する」ボタンが表示される', () => {
    renderWithProviders(<PesticidesScreen />);
    expect(screen.getByLabelText('検索する')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('PesticidesScreen エラー', () => {
  it('病害虫フィルタ中にエラーが発生したとき ScreenError が表示される', () => {
    mockDiseasePestsQuery.isError = true;
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('害虫でフィルタ'));
    expect(screen.getByText('データを読み込めませんでした。')).toBeTruthy();
  });

  it('製品フィルタ中にエラーが発生したとき ScreenError が表示される', () => {
    mockProductsQuery.isError = true;
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('殺虫剤でフィルタ'));
    expect(screen.getByText('データを読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDiseasePestsQuery.isError = true;
    renderWithProviders(<PesticidesScreen />);
    fireEvent.press(screen.getByLabelText('害虫でフィルタ'));
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDiseasePestsQuery.refetch).toHaveBeenCalled();
    });
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
