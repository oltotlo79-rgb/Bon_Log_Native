/**
 * @module lib/auth/use-google-auth
 * Google OAuth フック。expo-auth-session で ID トークンを取得し、
 * useGoogleSignInMutation に渡してサーバー検証→トークン保存まで完結させる。
 * ID トークンの検証はサーバーの責務（auth-tokens.md）。
 */

import { useCallback, useMemo } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { useGoogleSignInMutation } from '@/lib/queries/auth';
import {
  ERR_GOOGLE_ID_TOKEN_MISSING,
  ERR_GOOGLE_SIGN_IN_FAILED,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type UseGoogleAuthReturn = {
  /** Google 認証フローを開始する。 */
  signIn: () => Promise<void>;
  /** プロンプト表示中またはサーバー検証中は true。 */
  isLoading: boolean;
  /**
   * expo-auth-session の request が準備完了かつ必須クライアント ID が設定済みの場合に true。
   * false のときは signIn を呼んでも即座に return する（ボタンの disabled 判定に使う）。
   */
  isAvailable: boolean;
  /** 直近のエラー。ユーザーキャンセルはエラーとして扱わない。 */
  error: Error | null;
};

// ---------------------------------------------------------------------------
// フック本体
// ---------------------------------------------------------------------------

/**
 * Google OAuth フロー + サーバー検証を統合したフック。
 *
 * isAvailable が true の場合のみ signIn が機能する。
 * ユーザーがキャンセルした場合（type: 'cancel' | 'dismiss'）は error を更新しない。
 * 画面遷移はルートレイアウトの認証ガードが担当するため、このフックは router を呼ばない。
 *
 * 使用例:
 * ```tsx
 * const { signIn, isLoading, isAvailable, error } = useGoogleAuth();
 * <Button onPress={signIn} disabled={!isAvailable || isLoading} title="Google でログイン" />
 * {error && <Text>{error.message}</Text>}
 * ```
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  // Android エミュレータ・実機向けに androidClientId を指定する。
  // webClientId（= serverClientId）を渡すことで発行される ID トークンの aud が
  // ウェブ用クライアント ID に一致し、サーバー側の検証が通る（cfw 回答 2026-06-16）。
  // モジュール評価時ではなくフック実行時に読むことで、テスト環境での env 上書きが有効になる。
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: androidClientId || undefined,
    iosClientId: iosClientId || undefined,
    webClientId: webClientId || undefined,
  });

  const mutation = useGoogleSignInMutation();

  const isAvailable = useMemo(
    () => request !== null && webClientId !== '',
    [request, webClientId]
  );

  const signIn = useCallback(async (): Promise<void> => {
    if (!isAvailable) {
      return;
    }

    let result;
    try {
      result = await promptAsync();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ERR_GOOGLE_SIGN_IN_FAILED;
      throw new Error(message);
    }

    // ユーザーキャンセル・dismiss は正常フロー
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return;
    }

    // locked / opened はプロンプトが既に動作中を示す。何もしない
    if (result.type === 'locked' || result.type === 'opened') {
      return;
    }

    if (result.type === 'error') {
      throw new Error(result.error?.message ?? ERR_GOOGLE_SIGN_IN_FAILED);
    }

    if (result.type !== 'success') {
      return;
    }

    const rawIdToken: unknown = result.params['id_token'];
    if (typeof rawIdToken !== 'string' || rawIdToken === '') {
      throw new Error(ERR_GOOGLE_ID_TOKEN_MISSING);
    }

    await mutation.mutateAsync({ idToken: rawIdToken });
  }, [isAvailable, promptAsync, mutation]);

  const error = mutation.error;

  return {
    signIn,
    isLoading: mutation.isPending,
    isAvailable,
    error,
  };
}
