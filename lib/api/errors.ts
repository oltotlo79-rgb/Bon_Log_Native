/**
 * @module lib/api/errors
 * API エラー型。コード enum は生成型から参照し、手書き重複を避ける。
 */

import type { components } from '@/lib/api/generated/schema.d.ts';
import { isRecord } from '@/lib/utils/type-guards';

/** スペック定義のエラーコード enum（20 値）。 */
export type MobileApiErrorCode = components['schemas']['MobileApiErrorCode'];

/**
 * スペック由来の 20 値 readonly 配列。
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
  'PREMIUM_REQUIRED',
  'TERMS_ACCEPTANCE_REQUIRED',
] as const satisfies readonly MobileApiErrorCode[];

/**
 * readonly string union 配列に対して string 型の値が含まれるかを型安全に検査するヘルパー。
 * Array.includes の型シグネチャが T を要求するため、as なしで string を渡せないことへの対処。
 */
function includesString<T extends string>(arr: readonly T[], value: string): value is T {
  return arr.some((item) => item === value);
}

/** 文字列が MobileApiErrorCode の許容値かを判定する型ガード。 */
export function isMobileApiErrorCode(value: string): value is MobileApiErrorCode {
  return includesString(MOBILE_API_ERROR_CODES, value);
}

/**
 * API から返る型付きエラー。
 * `code` を使って認証エラー・レート制限などを区別する。
 * `retryAfter` は 429 レスポンスの Retry-After ヘッダー値（秒）。
 * `details` はコード固有の追加情報（例: TERMS_ACCEPTANCE_REQUIRED の
 * currentTermsVersion）。ほとんどのエラーコードでは付与されない。
 */
export class ApiError extends Error {
  readonly code: MobileApiErrorCode;
  readonly status: number;
  readonly retryAfter: number | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(params: {
    code: MobileApiErrorCode;
    status: number;
    message: string;
    retryAfter?: number;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.retryAfter = params.retryAfter;
    this.details = params.details;
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

/**
 * TERMS_ACCEPTANCE_REQUIRED（Google 新規登録で規約同意が不足・不一致）かどうかを判定する型ガード。
 * サーバーは 403 を返すが、HTTP ステータスではなく本コードで分岐すること（cfw handback 2026-07-28 §4.4）。
 */
export function isTermsAcceptanceRequired(error: unknown): error is ApiError {
  return isApiError(error) && error.code === 'TERMS_ACCEPTANCE_REQUIRED';
}

/**
 * TERMS_ACCEPTANCE_REQUIRED の 403 応答に同梱される現行規約バージョンを取り出す。
 * サーバーが details を返さない場合（未デプロイの旧サーバー・想定外の欠落）は
 * undefined を返す。呼び出し側は CURRENT_TERMS_VERSION へフォールバックすること
 * （cfw handback 2026-07-29 §2）。
 */
export function getCurrentTermsVersion(error: unknown): string | undefined {
  if (!isTermsAcceptanceRequired(error) || !isRecord(error.details)) {
    return undefined;
  }

  const { currentTermsVersion } = error.details;
  return typeof currentTermsVersion === 'string' ? currentTermsVersion : undefined;
}
