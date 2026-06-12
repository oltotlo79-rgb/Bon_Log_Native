/**
 * @module lib/api/errors
 * API エラー型。コード enum は生成型から参照し、手書き重複を避ける。
 */

import type { components } from '@/lib/api/generated/schema.d.ts';

/** スペック定義のエラーコード enum（18 値）。 */
export type MobileApiErrorCode = components['schemas']['MobileApiErrorCode'];

/**
 * API から返る型付きエラー。
 * `code` を使って認証エラー・レート制限などを区別する。
 * `retryAfter` は 429 レスポンスの Retry-After ヘッダー値（秒）。
 */
export class ApiError extends Error {
  readonly code: MobileApiErrorCode;
  readonly status: number;
  readonly retryAfter: number | undefined;

  constructor(params: {
    code: MobileApiErrorCode;
    status: number;
    message: string;
    retryAfter?: number;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.retryAfter = params.retryAfter;
  }
}

/** ApiError の型ガード。 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * AUTH_REFRESH_TOKEN_REUSE_DETECTED かどうかを判定する型ガード。
 * トークン再利用検知は通常のセッション切れと区別して専用の警告を出す必要がある。
 */
export function isReuseDetected(error: unknown): error is ApiError {
  return isApiError(error) && error.code === 'AUTH_REFRESH_TOKEN_REUSE_DETECTED';
}
