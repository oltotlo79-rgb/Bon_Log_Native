/**
 * @module __tests__/app/(tabs)/search-recent-searches
 * 検索画面の「最近の検索」パネル統合テスト。
 * フォーカス中・未入力・履歴ありの時だけパネルが表示されること、
 * 検索実行・履歴タップで履歴に追加されることを検証する。
 * モック境界は他の search 系テストと同じ（lib/queries/search・auth・posts）。
 * AsyncStorage は __tests__/setup.ts の一元モック（公式 jest モック）を使用する。
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, fireEvent, act } from '@testing-library/react-native';
import SearchScreen from '@/app/(tabs)/search/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { STORAGE_KEY_RECENT_SEARCHES } from '@/lib/constants/async-storage-keys';

// ---------------------------------------------------------------------------
// モック設定（他の search 系テストと同一方針）
// ---------------------------------------------------------------------------

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

jest.mock('@/lib/queries/posts', () => ({
  useToggleRepostMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useVotePollMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useUserPostsQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
}));

const mockUseSearchPostsQuery = jest.fn();
const mockUseSearchUsersQuery = jest.fn();

jest.mock('@/lib/queries/search', () => ({
  useSearchPostsQuery: (_q: string, _filter?: unknown) => mockUseSearchPostsQuery(),
  useSearchUsersQuery: (_q: string) => mockUseSearchUsersQuery(),
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

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/**
 * 初回マウント時に useRecentSearches が発行する AsyncStorage 読み込みの
 * Promise チェーン（get → readRecentSearches → AsyncStorage.getItem → multiGet の
 * 4 段）を確実に完了させてから返す。以降のテストで add() 等を行っても、
 * 初回読み込みの遅延解決によって searches state が後から上書きされるのを防ぐ。
 */
async function renderScreen() {
  const view = renderWithProviders(<SearchScreen />);
  await act(async () => {
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
  });
  return view;
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockUseSearchPostsQuery.mockReturnValue(emptyInfiniteState);
  mockUseSearchUsersQuery.mockReturnValue(emptyInfiniteState);
  await AsyncStorage.clear();
});

// ---------------------------------------------------------------------------
// パネル表示条件（フォーカス中 && 未入力 && 履歴あり）
// ---------------------------------------------------------------------------

describe('SearchScreen 最近の検索パネル: 表示条件', () => {
  it('フォーカスしていなければ履歴があってもパネルは表示されない', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松']));
    await renderScreen();
    expect(screen.queryByText('最近の検索')).toBeNull();
  });

  it('フォーカス中かつ未入力かつ履歴ありのときパネルが表示される', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松', '五葉松']));
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.getByText('最近の検索')).toBeTruthy();
    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.getByText('五葉松')).toBeTruthy();
  });

  it('フォーカス中でも履歴が空のときパネルは表示されず初期案内のままになる', async () => {
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.queryByText('最近の検索')).toBeNull();
    expect(screen.getByText('検索してみましょう')).toBeTruthy();
  });

  it('フォーカス中でも入力があるときパネルは表示されない', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松']));
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.getByText('最近の検索')).toBeTruthy();

    fireEvent.changeText(searchInput, 'も');
    expect(screen.queryByText('最近の検索')).toBeNull();
  });

  it('ブラーするとパネルが非表示になる', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松']));
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.getByText('最近の検索')).toBeTruthy();

    fireEvent(searchInput, 'blur');
    expect(screen.queryByText('最近の検索')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 検索実行での履歴追加
// ---------------------------------------------------------------------------

describe('SearchScreen 検索実行での履歴追加', () => {
  it('検索バーで送信すると AsyncStorage に永続化される', async () => {
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent.changeText(searchInput, '黒松');
    fireEvent(searchInput, 'submitEditing');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY_RECENT_SEARCHES,
      JSON.stringify(['黒松'])
    );
  });

  it('検索実行後に再フォーカスするとパネルに検索語が表示される', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['桜']));
    await renderScreen();
    const searchInput = screen.getByRole('search');

    // 履歴読み込み済みであることを既存の桜を表示させて確認してから新規追加する
    fireEvent(searchInput, 'focus');
    expect(screen.getByText('桜')).toBeTruthy();
    fireEvent(searchInput, 'blur');

    fireEvent.changeText(searchInput, '黒松');
    fireEvent(searchInput, 'submitEditing');
    fireEvent(searchInput, 'blur');
    fireEvent.changeText(searchInput, '');
    fireEvent(searchInput, 'focus');

    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.getByText('桜')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 履歴タップでの再検索
// ---------------------------------------------------------------------------

describe('SearchScreen 履歴タップでの再検索', () => {
  it('履歴タップで該当語が入力欄にセットされる', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松']));
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.getByText('最近の検索')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '黒松で検索' }));
    expect(searchInput.props.value).toBe('黒松');
  });

  it('履歴タップでも add され、タップした語が先頭に来る', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松', '五葉松']));
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.getByText('最近の検索')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '五葉松で検索' }));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY_RECENT_SEARCHES,
      JSON.stringify(['五葉松', '黒松'])
    );
  });
});

// ---------------------------------------------------------------------------
// 履歴の個別削除・全削除
// ---------------------------------------------------------------------------

describe('SearchScreen 最近の検索パネル: 削除操作', () => {
  it('個別削除ボタンで該当履歴のみ消える', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松', '五葉松']));
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.getByText('最近の検索')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '黒松の履歴を削除' }));
    expect(screen.queryByText('黒松')).toBeNull();
    expect(screen.getByText('五葉松')).toBeTruthy();
  });

  it('「すべて削除」ボタンで履歴がすべて消え初期案内に戻る', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松', '五葉松']));
    await renderScreen();
    const searchInput = screen.getByRole('search');
    fireEvent(searchInput, 'focus');
    expect(screen.getByText('最近の検索')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '検索履歴をすべて削除' }));
    expect(screen.queryByText('最近の検索')).toBeNull();
    expect(screen.getByText('検索してみましょう')).toBeTruthy();
  });
});
