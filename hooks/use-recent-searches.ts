/**
 * @module hooks/use-recent-searches
 * 検索履歴（直近の検索クエリ）を AsyncStorage で永続化するフック。
 * cfw の components/search/SearchBar.tsx（localStorage 版）と同じ
 * 「先頭追加・重複除去・MAX_RECENT_SEARCHES で切り詰め」方針を、
 * 非同期ストレージ（AsyncStorage）向けに再現する。
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY_RECENT_SEARCHES } from '@/lib/constants/async-storage-keys';
import { MAX_RECENT_SEARCHES } from '@/lib/constants/limits';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === 'string');
}

/**
 * AsyncStorage から検索履歴配列を読み込む。
 * 破損データ・ストレージ未初期化・読込失敗はクラッシュさせず空配列に倒す
 * （cfw SearchBar の getRecentSearches と同方針）。
 */
async function readRecentSearches(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
    if (stored === null) return [];
    const parsed: unknown = JSON.parse(stored);
    return isStringArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRecentSearches(searches: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(searches));
  } catch {
    // 書き込み失敗（ストレージ容量超過等）はユーザー操作を阻害しないよう握りつぶす
  }
}

async function removeRecentSearchesStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
  } catch {
    // 上記 writeRecentSearches と同方針
  }
}

export type UseRecentSearchesResult = {
  /** 新しい順・最大 MAX_RECENT_SEARCHES 件の検索履歴 */
  searches: string[];
  /** AsyncStorage からの初回読み込みが完了したか */
  isLoaded: boolean;
  /** AsyncStorage から履歴を読み込み直す（マウント時に自動実行されるため、通常は手動で呼ぶ必要はない） */
  get: () => Promise<string[]>;
  /** 履歴の先頭に query を追加する（重複除去 + MAX_RECENT_SEARCHES で切り詰め） */
  add: (query: string) => void;
  /** 履歴から特定の 1 件を削除する */
  removeOne: (query: string) => void;
  /** 履歴を全消去する */
  clear: () => void;
};

/** 検索履歴の取得・追加・個別削除・全消去を提供するフック。 */
export function useRecentSearches(): UseRecentSearchesResult {
  const [searches, setSearches] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const get = useCallback(async () => {
    const loaded = await readRecentSearches();
    setSearches(loaded);
    setIsLoaded(true);
    return loaded;
  }, []);

  useEffect(() => {
    // AsyncStorage はマウント時に一度だけ読む外部ストレージであり、購読可能なストアではない。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void get();
  }, [get]);

  const add = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    setSearches((prev) => {
      const next = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
      void writeRecentSearches(next);
      return next;
    });
  }, []);

  const removeOne = useCallback((query: string) => {
    setSearches((prev) => {
      const next = prev.filter((item) => item !== query);
      void writeRecentSearches(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSearches([]);
    void removeRecentSearchesStorage();
  }, []);

  return { searches, isLoaded, get, add, removeOne, clear };
}
