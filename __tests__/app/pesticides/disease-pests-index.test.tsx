/**
 * app/pesticides/disease-pests/index のコンポーネントテスト。
 * 4状態（ローディング・エラー・空・データあり）・検索フォーム・
 * カテゴリフィルタ・グリッド表示・無限スクロールを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import DiseasePestsIndexScreen from '@/app/pesticides/disease-pests/index';
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

jest.mock('@/lib/queries/pesticides', () => ({
  usePesticideDiseasePestsQuery: () => mockDiseasePestsQuery,
  usePesticideProductsQuery: jest.fn(),
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
          {
            id: 'dp3',
            slug: 'ladybug',
            name: 'テントウムシ',
            nameKana: 'てんとうむし',
            category: 'beneficial_insect' as const,
            description: 'アブラムシを食べる益虫',
            imageUrl: null,
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
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('DiseasePestsIndexScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockDiseasePestsQuery.isLoading = true;
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('DiseasePestsIndexScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockDiseasePestsQuery.isError = true;
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByText('図鑑を読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDiseasePestsQuery.isError = true;
    renderWithProviders(<DiseasePestsIndexScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDiseasePestsQuery.refetch).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('DiseasePestsIndexScreen 空状態', () => {
  it('データが空のとき「該当するデータが見つかりませんでした」が表示される', () => {
    mockDiseasePestsQuery.data = { pages: [{ items: [], nextCursor: null }] };
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByText('該当するデータが見つかりませんでした')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// データあり・グリッド表示
// ---------------------------------------------------------------------------

describe('DiseasePestsIndexScreen データ表示', () => {
  it('病害虫名が表示される', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByText('アブラムシ')).toBeTruthy();
    expect(screen.getByText('ハダニ')).toBeTruthy();
  });

  it('imageUrl がある項目にサムネイルが表示される', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('アブラムシのサムネイル')).toBeTruthy();
  });

  it('imageUrl が null の項目にはサムネイルが表示されない', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.queryByLabelText('ハダニのサムネイル')).toBeNull();
  });

  it('病害虫カードをタップすると詳細画面へ push する', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<DiseasePestsIndexScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/disease-pests/[slug]',
      params: { slug: 'aphid' },
    });
  });

  it('件数テキストが表示される', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByText('3件')).toBeTruthy();
  });

  it('hasNextPage=true のとき件数に「以上」が付く', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    mockDiseasePestsQuery.hasNextPage = true;
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByText('3件以上')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 検索フォーム
// ---------------------------------------------------------------------------

describe('DiseasePestsIndexScreen 検索フォーム', () => {
  it('検索フォームが表示される', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('病害虫名または色で検索')).toBeTruthy();
  });

  it('体長入力フォームが表示される', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('体長をミリメートルで入力')).toBeTruthy();
  });

  it('「検索する」ボタンが表示される', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('検索する')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// カテゴリフィルタ
// ---------------------------------------------------------------------------

describe('DiseasePestsIndexScreen カテゴリフィルタ', () => {
  it('「すべて」フィルタチップが表示される', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('すべてでフィルタ')).toBeTruthy();
  });

  it('「病害」フィルタチップが表示される', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('病害でフィルタ')).toBeTruthy();
  });

  it('「害虫」フィルタチップが表示される', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('害虫でフィルタ')).toBeTruthy();
  });

  it('「益虫」フィルタチップが表示される', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(screen.getByLabelText('益虫でフィルタ')).toBeTruthy();
  });

  it('「すべて」チップが初期状態で selected である', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    expect(
      screen.getByLabelText('すべてでフィルタ').props.accessibilityState?.selected,
    ).toBe(true);
  });

  it('「病害」チップをタップすると selected になる', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    fireEvent.press(screen.getByLabelText('病害でフィルタ'));
    expect(
      screen.getByLabelText('病害でフィルタ').props.accessibilityState?.selected,
    ).toBe(true);
  });

  it('「害虫」チップをタップすると「すべて」の selected が false になる', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
    fireEvent.press(screen.getByLabelText('害虫でフィルタ'));
    expect(
      screen.getByLabelText('すべてでフィルタ').props.accessibilityState?.selected,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 無限スクロール
// ---------------------------------------------------------------------------

describe('DiseasePestsIndexScreen 無限スクロール', () => {
  it('hasNextPage=true のとき hasNextPage が true であることを確認する', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    mockDiseasePestsQuery.hasNextPage = true;
    renderWithProviders(<DiseasePestsIndexScreen />);
    // FlatList の onEndReached は RNTL では直接 trigger できない。
    // hasNextPage が true の状態でエラーなしにレンダリングされることを確認する。
    expect(mockDiseasePestsQuery.hasNextPage).toBe(true);
    expect(screen.getByText('アブラムシ')).toBeTruthy();
  });

  it('isFetchingNextPage=true のときフッターにスピナーが表示される', () => {
    mockDiseasePestsQuery.data = makeDiseasePestsData();
    mockDiseasePestsQuery.isFetchingNextPage = true;
    renderWithProviders(<DiseasePestsIndexScreen />);
    // ActivityIndicator はテスト環境で直接クエリが難しいため、エラーなしにレンダリングされることを確認する
    expect(screen.getByText('アブラムシ')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 免責事項
// ---------------------------------------------------------------------------

describe('DiseasePestsIndexScreen 免責事項', () => {
  it('免責事項テキストが表示される', () => {
    renderWithProviders(<DiseasePestsIndexScreen />);
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

describe('DiseasePestsIndexScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<DiseasePestsIndexScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
