/**
 * @module lib/api/errors
 * API エラー型。コード enum は生成型から参照し、手書き重複を避ける。
 */

import type { components } from '@/lib/api/generated/schema.d.ts';

/** スペック定義のエラーコード enum（18 値）。 */
export type MobileApiErrorCode = components['schemas']['MobileApiErrorCode'];

/**
 * スペック由来の 18 値 readonly 配列。
 * isMobileApiErrorCode の照合基準として使う。生成スキーマの enum と一致させること。
 */
const MOBILE_API_ERROR_CODES = [
  'AUTH_REQUIRED',
  'AUTH_INVALID_TOKEN',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_2FA_REQUIRED',
  'AUTH_2FA_INVALID_CODE',
  'AUTH_2FA_TICKET_EXPIRED',
  'AUTH_REFRESH_TOKEN_INVALID',
  'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
  'ACCOUNT_SUSPENDED',
  'GUEST_NOT_ALLOWED',
  'EMAIL_NOT_VERIFIED',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
  'SERVER_MISCONFIGURED',
] as const satisfies readonly MobileApiErrorCode[];

/** 文字列が MobileApiErrorCode の許容値かを判定する型ガード。 */
export function isMobileApiErrorCode(value: string): value is MobileApiErrorCode {
  return (MOBILE_API_ERROR_CODES as readonly string[]).includes(value);
}

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
