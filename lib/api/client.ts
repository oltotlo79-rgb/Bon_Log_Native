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
   * エラーコードをそのまま渡し、再利用検知・停止・通常失効を認証層で区別する。
   */
  onAuthFailure: (errorCode: MobileApiErrorCode) => void;
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

/** Bearer を送らず、body / ticket 自体で本人性を検証する公開認証 endpoint。 */
const PUBLIC_AUTH_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/2fa/verify',
  '/api/v1/auth/email/change/confirm',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/google',
  '/api/v1/auth/password-reset/request',
  '/api/v1/auth/password-reset/confirm',
  '/api/v1/auth/register',
]);

function requestPath(request: Request): string {
  return new URL(request.url).pathname;
}

function carriesSessionCredential(request: Request): boolean {
  return (
    request.headers.has('Authorization') ||
    requestPath(request) === '/api/v1/auth/refresh'
  );
}

/**
 * 401 のうち、現在のログインセッションを破棄すべきものだけを判定する。
 * AUTH_INVALID_CREDENTIALS / 2FA 不正等は操作入力の失敗であり、logout してはならない。
 */
function isFatalSessionError(error: ApiError, request: Request): boolean {
  if (
    error.code === 'AUTH_REFRESH_TOKEN_INVALID' ||
    error.code === 'AUTH_REFRESH_TOKEN_REUSE_DETECTED'
  ) {
    return requestPath(request) === '/api/v1/auth/refresh';
  }

  if (
    error.code === 'AUTH_REQUIRED' ||
    error.code === 'AUTH_INVALID_TOKEN' ||
    error.code === 'AUTH_TOKEN_EXPIRED'
  ) {
    return carriesSessionCredential(request);
  }

  return false;
}

function notifyFatalAuthError(error: ApiError, request: Request): void {
  const isSuspendedSession =
    error.code === 'ACCOUNT_SUSPENDED' && carriesSessionCredential(request);
  if (isSuspendedSession || isFatalSessionError(error, request)) {
    authHooks.onAuthFailure(error.code);
  }
}

function buildAuthAndErrorMiddleware(): Middleware {
  return {
    async onRequest({ request }) {
      if (PUBLIC_AUTH_PATHS.has(requestPath(request))) {
        return;
      }

      const token = await authHooks.getAccessToken();
      if (token === null) {
        // トークンが無い場合はヘッダを変更しないため undefined を返す
        // （openapi-fetch の契約: 変更時のみ Request/Response を返す）
        return;
      }
      request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },

    async onResponse({ response, request }) {
      if (response.ok) {
        // 変更しない場合は undefined を返す（元の response を返すと
        // RN 環境で instanceof Response 判定に失敗し openapi-fetch がエラーを投げる）
        return;
      }

      if (response.status === 403) {
        const error = await parseApiError(response);
        notifyFatalAuthError(error, request);
        throw error;
      }

      if (response.status === 401) {
        const error = await parseApiError(response);

        // AUTH_TOKEN_EXPIRED のみリフレッシュを試みる。
        // それ以外の 401 コード（AUTH_INVALID_TOKEN / AUTH_REFRESH_TOKEN_INVALID /
        // AUTH_REFRESH_TOKEN_REUSE_DETECTED）はリフレッシュせず即座に失敗させる。
        if (
          error.code === 'AUTH_TOKEN_EXPIRED' &&
          carriesSessionCredential(request)
        ) {
          const newToken = await singleFlightRefresh();
          if (newToken !== null) {
            const retried = request.clone();
            retried.headers.set('Authorization', `Bearer ${newToken}`);
            const retryResponse = await fetch(retried);
            if (retryResponse.ok) {
              return retryResponse;
            }
            const retryError = await parseApiError(retryResponse);
            notifyFatalAuthError(retryError, retried);
            throw retryError;
          }
          // refresh 失敗
          authHooks.onAuthFailure('AUTH_REFRESH_TOKEN_INVALID');
          throw error;
        }

        notifyFatalAuthError(error, request);
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

    async onResponse({ id }) {
      clearTimer(id);
      // response を変更しないため undefined を返す（元の response を返すと
      // RN 環境で instanceof Response 判定に失敗し openapi-fetch がエラーを投げる）
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
