/**
 * @module hooks/use-debounce
 * 値の変化を指定時間遅延させるデバウンスフック。
 * 検索入力の日本語 IME ラグを考慮し、DEBOUNCE_SEARCH_MS（300ms）での使用を想定する。
 */

import { useState, useEffect } from 'react';

/**
 * value の変化を delayMs ミリ秒遅延して返す。
 * 空文字への変化（クリア操作）も遅延対象だが、呼び出し側で空チェックをして
 * API リクエストを抑制することを推奨する（search-screen.md §3.4）。
 *
 * @param value   - デバウンス対象の値
 * @param delayMs - 遅延時間（ms）。DEBOUNCE_SEARCH_MS 定数を使用すること
 * @returns       - delayMs 経過後に更新される遅延値
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
