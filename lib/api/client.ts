/**
 * @module lib/api/client
 * openapi-fetch ベースのAPIクライアント。
 * 依存方向: lib/api は lib/auth を import しない。
 * 認証フック（getAccessToken / refreshTokens / onAuthFailure）は
 * configureAuthHooks() で lib/auth 側から後から注入する。
 */

import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from '@/lib/api/generated/schema.d.ts';
import { ApiError, isApiError, isMobileApiErrorCode, type MobileApiErrorCode } from '@/lib/api/errors';
import { REQUEST_TIMEOUT_MS } from '@/lib/constants/query';

// ---------------------------------------------------------------------------
// 注入式認証フック
// ---------------------------------------------------------------------------

export type AuthHooks = {
  /** 現在有効なアクセストークンを返す。未ログインなら null。 */
  getAccessToken: () => Promise<string | null>;
  /**
   * トークンをリフレッシュして新しいアクセストークンを返す。
   * 失敗した場合は null を返す（失敗時の後続処理は onAuthFailure に委譲）。
   */
  refreshTokens: () => Promise<string | null>;
  /**
   * リフレッシュが失敗した場合、またはリフレッシュ不可の 401 を受け取った場合に呼ばれる。
   * reuseDetected が true の場合は AUTH_REFRESH_TOKEN_REUSE_DETECTED（専用警告画面を出すこと）。
   */
  onAuthFailure: (reuseDetected: boolean) => void;
};

const defaultAuthHooks: AuthHooks = {
  getAccessToken: async () => null,
  refreshTokens: async () => null,
  onAuthFailure: () => {},
};

let authHooks: AuthHooks = { ...defaultAuthHooks };

/**
 * 認証フックを設定する。lib/auth の初期化時に呼び出す。
 * これにより lib/api → lib/auth の依存が生まれず、依存方向を守れる。
 */
export function configureAuthHooks(hooks: AuthHooks): void {
  authHooks = hooks;
}

/** テスト用: 認証フックをデフォルト状態に戻す。 */
export function resetAuthHooksForTest(): void {
  authHooks = { ...defaultAuthHooks };
}

// ---------------------------------------------------------------------------
// 単一飛行 refresh
// ---------------------------------------------------------------------------

// 進行中の refresh Promise を共有し、並行リクエストでも refresh を 1 回に抑える。
let pendingRefresh: Promise<string | null> | null = null;

async function singleFlightRefresh(): Promise<string | null> {
  if (pendingRefresh !== null) {
    return pendingRefresh;
  }
  pendingRefresh = authHooks.refreshTokens().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

/** テスト用: 単一飛行 refresh の状態をリセットする。 */
export function resetPendingRefreshForTest(): void {
  pendingRefresh = null;
}

// ---------------------------------------------------------------------------
// エラーパース
// ---------------------------------------------------------------------------

export async function parseApiError(response: Response): Promise<ApiError> {
  const retryAfterRaw = response.headers.get('Retry-After');
  const retryAfter =
    retryAfterRaw !== null ? parseInt(retryAfterRaw, 10) : undefined;

  let code: MobileApiErrorCode = 'INTERNAL_ERROR';
  let message = response.statusText || 'Unknown error';

  try {
    const body: unknown = await response.clone().json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'object' &&
      body.error !== null &&
      'code' in body.error &&
      typeof body.error.code === 'string' &&
      'message' in body.error &&
      typeof body.error.message === 'string'
    ) {
      // スペック外の未知コードは INTERNAL_ERROR として扱い、as キャストを避ける
      code = isMobileApiErrorCode(body.error.code) ? body.error.code : 'INTERNAL_ERROR';
      message = body.error.message;
    }
  } catch {
    // JSON パース失敗は無視して status ベースのエラーにフォールバックする
  }

  return new ApiError({ code, status: response.status, message, retryAfter });
}

// ---------------------------------------------------------------------------
// ミドルウェア生成
// ---------------------------------------------------------------------------

function buildAuthAndErrorMiddleware(): Middleware {
  return {
    async onRequest({ request }) {
      const token = await authHooks.getAccessToken();
      if (token !== null) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return request;
    },

    async onResponse({ response, request }) {
      if (response.ok) {
        return response;
      }

      if (response.status === 401) {
        const error = await parseApiError(response);

        // AUTH_TOKEN_EXPIRED のみリフレッシュを試みる。
        // それ以外の 401 コード（AUTH_INVALID_TOKEN / AUTH_REFRESH_TOKEN_INVALID /
        // AUTH_REFRESH_TOKEN_REUSE_DETECTED）はリフレッシュせず即座に失敗させる。
        if (error.code === 'AUTH_TOKEN_EXPIRED') {
          const newToken = await singleFlightRefresh();
          if (newToken !== null) {
            const retried = request.clone();
            retried.headers.set('Authorization', `Bearer ${newToken}`);
            const retryResponse = await fetch(retried);
            if (retryResponse.ok) {
              return retryResponse;
            }
            throw await parseApiError(retryResponse);
          }
          // refresh 失敗
          authHooks.onAuthFailure(false);
          throw error;
        }

        // REUSE_DETECTED は専用の警告が必要なため区別して通知する
        const reuseDetected = error.code === 'AUTH_REFRESH_TOKEN_REUSE_DETECTED';
        authHooks.onAuthFailure(reuseDetected);
        throw error;
      }

      throw await parseApiError(response);
    },
  };
}

function hasUnref(value: unknown): value is { unref: () => void } {
  if (typeof value !== 'object' || value === null || !('unref' in value)) {
    return false;
  }
  // in 演算子チェック後、TypeScript は value を object & { unref: unknown } に絞り込む
  return typeof value.unref === 'function';
}

function buildTimeoutMiddleware(): Middleware {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function clearTimer(id: string): void {
    const timerId = timers.get(id);
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timers.delete(id);
    }
  }

  return {
    async onRequest({ request, id }) {
      const controller = new AbortController();
      const timerId = setTimeout(() => {
        timers.delete(id);
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      // Node.js 環境（Jest）でテスト終了を妨げないよう unref する。
      // RN の Hermes は unref を持たないため型ガードで存在確認してから呼ぶ。
      if (hasUnref(timerId)) {
        timerId.unref();
      }
      timers.set(id, timerId);
      return new Request(request, { signal: controller.signal });
    },

    async onResponse({ response, id }) {
      clearTimer(id);
      return response;
    },

    async onError({ id }) {
      clearTimer(id);
    },
  };
}

// ---------------------------------------------------------------------------
// クライアントの生成
// ---------------------------------------------------------------------------

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bon-log.com';

/**
 * テスト・内部用のクライアントファクトリ。
 * アプリで使うシングルトン apiClient は下記で生成済み。
 */
export function createApiClient(baseUrl: string = BASE_URL) {
  const client = createClient<paths>({ baseUrl });
  client.use(buildTimeoutMiddleware());
  client.use(buildAuthAndErrorMiddleware());
  return client;
}

export const apiClient = createApiClient();

// ---------------------------------------------------------------------------
// 型ユーティリティ（frontend / lib/queries 向け再 export）
// ---------------------------------------------------------------------------

export type { paths };
export { isApiError };
export type { MobileApiErrorCode };
