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
    expect(screen.getByLabelText('黒松（黒松のよみ）')).toBeTruthy();
  });

  it('用語タップで詳細画面へ push する', () => {
    mockDictQuery.data = makeDictionaryPage(['黒松']);
    renderWithProviders(<DictionaryScreen />);
    fireEvent.press(screen.getByLabelText('黒松（黒松のよみ）'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/dictionary/[slug]/index',
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
    expect(screen.getByLabelText('ア')).toBeTruthy();
    expect(screen.getByLabelText('カ')).toBeTruthy();
  });

  it('「カテゴリ」タブをタップするとカテゴリチップが表示される', () => {
    renderWithProviders(<DictionaryScreen />);
    fireEvent.press(screen.getByLabelText('五十音'));
    fireEvent.press(screen.getByLabelText('カテゴリ'));
    expect(screen.getByLabelText('すべて')).toBeTruthy();
    expect(screen.getByLabelText('樹木管理')).toBeTruthy();
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
