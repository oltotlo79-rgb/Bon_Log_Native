/**
 * app/dictionary/index のコンポーネントテスト。
 * 検索・フィルタ・無限スクロール・空状態・エラー・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import DictionaryScreen from '@/app/dictionary/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockDictQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/dictionary', () => ({
  useDictionaryListQuery: () => mockDictQuery,
  useDictionaryDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeDictionaryPage(terms: string[], nextCursor: string | null = null) {
  return {
    pages: [
      {
        items: terms.map((term, i) => ({
          id: `d${i}`,
          slug: term.toLowerCase(),
          term,
          reading: `${term}のよみ`,
          category: '樹木管理',
          shortDefinition: '説明',
        })),
        nextCursor,
      },
    ],
  };
}

/** よみがなを明示的に指定できるファクトリ */
function makeDictionaryPageWithReadings(
  items: Array<{ term: string; reading: string; category?: string }>,
  nextCursor: string | null = null,
) {
  return {
    pages: [
      {
        items: items.map((item, i) => ({
          id: `d${i}`,
          slug: item.term.toLowerCase(),
          term: item.term,
          reading: item.reading,
          category: item.category ?? '樹形',
          shortDefinition: '説明',
        })),
        nextCursor,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockUseOnlineStatus.mockReturnValue(true);
  mockDictQuery.data = undefined;
  mockDictQuery.isLoading = false;
  mockDictQuery.isError = false;
  mockDictQuery.fetchNextPage = jest.fn();
  mockDictQuery.hasNextPage = false;
  mockDictQuery.isFetchingNextPage = false;
  mockDictQuery.refetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('DictionaryScreen 正常表示', () => {
  it('用語一覧が表示される', () => {
    mockDictQuery.data = makeDictionaryPage(['黒松', '五葉松', '欅']);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.getByText('五葉松')).toBeTruthy();
    expect(screen.getByText('欅')).toBeTruthy();
  });

  it('各用語の accessibilityLabel が設定される', () => {
    mockDictQuery.data = makeDictionaryPage(['黒松']);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByLabelText('黒松（黒松のよみ）- 樹木管理')).toBeTruthy();
  });

  it('用語タップで詳細画面へ push する', () => {
    mockDictQuery.data = makeDictionaryPage(['黒松']);
    renderWithProviders(<DictionaryScreen />);
    fireEvent.press(screen.getByLabelText('黒松（黒松のよみ）- 樹木管理'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/dictionary/[slug]',
      params: { slug: '黒松' },
    });
  });
});

// ---------------------------------------------------------------------------
// 検索
// ---------------------------------------------------------------------------

describe('DictionaryScreen 検索', () => {
  it('検索バーが表示される', () => {
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByLabelText('用語を検索')).toBeTruthy();
  });

  it('検索テキストを入力できる', () => {
    renderWithProviders(<DictionaryScreen />);
    const input = screen.getByLabelText('用語を検索');
    fireEvent.changeText(input, '松');
    expect(input.props.value).toBe('松');
  });
});

// ---------------------------------------------------------------------------
// フィルタ
// ---------------------------------------------------------------------------

describe('DictionaryScreen フィルタ', () => {
  it('カテゴリタブが表示される', () => {
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByLabelText('カテゴリ')).toBeTruthy();
  });

  it('五十音タブが表示される', () => {
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByLabelText('五十音')).toBeTruthy();
  });

  it('「五十音」タブをタップすると五十音チップが表示される', () => {
    renderWithProviders(<DictionaryScreen />);
    fireEvent.press(screen.getByLabelText('五十音'));
    expect(screen.getByLabelText('あ行')).toBeTruthy();
    expect(screen.getByLabelText('か行')).toBeTruthy();
  });

  it('「カテゴリ」タブをタップするとカテゴリチップが表示される', () => {
    renderWithProviders(<DictionaryScreen />);
    fireEvent.press(screen.getByLabelText('五十音'));
    fireEvent.press(screen.getByLabelText('カテゴリ'));
    expect(screen.getByLabelText('すべて')).toBeTruthy();
    expect(screen.getByLabelText('樹形')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// SectionList 構造
// ---------------------------------------------------------------------------

describe('DictionaryScreen SectionList 構造', () => {
  it('バナー後にタイトル「盆栽用語辞典」が表示される', () => {
    mockDictQuery.data = makeDictionaryPage(['黒松']);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('盆栽用語辞典')).toBeTruthy();
  });

  it('取得件数が表示される', () => {
    mockDictQuery.data = makeDictionaryPageWithReadings([
      { term: '黒松', reading: 'くろまつ' },
      { term: '五葉松', reading: 'ごようまつ' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('2件')).toBeTruthy();
  });

  it('あ行のよみがなでか行のセクションヘッダが表示される', () => {
    mockDictQuery.data = makeDictionaryPageWithReadings([
      { term: '黒松', reading: 'くろまつ' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('か行')).toBeTruthy();
  });

  it('異なる行のよみがなを持つ用語が別セクションに分類される', () => {
    mockDictQuery.data = makeDictionaryPageWithReadings([
      { term: '黒松', reading: 'くろまつ' },
      { term: '赤松', reading: 'あかまつ' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('あ行')).toBeTruthy();
    expect(screen.getByText('か行')).toBeTruthy();
  });

  it('どの行にも該当しないよみがなは「その他」セクションに分類される', () => {
    mockDictQuery.data = makeDictionaryPageWithReadings([
      { term: '黒松', reading: '黒松のよみ' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('その他')).toBeTruthy();
  });

  it('1件のとき件数「1件」が表示される', () => {
    mockDictQuery.data = makeDictionaryPage(['黒松']);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('1件')).toBeTruthy();
  });

  it('hasNextPage=true かつ isFetchingNextPage=false でリスト末尾に到達すると fetchNextPage が呼ばれる', () => {
    mockDictQuery.data = makeDictionaryPage(['黒松']);
    mockDictQuery.hasNextPage = true;
    mockDictQuery.isFetchingNextPage = false;
    renderWithProviders(<DictionaryScreen />);
    // onEndReached はネイティブイベントのため直接呼び出してシミュレーション
    const sectionList = screen.UNSAFE_queryByType(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').SectionList,
    );
    sectionList?.props?.onEndReached?.();
    expect(mockDictQuery.fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('DictionaryScreen ローディング', () => {
  it('isLoading=true のとき検索バーが表示される', () => {
    mockDictQuery.isLoading = true;
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByLabelText('用語を検索')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('DictionaryScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockDictQuery.isError = true;
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('盆栽用語辞典を読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDictQuery.isError = true;
    renderWithProviders(<DictionaryScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDictQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('DictionaryScreen 空状態', () => {
  it('items が空のとき「用語がありません」が表示される', () => {
    mockDictQuery.data = { pages: [{ items: [], nextCursor: null }] };
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('用語がありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('DictionaryScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<DictionaryScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
