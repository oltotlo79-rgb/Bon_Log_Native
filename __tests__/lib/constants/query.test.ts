/**
 * lib/constants/query の定数値のユニットテスト。
 * 値の妥当性（誤設定で UX が壊れるレベルの閾値）を守る。
 */

import {
  STALE_TIME_REALTIME,
  STALE_TIME_STANDARD,
  STALE_TIME_MASTER,
  STALE_TIME_SEARCH,
  GC_TIME,
  RETRY_COUNT,
  RETRY_DELAY_BASE_MS,
  REQUEST_TIMEOUT_MS,
  UNREAD_COUNT_REFETCH_INTERVAL_MS,
} from '@/lib/constants/query';

describe('staleTime', () => {
  it('STALE_TIME_REALTIME は正の値', () => {
    expect(STALE_TIME_REALTIME).toBeGreaterThan(0);
  });

  it('STALE_TIME_STANDARD は正の値', () => {
    expect(STALE_TIME_STANDARD).toBeGreaterThan(0);
  });

  it('STALE_TIME_MASTER は正の値', () => {
    expect(STALE_TIME_MASTER).toBeGreaterThan(0);
  });

  it('STALE_TIME_SEARCH は正の値', () => {
    expect(STALE_TIME_SEARCH).toBeGreaterThan(0);
  });

  it('鮮度の順序: REALTIME < SEARCH < STANDARD < MASTER', () => {
    expect(STALE_TIME_REALTIME).toBeLessThan(STALE_TIME_SEARCH);
    expect(STALE_TIME_SEARCH).toBeLessThan(STALE_TIME_STANDARD);
    expect(STALE_TIME_STANDARD).toBeLessThan(STALE_TIME_MASTER);
  });

  it('STALE_TIME_REALTIME は 60秒以内（フィード・通知の鮮度要件）', () => {
    expect(STALE_TIME_REALTIME).toBeLessThanOrEqual(60 * 1000);
  });

  it('STALE_TIME_MASTER は 10分以上（マスタ系の再取得抑制）', () => {
    expect(STALE_TIME_MASTER).toBeGreaterThanOrEqual(10 * 60 * 1000);
  });
});

describe('gcTime', () => {
  it('GC_TIME は正の値', () => {
    expect(GC_TIME).toBeGreaterThan(0);
  });

  it('GC_TIME は staleTime より長い（inactive になったキャッシュをすぐ捨てない）', () => {
    expect(GC_TIME).toBeGreaterThan(STALE_TIME_STANDARD);
  });
});

describe('retry', () => {
  it('RETRY_COUNT は 0 より大きい', () => {
    expect(RETRY_COUNT).toBeGreaterThan(0);
  });

  it('RETRY_COUNT は過大でない（連打防止: 5 以下）', () => {
    expect(RETRY_COUNT).toBeLessThanOrEqual(5);
  });

  it('RETRY_DELAY_BASE_MS は正の値', () => {
    expect(RETRY_DELAY_BASE_MS).toBeGreaterThan(0);
  });
});

describe('timeout', () => {
  it('REQUEST_TIMEOUT_MS は正の値', () => {
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('REQUEST_TIMEOUT_MS は 3秒以上（モバイル回線の考慮）', () => {
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(3 * 1000);
  });

  it('REQUEST_TIMEOUT_MS は 30秒以内（UX 配慮）', () => {
    expect(REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(30 * 1000);
  });
});

describe('refetch interval', () => {
  it('UNREAD_COUNT_REFETCH_INTERVAL_MS は正の値', () => {
    expect(UNREAD_COUNT_REFETCH_INTERVAL_MS).toBeGreaterThan(0);
  });

  it('UNREAD_COUNT_REFETCH_INTERVAL_MS は 10秒以上（頻繁すぎる連打防止）', () => {
    expect(UNREAD_COUNT_REFETCH_INTERVAL_MS).toBeGreaterThanOrEqual(10 * 1000);
  });

  it('UNREAD_COUNT_REFETCH_INTERVAL_MS は 60秒以内（通知の鮮度要件）', () => {
    expect(UNREAD_COUNT_REFETCH_INTERVAL_MS).toBeLessThanOrEqual(60 * 1000);
  });
});
