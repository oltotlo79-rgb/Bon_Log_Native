/**
 * @module lib/queries/auth
 * 認証関連の TanStack Query ミューテーション + useCurrentUserQuery。
 * 認証フローの実装は lib/auth/auth.ts に委譲し、このモジュールは Query/Mutation のラッパーに徹する。
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  signInWithPassword,
  verifyTwoFactor,
  signOut,
  requestPasswordReset,
  confirmPasswordReset,
  signInWithGoogle,
  type SignInResult,
} from '@/lib/auth/auth';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { isApiError } from '@/lib/api/errors';
import { ERR_VERIFY_EMAIL_RESEND_RATE_LIMITED } from '@/lib/constants/errors';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// useCurrentUserQuery
// ---------------------------------------------------------------------------

/**
 * 認証中ユーザーの基本情報を取得するクエリ。
 * isPremium はサーバー DB の購読状態由来（RevenueCat クライアント状態を正にしない）。
 * enabled オプションで認証状態に応じて無効化できる。
 */
export function useCurrentUserQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.users.me,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/users/me');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching current user');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    enabled,
  });
}

// ---------------------------------------------------------------------------
// useLoginMutation
// ---------------------------------------------------------------------------

/**
 * メール/パスワードログインミューテーション。
 * 戻り値の `requires2FA` で分岐して frontend が画面を切り替える。
 *
 * invalidation: ログイン成功（requires2FA: false）時は queryClient.clear() を lib/auth が実施しない。
 * 新しいセッションでは全クエリが初期状態のため、invalidate は不要。
 * （queryClient.clear() はログアウト時のみ呼ぶ — invalidation-map.md 参照）
 */
export function useLoginMutation() {
  return useMutation<SignInResult, Error, { email: string; password: string }>({
    mutationFn: ({ email, password }) => signInWithPassword(email, password),
  });
}

// ---------------------------------------------------------------------------
// useVerifyTwoFactorMutation
// ---------------------------------------------------------------------------

/**
 * 2FA コード検証ミューテーション。
 * チケットは lib/auth 内部で管理するため、外部から渡す引数は code のみ。
 */
export function useVerifyTwoFactorMutation() {
  return useMutation<void, Error, { code: string }>({
    mutationFn: ({ code }) => verifyTwoFactor(code),
  });
}

// ---------------------------------------------------------------------------
// useLogoutMutation
// ---------------------------------------------------------------------------

/**
 * ログアウトミューテーション。
 * signOut が queryClient.clear() を実施するため、ここで別途 invalidate は不要。
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => signOut(queryClient),
  });
}

// ---------------------------------------------------------------------------
// usePasswordResetRequestMutation
// ---------------------------------------------------------------------------

/**
 * パスワードリセットメール送信ミューテーション。
 * サーバーは列挙攻撃対策のため常に 200 を返す。
 * 429 のみ error に ApiError が入る。
 */
export function usePasswordResetRequestMutation() {
  return useMutation<void, Error, { email: string }>({
    mutationFn: ({ email }) => requestPasswordReset(email),
  });
}

// ---------------------------------------------------------------------------
// usePasswordResetConfirmMutation
// ---------------------------------------------------------------------------

/**
 * パスワードリセット確定ミューテーション。
 * 成功後は frontend がログイン画面へ遷移する。queryClient の操作は不要。
 */
export function usePasswordResetConfirmMutation() {
  return useMutation<
    void,
    Error,
    { email: string; token: string; newPassword: string }
  >({
    mutationFn: (params) => confirmPasswordReset(params),
  });
}

// ---------------------------------------------------------------------------
// useGoogleSignInMutation
// ---------------------------------------------------------------------------

/**
 * Google OAuth サインインミューテーション。
 * expo-auth-session で ID トークンを取得した後に呼び出す。
 * ID トークンの検証はサーバーの責務（auth-tokens.md）。
 */
export function useGoogleSignInMutation() {
  return useMutation<void, Error, { idToken: string }>({
    mutationFn: ({ idToken }) => signInWithGoogle(idToken),
  });
}

// ---------------------------------------------------------------------------
// useResendVerificationMutation
// ---------------------------------------------------------------------------

/**
 * 確認メール再送ミューテーション（POST /api/v1/auth/verify-email/resend）。
 * 列挙攻撃対策によりメール存在有無に関わらず常に 200 を返す。
 * 429 のみ RATE_LIMITED エラーとして throw する。
 * 認証不要の公開エンドポイント。invalidation 不要。
 */
export function useResendVerificationMutation() {
  return useMutation<void, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const { error } = await apiClient.POST('/api/v1/auth/verify-email/resend', {
        body: { email },
      });
      if (error !== undefined) {
        // 429 のみエラーとして伝播する（仕様上 429 以外は常に 200 が返る）
        if (isApiError(error) && error.code === 'RATE_LIMITED') {
          throw new Error(ERR_VERIFY_EMAIL_RESEND_RATE_LIMITED);
        }
        throw error;
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useRegisterMutation
// ---------------------------------------------------------------------------

/** register ミューテーションの引数型。termsAccepted は画面側で同意済みのため内部で true 固定。 */
export type RegisterParams = {
  nickname: string;
  email: string;
  password: string;
};

/** register 成功時の戻り値。201 { success: true } の確認のみ。 */
export type RegisterResult = components['schemas']['SuccessResponse'];

// ---------------------------------------------------------------------------
// 2FA 管理（ログイン後の設定画面から呼び出す。ログインフローの verifyTwoFactor とは別物）
// ---------------------------------------------------------------------------

export type TwoFactorSetupResponse = components['schemas']['TwoFactorSetupResponse'];
export type TwoFactorEnableResponse = components['schemas']['TwoFactorEnableResponse'];
export type TwoFactorDisableResponse = components['schemas']['TwoFactorDisableResponse'];

/**
 * 2FA セットアップ情報（シークレット・otpAuthUrl・setupId・バックアップコード）を発行するミューテーション。
 *
 * GET /api/v1/auth/2fa/setup だが、呼び出すたびに新しい secret/setupId が Redis に発行される
 * 副作用を持つため useQuery ではなく useMutation として扱う
 * （useQuery だとフォーカス復帰・マウント時の自動 refetch で意図せず再発行され、
 * two_factor_setup レート制限（15分に10回）を消費しかねない）。
 * 戻り値はキャッシュしない。画面側は mutateAsync の戻り値をローカル state で保持すること。
 */
export function useTwoFactorSetupMutation() {
  return useMutation<TwoFactorSetupResponse, Error, void>({
    mutationFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/auth/2fa/setup');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error starting 2FA setup');
      }
      return data;
    },
  });
}

/**
 * 2FA を有効化するミューテーション（POST /api/v1/auth/2fa/enable）。
 * setupId は useTwoFactorSetupMutation の戻り値を渡す。
 *
 * onSuccess: users.me を invalidate する（2FA 状態が反映され得るフィールドのため）。
 * invalidation-map.md 参照。
 */
export function useEnableTwoFactorMutation() {
  const queryClient = useQueryClient();

  return useMutation<TwoFactorEnableResponse, Error, { code: string; setupId: string }>({
    mutationFn: async ({ code, setupId }) => {
      const { data, error } = await apiClient.POST('/api/v1/auth/2fa/enable', {
        body: { code, setupId },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error enabling 2FA');
      }
      return data;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
    },
  });
}

/**
 * 2FA を無効化するミューテーション（DELETE /api/v1/auth/2fa/disable）。
 * TOTP コードではなくパスワードで本人確認する。
 *
 * onSuccess: users.me を invalidate する（2FA 状態が反映され得るフィールドのため）。
 * invalidation-map.md 参照。
 */
export function useDisableTwoFactorMutation() {
  const queryClient = useQueryClient();

  return useMutation<TwoFactorDisableResponse, Error, { password: string }>({
    mutationFn: async ({ password }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/auth/2fa/disable', {
        body: { password },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error disabling 2FA');
      }
      return data;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
    },
  });
}

// ---------------------------------------------------------------------------
// useChangePasswordMutation
// ---------------------------------------------------------------------------

export type ChangePasswordResult = components['schemas']['SuccessResponse'];

/**
 * ログイン中ユーザーのパスワード変更ミューテーション（POST /api/v1/auth/password/change）。
 *
 * エラー: 401 AUTH_INVALID_CREDENTIALS → 現パスワード不一致 / 400 VALIDATION_ERROR → 新パスワード強度不足 /
 * 409 CONFLICT → OAuth 専用アカウント（パスワード未設定）/ 429 → レート制限。
 * 文言変換は lib/constants/errors.ts の messageForChangePasswordError を使用する。
 * 成功時の特別な invalidate は不要（twoFactorEnabled 等の users.me フィールドに影響しないため）。
 */
export function useChangePasswordMutation() {
  return useMutation<ChangePasswordResult, Error, { currentPassword: string; newPassword: string }>({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const { data, error } = await apiClient.POST('/api/v1/auth/password/change', {
        body: { currentPassword, newPassword },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error changing password');
      }
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// useRequestEmailChangeMutation
// ---------------------------------------------------------------------------

export type RequestEmailChangeResult = components['schemas']['SuccessResponse'];

/**
 * メールアドレス変更リクエストミューテーション（POST /api/v1/auth/email/change/request）。
 * 確認メール経由の二段階方式の第一段階。
 *
 * 列挙攻撃対策により newEmail の使用状況に関わらず常に 200 を返す。
 * エラー: 401 AUTH_INVALID_CREDENTIALS → 現パスワード不一致 / 409 CONFLICT → OAuth 専用アカウント / 429 → レート制限。
 * 文言変換は lib/constants/errors.ts の messageForEmailChangeRequestError を使用する。
 * 状態変更が確定するのは confirm 後のため invalidate 不要。
 */
export function useRequestEmailChangeMutation() {
  return useMutation<RequestEmailChangeResult, Error, { newEmail: string; currentPassword: string }>({
    mutationFn: async ({ newEmail, currentPassword }) => {
      const { data, error } = await apiClient.POST('/api/v1/auth/email/change/request', {
        body: { newEmail, currentPassword },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error requesting email change');
      }
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// useConfirmEmailChangeMutation
// ---------------------------------------------------------------------------

export type ConfirmEmailChangeResult = components['schemas']['SuccessResponse'];

/**
 * メールアドレス変更確定ミューテーション（POST /api/v1/auth/email/change/confirm）。
 * 確認メール経由の二段階方式の第二段階。token 所持自体が新アドレス所有性の証明のため
 * サーバー側は Bearer 認証を要求しないが、apiClient は未ログイン時に単に
 * Authorization ヘッダーを付与しないだけなので、既存クライアント経由でそのまま呼べる
 * （ログイン中に呼ばれても余分な Bearer は無視される）。
 *
 * エラー: 401 AUTH_INVALID_CREDENTIALS → トークン無効/期限切れ / 409 CONFLICT → newEmail 使用済み / 429 → レート制限。
 * onSuccess: users.me を invalidate する（email フィールドが変わるため）。
 * invalidation-map.md 参照。
 */
export function useConfirmEmailChangeMutation() {
  const queryClient = useQueryClient();

  return useMutation<ConfirmEmailChangeResult, Error, { token: string }>({
    mutationFn: async ({ token }) => {
      const { data, error } = await apiClient.POST('/api/v1/auth/email/change/confirm', {
        body: { token },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error confirming email change');
      }
      return data;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
    },
  });
}

/**
 * 新規ユーザー登録ミューテーション。
 * termsAccepted は画面が同意チェック完了後に呼び出す前提のため true を内部で付与する。
 * 成功（201）後は自動ログインしない（メール確認待ちのため）。
 * frontend は onSuccess で verify-email-sent 画面へ遷移すること。
 *
 * エラー: 409 CONFLICT → メール重複 / 400 VALIDATION_ERROR → 入力形式不正 / 429 → レート制限。
 * エラー文言変換は lib/constants/errors.ts の messageForRegisterError を使用する。
 */
export function useRegisterMutation() {
  return useMutation<RegisterResult, Error, RegisterParams>({
    mutationFn: async ({ nickname, email, password }) => {
      const { data, error } = await apiClient.POST('/api/v1/auth/register', {
        body: {
          nickname,
          email,
          password,
          termsAccepted: true,
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error during registration');
      }
      return data;
    },
  });
}
