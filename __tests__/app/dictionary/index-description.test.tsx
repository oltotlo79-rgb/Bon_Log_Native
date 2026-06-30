/**
 * app/dictionary/index の description 表示テスト。
 * DictionaryListResponse の description フィールドが DictionaryTermCard に渡り
 * カード上に説明文が表示されることを検証する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
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

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeDictionaryPageWithDescription(
  items: Array<{ term: string; reading: string; description: string; category?: string }>,
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
          description: item.description,
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
// description 表示テスト
// ---------------------------------------------------------------------------

describe('DictionaryScreen description 表示', () => {
  it('description がカードに表示される', () => {
    mockDictQuery.data = makeDictionaryPageWithDescription([
      { term: '黒松', reading: 'くろまつ', description: '松柏類を代表する樹木。' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('松柏類を代表する樹木。')).toBeTruthy();
  });

  it('複数カードの description がそれぞれ表示される', () => {
    mockDictQuery.data = makeDictionaryPageWithDescription([
      { term: '黒松', reading: 'くろまつ', description: '松柏類を代表する樹木。' },
      { term: '五葉松', reading: 'ごようまつ', description: '葉が5本一束になる松。' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('松柏類を代表する樹木。')).toBeTruthy();
    expect(screen.getByText('葉が5本一束になる松。')).toBeTruthy();
  });

  it('description が空文字の場合は説明文が表示されない', () => {
    mockDictQuery.data = makeDictionaryPageWithDescription([
      { term: '黒松', reading: 'くろまつ', description: '' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    // 用語名は表示されるが、説明文は空なので表示されない
    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.queryByText('')).toBeNull();
  });

  it('description が長い場合も表示される', () => {
    const longDesc = '黒松（くろまつ）は松柏類を代表する常緑針葉樹で、日本各地の海岸沿いに自生する。盆栽においては雄大な樹格を表現しやすく、最も人気のある樹種の一つである。';
    mockDictQuery.data = makeDictionaryPageWithDescription([
      { term: '黒松', reading: 'くろまつ', description: longDesc },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText(longDesc)).toBeTruthy();
  });

  it('同一カードに用語名と description がともに表示される', () => {
    mockDictQuery.data = makeDictionaryPageWithDescription([
      { term: '盆器', reading: 'ぼんき', description: '盆栽を植え付ける器のこと。', category: '盆器・鉢' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('盆器')).toBeTruthy();
    expect(screen.getByText('盆栽を植え付ける器のこと。')).toBeTruthy();
  });

  it('カテゴリの異なる複数カードの description が表示される', () => {
    mockDictQuery.data = makeDictionaryPageWithDescription([
      { term: '盆器', reading: 'ぼんき', description: '盆栽用の器。', category: '盆器・鉢' },
      { term: '剪定', reading: 'せんてい', description: '樹木の枝を切り整える技法。', category: '技術・作業' },
    ]);
    renderWithProviders(<DictionaryScreen />);
    expect(screen.getByText('盆栽用の器。')).toBeTruthy();
    expect(screen.getByText('樹木の枝を切り整える技法。')).toBeTruthy();
  });
});
