/**
 * @module __tests__/lib/constants/async-storage-keys
 * AsyncStorage キー定数のユニットテスト。
 * キーが定義されていること・空文字でないこと・意図しない衝突がないことを検証する。
 */

import { STORAGE_KEY_RECENT_SEARCHES } from '@/lib/constants/async-storage-keys';

describe('async-storage-keys', () => {
  it('STORAGE_KEY_RECENT_SEARCHES が定義されている', () => {
    expect(STORAGE_KEY_RECENT_SEARCHES).toBeDefined();
    expect(typeof STORAGE_KEY_RECENT_SEARCHES).toBe('string');
  });

  it('STORAGE_KEY_RECENT_SEARCHES は空文字でない', () => {
    expect(STORAGE_KEY_RECENT_SEARCHES.length).toBeGreaterThan(0);
  });

  it('STORAGE_KEY_RECENT_SEARCHES は "bon_log_" プレフィックスを持つ（アプリ固有の名前空間）', () => {
    expect(STORAGE_KEY_RECENT_SEARCHES.startsWith('bon_log_')).toBe(true);
  });
});
