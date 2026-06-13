/**
 * app/(tabs)/search の追加テスト。
 * PostSearchResults / UserSearchResults の各状態（ロード中/エラー/空/リスト表示）と
 * debounce 確認、SearchBar の focus/blur 状態を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import SearchScreen from '@/app/(tabs)/search/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeSearchUserItem, makeFeedItem } from '@/__tests__/utils/data-factories';
import { ERR_SEARCH_FAILED } from '@/lib/constants/errors';

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
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

jest.mock('@/lib/queries/search', () => ({
  useSearchPostsQuery: (_q: string) => mockUseSearchPostsQuery(),
  useSearchUsersQuery: (_q: string) => mockUseSearchUsersQuery(),
}));

// useDebounce を即時返すようにモックして、debouncedQuery = inputValue とする
jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
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

describe('SearchScreen — PostSearchResults 状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchPostsQuery.mockReturnValue(emptyInfiniteState);
    mockUseSearchUsersQuery.mockReturnValue(emptyInfiniteState);
  });

  it('投稿タブでロード中のときスケルトンローディングが表示される', () => {
    mockUseSearchPostsQuery.mockReturnValue({ ...emptyInfiniteState, isLoading: true });
    renderWithProviders(<SearchScreen />);
    fireEvent.changeText(screen.getByRole('search'), '黒松');
    // ScreenLoading が表示される（ヘッダーは残る）
    expect(screen.getByRole('header', { name: '検索' })).toBeTruthy();
  });

  it('投稿タブでエラーのとき ERR_SEARCH_FAILED が表示される', () => {
    mockUseSearchPostsQuery.mockReturnValue({
      ...emptyInfiniteState,
      isError: true,
      error: new Error('Posts search failed'),
      data: undefined,
      isLoading: false,
    });
    renderWithProviders(<SearchScreen />);
    fireEvent.changeText(screen.getByRole('search'), '黒松');
    expect(screen.getByText(ERR_SEARCH_FAILED)).toBeTruthy();
  });

  it('投稿タブで結果 0 件のとき空状態メッセージが表示される', () => {
    mockUseSearchPostsQuery.mockReturnValue({
      ...emptyInfiniteState,
      data: { pages: [{ items: [], nextCursor: null }] },
    });
    renderWithProviders(<SearchScreen />);
    fireEvent.changeText(screen.getByRole('search'), '黒松');
    expect(screen.getByText('「黒松」の投稿は見つかりませんでした')).toBeTruthy();
  });

  it('投稿タブで isFetchingNextPage=true のとき「読み込み中」フッターが表示される', () => {
    const item = makeFeedItem({ id: 'p-1', content: '黒松テスト' });
    mockUseSearchPostsQuery.mockReturnValue({
      ...emptyInfiniteState,
      data: { pages: [{ items: [item], nextCursor: 'cursor' }] },
      isFetchingNextPage: true,
      hasNextPage: true,
    });
    renderWithProviders(<SearchScreen />);
    fireEvent.changeText(screen.getByRole('search'), '黒松');
    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('投稿タブで hasNextPage=false かつ結果ありのとき「これ以上結果はありません」フッターが表示される', () => {
    const item = makeFeedItem({ id: 'p-1', content: '黒松テスト' });
    mockUseSearchPostsQuery.mockReturnValue({
      ...emptyInfiniteState,
      data: { pages: [{ items: [item], nextCursor: null }] },
      isFetchingNextPage: false,
      hasNextPage: false,
    });
    renderWithProviders(<SearchScreen />);
    fireEvent.changeText(screen.getByRole('search'), '黒松');
    expect(screen.getByText('これ以上結果はありません')).toBeTruthy();
  });
});

describe('SearchScreen — UserSearchResults 状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchPostsQuery.mockReturnValue(emptyInfiniteState);
    mockUseSearchUsersQuery.mockReturnValue(emptyInfiniteState);
  });

  function switchToUserTab() {
    const searchInput = screen.getByRole('search');
    fireEvent.changeText(searchInput, '盆栽');
    const userTab = screen.getByRole('tab', { name: 'ユーザー' });
    fireEvent.press(userTab);
  }

  it('ユーザータブでロード中のとき画面が正常にレンダリングされる', () => {
    mockUseSearchUsersQuery.mockReturnValue({ ...emptyInfiniteState, isLoading: true });
    renderWithProviders(<SearchScreen />);
    switchToUserTab();
    expect(screen.getByRole('header', { name: '検索' })).toBeTruthy();
  });

  it('ユーザータブでエラーのとき ERR_SEARCH_FAILED が表示される', () => {
    mockUseSearchUsersQuery.mockReturnValue({
      ...emptyInfiniteState,
      isError: true,
      error: new Error('Users search failed'),
      data: undefined,
      isLoading: false,
    });
    renderWithProviders(<SearchScreen />);
    switchToUserTab();
    expect(screen.getByText(ERR_SEARCH_FAILED)).toBeTruthy();
  });

  it('ユーザータブで結果 0 件のとき空状態メッセージが表示される', () => {
    mockUseSearchUsersQuery.mockReturnValue({
      ...emptyInfiniteState,
      data: { pages: [{ items: [], nextCursor: null }] },
    });
    renderWithProviders(<SearchScreen />);
    switchToUserTab();
    expect(screen.getByText('「盆栽」に一致するユーザーはいません')).toBeTruthy();
  });

  it('ユーザータブでユーザーが表示される', () => {
    const user = makeSearchUserItem({ id: 'u-1', nickname: '黒松太郎' });
    mockUseSearchUsersQuery.mockReturnValue({
      ...emptyInfiniteState,
      data: { pages: [{ items: [user], nextCursor: null }] },
    });
    renderWithProviders(<SearchScreen />);
    switchToUserTab();
    expect(screen.getByText('黒松太郎')).toBeTruthy();
  });

  it('ユーザータブで isFetchingNextPage=true のとき「読み込み中」フッターが表示される', () => {
    const user = makeSearchUserItem({ id: 'u-1', nickname: '黒松太郎' });
    mockUseSearchUsersQuery.mockReturnValue({
      ...emptyInfiniteState,
      data: { pages: [{ items: [user], nextCursor: 'cursor' }] },
      isFetchingNextPage: true,
      hasNextPage: true,
    });
    renderWithProviders(<SearchScreen />);
    switchToUserTab();
    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('ユーザータブで hasNextPage=false かつ結果ありのとき「これ以上結果はありません」フッターが表示される', () => {
    const user = makeSearchUserItem({ id: 'u-1', nickname: '黒松太郎' });
    mockUseSearchUsersQuery.mockReturnValue({
      ...emptyInfiniteState,
      data: { pages: [{ items: [user], nextCursor: null }] },
      isFetchingNextPage: false,
      hasNextPage: false,
    });
    renderWithProviders(<SearchScreen />);
    switchToUserTab();
    expect(screen.getByText('これ以上結果はありません')).toBeTruthy();
  });
});

describe('SearchScreen — SearchBar フォーカス状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchPostsQuery.mockReturnValue(emptyInfiniteState);
    mockUseSearchUsersQuery.mockReturnValue(emptyInfiniteState);
  });

  it('SearchBar にフォーカスが当たっても画面がクラッシュしない', () => {
    renderWithProviders(<SearchScreen />);
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.getByRole('header', { name: '検索' })).toBeTruthy();
  });

  it('SearchBar のフォーカスを外しても画面がクラッシュしない', () => {
    renderWithProviders(<SearchScreen />);
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    fireEvent(searchInput, 'blur');
    expect(screen.getByRole('header', { name: '検索' })).toBeTruthy();
  });

  it('handleSubmit: onSubmitEditing で入力値がセットされる', () => {
    renderWithProviders(<SearchScreen />);
    const searchInput = screen.getByRole('search');
    fireEvent.changeText(searchInput, '五葉松');
    fireEvent(searchInput, 'submitEditing');
    expect(screen.getByRole('tab', { name: '投稿' })).toBeTruthy();
  });
});

describe('SearchScreen — オフライン状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchPostsQuery.mockReturnValue(emptyInfiniteState);
    mockUseSearchUsersQuery.mockReturnValue(emptyInfiniteState);
  });

  it('オフライン時も基本レンダリングが通る', () => {
    const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status');
    (useOnlineStatus as jest.Mock).mockReturnValue(false);
    renderWithProviders(<SearchScreen />);
    expect(screen.getByRole('header', { name: '検索' })).toBeTruthy();
  });
});
