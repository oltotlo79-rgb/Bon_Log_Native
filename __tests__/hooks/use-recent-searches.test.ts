/**
 * @module __tests__/hooks/use-recent-searches
 * useRecentSearches フックのユニットテスト。
 * AsyncStorage 永続化（追加時の重複除去・MAX_RECENT_SEARCHES 切り詰め・個別削除・全消去・
 * 読込失敗時のサイレント空配列フォールバック）を検証する。
 * モック境界: @react-native-async-storage/async-storage（__tests__/setup.ts の一元モック）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { STORAGE_KEY_RECENT_SEARCHES } from '@/lib/constants/async-storage-keys';
import { MAX_RECENT_SEARCHES } from '@/lib/constants/limits';

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** 初回の AsyncStorage 読み込み完了（isLoaded=true）まで待ってから返す。 */
async function renderLoaded() {
  const view = renderHook(() => useRecentSearches());
  await waitFor(() => expect(view.result.current.isLoaded).toBe(true));
  return view;
}

// ---------------------------------------------------------------------------
// 初回読み込み
// ---------------------------------------------------------------------------

describe('useRecentSearches: 初回読み込み', () => {
  it('AsyncStorage が空のとき searches=[] かつ isLoaded=true になる', async () => {
    const { result } = await renderLoaded();
    expect(result.current.searches).toEqual([]);
  });

  it('AsyncStorage に保存済みの履歴があれば読み込まれる', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['黒松', '五葉松']));
    const { result } = await renderLoaded();
    expect(result.current.searches).toEqual(['黒松', '五葉松']);
  });

  it('保存データが不正な JSON のとき空配列にフォールバックする', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, '{not-json');
    const { result } = await renderLoaded();
    expect(result.current.searches).toEqual([]);
  });

  it('保存データが文字列配列でない（数値配列）とき空配列にフォールバックする', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify([1, 2, 3]));
    const { result } = await renderLoaded();
    expect(result.current.searches).toEqual([]);
  });

  it('保存データがオブジェクトのとき空配列にフォールバックする', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify({ foo: 'bar' }));
    const { result } = await renderLoaded();
    expect(result.current.searches).toEqual([]);
  });

  it('AsyncStorage.getItem が例外を投げても空配列にフォールバックする（サイレント失敗）', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderLoaded();
    expect(result.current.searches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// get（手動再読み込み）
// ---------------------------------------------------------------------------

describe('useRecentSearches: get', () => {
  it('get() を呼ぶと AsyncStorage から再読み込みして返し、state も更新する', async () => {
    const { result } = await renderLoaded();
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(['外部で更新']));

    let loaded: string[] = [];
    await act(async () => {
      loaded = await result.current.get();
    });

    expect(loaded).toEqual(['外部で更新']);
    expect(result.current.searches).toEqual(['外部で更新']);
  });
});

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------

describe('useRecentSearches: add', () => {
  it('検索語が先頭に追加される', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('黒松');
    });
    expect(result.current.searches).toEqual(['黒松']);
  });

  it('前後の空白を除去してから保存する', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('  黒松  ');
    });
    expect(result.current.searches).toEqual(['黒松']);
  });

  it('空文字は追加されない', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('');
    });
    expect(result.current.searches).toEqual([]);
  });

  it('空白のみの文字列は追加されない', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('   ');
    });
    expect(result.current.searches).toEqual([]);
  });

  it('重複する検索語は先頭へ移動し、重複登録されない', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('黒松');
      result.current.add('五葉松');
      result.current.add('黒松');
    });
    expect(result.current.searches).toEqual(['黒松', '五葉松']);
  });

  it(`MAX_RECENT_SEARCHES件（${MAX_RECENT_SEARCHES}）を超えると古いものから切り詰められる`, async () => {
    const { result } = await renderLoaded();
    act(() => {
      for (let i = 0; i < MAX_RECENT_SEARCHES + 3; i += 1) {
        result.current.add(`検索${i}`);
      }
    });
    expect(result.current.searches).toHaveLength(MAX_RECENT_SEARCHES);
    expect(result.current.searches[0]).toBe(`検索${MAX_RECENT_SEARCHES + 2}`);
    expect(result.current.searches).not.toContain('検索0');
    expect(result.current.searches).not.toContain('検索1');
    expect(result.current.searches).not.toContain('検索2');
  });

  it('ちょうど MAX_RECENT_SEARCHES 件までは切り詰められない', async () => {
    const { result } = await renderLoaded();
    act(() => {
      for (let i = 0; i < MAX_RECENT_SEARCHES; i += 1) {
        result.current.add(`検索${i}`);
      }
    });
    expect(result.current.searches).toHaveLength(MAX_RECENT_SEARCHES);
    expect(result.current.searches).toContain('検索0');
  });

  it('add すると AsyncStorage に永続化される', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('黒松');
    });
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY_RECENT_SEARCHES,
        JSON.stringify(['黒松'])
      );
    });
  });
});

// ---------------------------------------------------------------------------
// removeOne
// ---------------------------------------------------------------------------

describe('useRecentSearches: removeOne', () => {
  it('指定した検索語のみ削除される', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('黒松');
      result.current.add('五葉松');
    });
    act(() => {
      result.current.removeOne('黒松');
    });
    expect(result.current.searches).toEqual(['五葉松']);
  });

  it('存在しない検索語を指定しても変化しない', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('黒松');
    });
    act(() => {
      result.current.removeOne('存在しない検索語');
    });
    expect(result.current.searches).toEqual(['黒松']);
  });

  it('removeOne 後の状態が AsyncStorage に永続化される', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('黒松');
      result.current.add('五葉松');
    });
    act(() => {
      result.current.removeOne('黒松');
    });
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY_RECENT_SEARCHES,
        JSON.stringify(['五葉松'])
      );
    });
  });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------

describe('useRecentSearches: clear', () => {
  it('履歴を全消去する', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('黒松');
      result.current.add('五葉松');
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.searches).toEqual([]);
  });

  it('clear すると AsyncStorage のキーが削除される', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.add('黒松');
    });
    act(() => {
      result.current.clear();
    });
    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY_RECENT_SEARCHES);
    });
  });
});
