/**
 * @module lib/queries/query-client
 * アプリ全体で使う QueryClient のファクトリ。
 * Provider の配線は frontend (app/_layout.tsx) が行う。
 */

import { QueryClient } from '@tanstack/react-query';
import {
  STALE_TIME_STANDARD,
  GC_TIME,
  RETRY_COUNT,
  RETRY_DELAY_BASE_MS,
} from '@/lib/constants/query';
import { isApiError } from '@/lib/api/errors';

/**
 * 4xx は仕様上リトライしない。
 * 5xx・ネットワークエラーは RETRY_COUNT 回までリトライする。
 * ApiError を使い型安全に判定する。
 */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= RETRY_COUNT) return false;

  if (isApiError(error) && error.status >= 400 && error.status < 500) {
    return false;
  }

  return true;
}

/** QueryClient のリトライ遅延（指数バックオフ）。 */
function retryDelay(attempt: number): number {
  return RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
}

/**
 * アプリで使う QueryClient を生成して返す。
 * エントリポイントごとに 1 回呼び出す（テストでは毎ケースごとに新規生成する）。
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_STANDARD,
        gcTime: GC_TIME,
        retry: shouldRetry,
        retryDelay,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
