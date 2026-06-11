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

/**
 * 4xx ステータスはリトライしない。
 * 将来 lib/api/ のエラー型 (ApiError 等) が確定したら、
 * `error instanceof ApiError && error.status >= 400 && error.status < 500`
 * のような判定に置き換える拡張点として、ここに集約している。
 *
 * TanStack Query の ShouldRetryFunction<Error> シグネチャに合わせて Error を受け取るが、
 * 実行時は status フィールドを持つ拡張 Error も流れてくるため isHttpError で動的に検査する。
 */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= RETRY_COUNT) return false;

  // HTTP ステータスを持つエラーオブジェクト（lib/api/ 実装後に型が確定）
  if (isHttpError(error) && error.status >= 400 && error.status < 500) {
    return false;
  }

  return true;
}

/** HTTP ステータスを持つエラー判定の型ガード。 */
function isHttpError(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  );
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
