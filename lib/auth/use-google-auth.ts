/**
 * @module lib/auth/use-google-auth
 * Google OAuth フック。@react-native-google-signin/google-signin で ID トークンを取得し、
 * useGoogleSignInMutation に渡してサーバー検証→トークン保存まで完結させる。
 * ID トークンの検証はサーバーの責務（auth-tokens.md）。
 *
 * expo-auth-session の useIdTokenAuthRequest はインストール型 Android で
 * Error 400 invalid_request が発生するため、ネイティブ SDK に移行した。
 */

import { useCallback, useEffect, useMemo } from 'react';
import {
  GoogleSignin,
  statusCodes,
  type SignInResponse,
} from '@react-native-google-signin/google-signin';
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
  /** サーバー検証中は true。 */
  isLoading: boolean;
  /**
   * webClientId が設定済みの場合に true。
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
 * ユーザーがキャンセルした場合（type: 'cancelled'）は error を更新しない。
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
  // モジュール評価時ではなくフック実行時に読むことで、テスト環境での env 上書きが有効になる。
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

  // webClientId を serverClientId として渡すことで発行される ID トークンの aud が
  // ウェブ用クライアント ID に一致し、サーバー側の検証が通る（cfw 回答 2026-06-16）。
  useEffect(() => {
    if (webClientId === '') {
      return;
    }
    GoogleSignin.configure({
      webClientId,
      iosClientId: iosClientId !== '' ? iosClientId : undefined,
    });
  }, [webClientId, iosClientId]);

  const mutation = useGoogleSignInMutation();

  const isAvailable = useMemo(() => webClientId !== '', [webClientId]);

  const signIn = useCallback(async (): Promise<void> => {
    if (!isAvailable) {
      return;
    }

    let result: SignInResponse;
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      result = await GoogleSignin.signIn();
    } catch (err) {
      const isNativeError =
        err !== null &&
        typeof err === 'object' &&
        'code' in err &&
        typeof (err as { code: unknown }).code === 'string';

      if (isNativeError) {
        const code = (err as { code: string }).code;
        if (code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        if (code === statusCodes.IN_PROGRESS) {
          return;
        }
      }

      const message =
        err instanceof Error ? err.message : ERR_GOOGLE_SIGN_IN_FAILED;
      throw new Error(message);
    }

    if (result.type === 'cancelled') {
      return;
    }

    const rawIdToken: string | null = result.data.idToken;
    if (typeof rawIdToken !== 'string' || rawIdToken === '') {
      throw new Error(ERR_GOOGLE_ID_TOKEN_MISSING);
    }

    await mutation.mutateAsync({ idToken: rawIdToken });
  }, [isAvailable, mutation]);

  return {
    signIn,
    isLoading: mutation.isPending,
    isAvailable,
    error: mutation.error,
  };
}
