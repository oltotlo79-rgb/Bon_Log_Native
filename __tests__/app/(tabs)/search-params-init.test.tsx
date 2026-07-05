/**
 * @module __tests__/app/(tabs)/search-params-init
 * 検索画面の q / genre 初期化パラメータのテスト。
 * 投稿本文の #タグ タップ（routeSearchByQuery）やジャンルタグのタップ
 * （routeSearchByGenre）からの遷移で useLocalSearchParams の q / genre を
 * 初期値として受け取る挙動（firstStringParam による string | string[] | undefined の絞り込み含む）を検証する。
 * モック境界: expo-router useLocalSearchParams / useSearchPostsQuery / useSearchUsersQuery / useGenresQuery
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import SearchScreen from '@/app/(tabs)/search/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import type { SearchPostsFilter } from '@/lib/queries/keys';

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: jest.fn(() => ({
    data: { id: 'test-user-id' },
    isLoading: false,
    isError: false,
  })),
}));

const mockUseSearchPostsQuery = jest.fn();
const mockUseSearchUsersQuery = jest.fn();
const mockUseSearchHashtagsQuery = jest.fn();
const mockUseGenresQuery = jest.fn();

jest.mock('@/lib/queries/search', () => ({
  useSearchPostsQuery: (q: string, filter?: SearchPostsFilter) =>
    mockUseSearchPostsQuery(q, filter),
  useSearchUsersQuery: (q: string) => mockUseSearchUsersQuery(q),
  useSearchHashtagsQuery: (q: string, limit?: number) =>
    mockUseSearchHashtagsQuery(q, limit),
}));

jest.mock('@/lib/queries/shops', () => ({
  useGenresQuery: (...args: unknown[]) => mockUseGenresQuery(...args),
}));

const emptyInfiniteState = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

const emptyHashtagState = {
  data: { items: [] },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

const emptyGenreState = {
  data: { items: [] },
  isLoading: false,
  isError: false,
};

function mockSearchParams(params: Record<string, string | string[] | undefined>) {
  const { useLocalSearchParams } = jest.requireMock('expo-router') as {
    useLocalSearchParams: jest.Mock;
  };
  useLocalSearchParams.mockReturnValue(params);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSearchPostsQuery.mockReturnValue(emptyInfiniteState);
  mockUseSearchUsersQuery.mockReturnValue(emptyInfiniteState);
  mockUseSearchHashtagsQuery.mockReturnValue(emptyHashtagState);
  mockUseGenresQuery.mockReturnValue(emptyGenreState);
  mockSearchParams({});
});

describe('SearchScreen — q パラメータ初期化', () => {
  it('q パラメータがあると検索バーに初期値として反映される', () => {
    mockSearchParams({ q: '黒松' });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByRole('search').props.value).toBe('黒松');
  });

  it('q パラメータがあると初期案内画面（検索してみましょう）を経由せず結果表示になる', () => {
    mockSearchParams({ q: '黒松' });
    renderWithProviders(<SearchScreen />);
    expect(screen.queryByText('検索してみましょう')).toBeNull();
    expect(screen.getByRole('tab', { name: '投稿' })).toBeTruthy();
  });

  it('q パラメータが useSearchPostsQuery へそのまま渡される', () => {
    mockSearchParams({ q: '黒松' });
    renderWithProviders(<SearchScreen />);
    expect(mockUseSearchPostsQuery).toHaveBeenCalledWith('黒松', {});
  });

  it('q パラメータが string[] のとき先頭要素を初期値として使う（firstStringParam）', () => {
    mockSearchParams({ q: ['五葉松', '黒松'] });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByRole('search').props.value).toBe('五葉松');
  });

  it('q パラメータがないとき初期案内画面が表示される（回帰確認）', () => {
    mockSearchParams({});
    renderWithProviders(<SearchScreen />);
    expect(screen.getByText('検索してみましょう')).toBeTruthy();
  });
});

describe('SearchScreen — genre パラメータ初期化', () => {
  it('genre パラメータがあるとジャンルフィルタが初期適用される（投稿タブへ直接着地）', () => {
    mockSearchParams({ genre: 'genre-1' });
    renderWithProviders(<SearchScreen />);
    expect(screen.queryByText('検索してみましょう')).toBeNull();
    expect(mockUseSearchPostsQuery).toHaveBeenCalledWith('', { genreId: 'genre-1' });
  });

  it('genre パラメータがあるとき詳細フィルターパネルが開いた状態で表示される', () => {
    mockSearchParams({ genre: 'genre-1' });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByRole('button', { name: '詳細フィルターを閉じる' })).toBeTruthy();
  });

  it('genre パラメータが string[] のとき先頭要素を初期ジャンルとして使う（firstStringParam）', () => {
    mockSearchParams({ genre: ['genre-2', 'genre-1'] });
    renderWithProviders(<SearchScreen />);
    expect(mockUseSearchPostsQuery).toHaveBeenCalledWith('', { genreId: 'genre-2' });
  });

  it('genre パラメータが空文字のときフィルタは適用されない（初期案内画面のまま）', () => {
    mockSearchParams({ genre: '' });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByText('検索してみましょう')).toBeTruthy();
  });
});

describe('SearchScreen — q と genre の同時初期化', () => {
  it('q と genre が両方あるとき両方が初期状態に反映される', () => {
    mockSearchParams({ q: '黒松', genre: 'genre-1' });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByRole('search').props.value).toBe('黒松');
    expect(mockUseSearchPostsQuery).toHaveBeenCalledWith('黒松', { genreId: 'genre-1' });
  });
});
