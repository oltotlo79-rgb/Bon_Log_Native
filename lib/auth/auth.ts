/**
 * @module lib/auth/auth
 * 認証フロー（ログイン・2FA・ログアウト・パスワードリセット）の実装。
 * configureAuthHooks により lib/api/client と配線する。
 * 2FA チケットはルートパラメータに載せず、このモジュールのメモリ内状態で保持する（PM 決定）。
 */

import type { QueryClient } from '@tanstack/react-query';
import { apiClient, configureAuthHooks } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import {
  saveTokenPair,
  getAccessToken,
  getRefreshToken,
  deleteTokenPair,
} from '@/lib/auth/token-store';
import {
  setAuthStatus,
  setLastAuthFailureReason,
  toAuthFailureReason,
} from '@/lib/auth/auth-store';
import {
  cancelPendingPushRegistrations,
  unregisterDeviceForPushNotifications,
} from '@/lib/push/device-registration';
import { identifyBillingUser, resetBillingUser } from '@/lib/billing/purchases';

// ---------------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------------

/**
 * /users/me からユーザー ID を取得して RevenueCat に identify する（fail-safe）。
 * ログインレスポンスに userId が含まれないため、サインイン成功後に別途 GET する。
 * Web=Stripe 購読者との整合のためサーバーのユーザー ID を appUserID として使う（billing.md）。
 */
async function identifyBillingFromServerUser(): Promise<void> {
  const { data } = await apiClient.GET('/api/v1/users/me');
  if (data === undefined) {
    return;
  }
  await identifyBillingUser(data.id);
}

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** signInWithPassword の成功レスポンス: 2FA 不要でログイン完了 */
type SignInSuccess = { requires2FA: false };

/** signInWithPassword の成功レスポンス: 2FA が必要 */
type SignIn2FARequired = { requires2FA: true };

export type SignInResult = SignInSuccess | SignIn2FARequired;

// ---------------------------------------------------------------------------
// 2FA チケットのメモリ内保持（ルートパラメータ非使用・PM 決定）
// ---------------------------------------------------------------------------

let pending2FATicket: string | null = null;

/** テスト用: 2FA チケットをリセットする。 */
export function resetPending2FATicketForTest(): void {
  pending2FATicket = null;
}

// ---------------------------------------------------------------------------
// 初期化
// ---------------------------------------------------------------------------

/**
 * アプリ起動時に 1 回呼び出す認証初期化関数。
 * secure-store からトークンを復元して認証状態を確定し、
 * apiClient に認証フックを配線する。
 */
export async function initializeAuth({
  queryClient,
}: {
  queryClient: QueryClient;
}): Promise<void> {
  configureAuthHooks({
    getAccessToken,
    refreshTokens: async (): Promise<string | null> => {
      const refreshToken = await getRefreshToken();
      if (refreshToken === null) {
        return null;
      }

      const { data, error } = await apiClient.POST('/api/v1/auth/refresh', {
        body: { refreshToken },
      });

      if (error !== undefined || data === undefined) {
        return null;
      }

      await saveTokenPair({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      return data.accessToken;
    },
    onAuthFailure: (reuseDetected: boolean): void => {
      void (async () => {
        const errorCode = reuseDetected
          ? ('AUTH_REFRESH_TOKEN_REUSE_DETECTED' as const)
          : ('AUTH_REFRESH_TOKEN_INVALID' as const);

        await deleteTokenPair();
        queryClient.clear();
        setLastAuthFailureReason(toAuthFailureReason(errorCode, reuseDetected));
        setAuthStatus('signedOut');
      })();
    },
  });

  const token = await getAccessToken();
  if (token !== null) {
    setAuthStatus('signedIn');
    // 保存済みトークンからのセッション復元時も RevenueCat identify を実行する。
    // アプリ再起動で再ログインを経ない既存ユーザーも正しく紐付けるため（fail-safe）。
    try {
      await identifyBillingFromServerUser();
    } catch {
      // identify 失敗はセッション復元を止めない
    }
  } else {
    setAuthStatus('signedOut');
  }
}

// ---------------------------------------------------------------------------
// サインイン
// ---------------------------------------------------------------------------

/**
 * メール/パスワードでログインする。
 * - 200: トークン保存 → signedIn。`{ requires2FA: false }` を返す
 * - 202: チケットをメモリ保持 → `{ requires2FA: true }` を返す（frontend は 2FA 画面へ遷移する）
 * - それ以外: ApiError を throw する
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInResult> {
  const { data, error } = await apiClient.POST('/api/v1/auth/login', {
    body: { email, password },
  });

  if (error !== undefined || data === undefined) {
    throw error ?? new Error('Unexpected error during sign-in');
  }

  // openapi-fetch はステータスコードで型を絞れないため、data の形状で判別する
  if ('requires2FA' in data && data.requires2FA === true) {
    pending2FATicket = data.ticket;
    return { requires2FA: true };
  }

  if ('accessToken' in data && 'refreshToken' in data) {
    await saveTokenPair({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    setAuthStatus('signedIn');

    // RevenueCat にサーバーのユーザー ID を紐付ける（fail-safe）
    try {
      await identifyBillingFromServerUser();
    } catch {
      // 課金 identify 失敗はログインを止めない
    }

    return { requires2FA: false };
  }

  // 型ガードを通過しない場合は想定外のレスポンス形状
  throw new Error('Unexpected login response shape');
}

// ---------------------------------------------------------------------------
// 2FA 検証
// ---------------------------------------------------------------------------

/**
 * 2FA コードを検証してログインを完了する。
 * - 保持チケットは成功・失敗いずれの場合も破棄する（サーバー側も単回消費のため）
 * - チケット未保持の場合は Error を throw する（不正遷移の防御）
 */
export async function verifyTwoFactor(code: string): Promise<void> {
  const ticket = pending2FATicket;
  if (ticket === null) {
    throw new Error('2FA ticket is not available. Please sign in again.');
  }

  // 成功・失敗を問わずチケットを破棄する
  pending2FATicket = null;

  const { data, error } = await apiClient.POST('/api/v1/auth/2fa/verify', {
    body: { ticket, code },
  });

  if (error !== undefined || data === undefined) {
    throw error ?? new Error('Unexpected error during 2FA verification');
  }

  await saveTokenPair({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  setAuthStatus('signedIn');

  // RevenueCat にサーバーのユーザー ID を紐付ける（fail-safe）
  try {
    await identifyBillingFromServerUser();
  } catch {
    // 課金 identify 失敗はログインを止めない
  }
}

// ---------------------------------------------------------------------------
// サインアウト
// ---------------------------------------------------------------------------

/**
 * ログアウト処理（fail-safe）。
 * サーバー呼び出しが失敗してもローカルのトークン削除と状態遷移は必ず実施する（auth-tokens.md）。
 */
export async function signOut(queryClient: QueryClient): Promise<void> {
  // 権限確認待ちの自動登録を、サーバー logout より先に同期的に無効化する。
  cancelPendingPushRegistrations();

  const refreshToken = await getRefreshToken();

  // logout API は冪等。失敗しても後続処理を続行する
  if (refreshToken !== null) {
    try {
      await apiClient.POST('/api/v1/auth/logout', {
        body: { refreshToken },
      });
    } catch {
      // サーバー呼び出し失敗は無視してローカルのクリーンアップを続行する
    }
  }

  // Push デバイストークンのサーバー解除とローカル削除（失敗しても後続処理を続行する）
  try {
    await unregisterDeviceForPushNotifications();
  } catch {
    // fail-safe: Push 解除失敗は無視してトークン削除・状態遷移を続行する
  }

  // RevenueCat ユーザーをリセットする（fail-safe）
  try {
    await resetBillingUser();
  } catch {
    // fail-safe: RevenueCat reset 失敗は無視してトークン削除・状態遷移を続行する
  }

  await deleteTokenPair();
  queryClient.clear();
  setLastAuthFailureReason(null);
  setAuthStatus('signedOut');
}

// ---------------------------------------------------------------------------
// パスワードリセット
// ---------------------------------------------------------------------------

/**
 * パスワードリセットメールを送信する。
 * サーバーは列挙攻撃対策のため常に 200 を返す（エラーレスポンスは来ない）。
 * 429 (RATE_LIMITED) のみ ApiError を throw する。
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await apiClient.POST('/api/v1/auth/password-reset/request', {
    body: { email },
  });

  if (isApiError(error)) {
    throw error;
  }
}

/**
 * パスワードリセットを確定する。
 * - 200: 成功
 * - 401 (AUTH_INVALID_CREDENTIALS): トークン無効または期限切れ
 * - 400 (VALIDATION_ERROR): 入力不正
 * - 429 (RATE_LIMITED): レート制限
 */
export async function confirmPasswordReset(params: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<void> {
  const { error } = await apiClient.POST('/api/v1/auth/password-reset/confirm', {
    body: {
      email: params.email,
      token: params.token,
      newPassword: params.newPassword,
    },
  });

  if (isApiError(error)) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

/**
 * Google ID トークンでログインする。
 * ID トークンの検証はサーバーの責務。クライアントは検証・信頼しない（auth-tokens.md）。
 */
export async function signInWithGoogle(idToken: string): Promise<void> {
  const { data, error } = await apiClient.POST('/api/v1/auth/google', {
    body: { idToken },
  });

  if (error !== undefined || data === undefined) {
    throw error ?? new Error('Unexpected error during Google sign-in');
  }

  await saveTokenPair({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  setAuthStatus('signedIn');

  // RevenueCat にサーバーのユーザー ID を紐付ける（fail-safe）
  try {
    await identifyBillingFromServerUser();
  } catch {
    // 課金 identify 失敗はログインを止めない
  }
}

// ---------------------------------------------------------------------------
// 認証失敗理由の公開（frontend 向け）
// ---------------------------------------------------------------------------

export { getLastAuthFailureReason } from '@/lib/auth/auth-store';
export type { AuthStatus, AuthFailureReason } from '@/lib/auth/auth-store';
