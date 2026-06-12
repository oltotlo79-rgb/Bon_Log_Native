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
