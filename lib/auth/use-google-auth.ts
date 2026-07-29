/**
 * @module lib/auth/use-google-auth
 * Google OAuth フック。@react-native-google-signin/google-signin で ID トークンを取得し、
 * useGoogleSignInMutation に渡してサーバー検証→トークン保存まで完結させる。
 * ID トークンの検証はサーバーの責務（auth-tokens.md）。
 *
 * expo-auth-session の useIdTokenAuthRequest はインストール型 Android で
 * Error 400 invalid_request が発生するため、ネイティブ SDK に移行した。
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { isRecord } from '@/lib/utils/type-guards';
import { getCurrentTermsVersion } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** 新規ユーザー作成時に必須の規約同意情報（Google 新規登録経路のみ送信する）。 */
export type GoogleAuthTerms = { termsAccepted: true; termsVersion: string };

export type UseGoogleAuthReturn = {
  /**
   * Google 認証フローを開始する。
   *
   * terms 省略時（通常の初回呼び出し）: ネイティブの Google アカウント選択を開始する。
   * サーバーが 403 TERMS_ACCEPTANCE_REQUIRED を返した場合（新規ユーザー作成時のみ発生）、
   * frontend は isTermsAcceptanceRequired(error) で判別して同意画面を出し、
   * 同意後に terms 付きで signIn を再度呼び出す。このとき直前に取得済みの ID トークンを
   * 再利用するため、ネイティブのアカウント選択は再表示されない。
   *
   * terms.termsVersion は呼び出し側が指定するフォールバック値として扱う。
   * 直前の 403 応答が現行バージョン（error.details.currentTermsVersion）を
   * 同梱していた場合はその値を優先して送信する（cfw handback 2026-07-29 §2）。
   */
  signIn: (terms?: GoogleAuthTerms) => Promise<void>;
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

function nativeErrorCode(error: unknown): string | null {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return null;
  }

  return typeof error.code === 'string' ? error.code : null;
}

// イベントハンドラへ直接渡されると呼び出し元イベントが引数に紛れ込みうるため、形を実行時にも検証する
function isGoogleAuthTerms(value: unknown): value is GoogleAuthTerms {
  return (
    isRecord(value) &&
    value.termsAccepted === true &&
    typeof value.termsVersion === 'string'
  );
}

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

  // terms 付きの再試行（規約同意画面からの再送）でネイティブのアカウント選択を
  // 再表示しないよう、直近で取得した ID トークンを保持する。
  const lastIdTokenRef = useRef<string | null>(null);

  // 直前の 403 TERMS_ACCEPTANCE_REQUIRED が同梱していたサーバー側の現行規約
  // バージョン。値が一致することが構造上保証されるため、再送時はこれを優先する
  // （cfw handback 2026-07-29 §2）。未デプロイのサーバーでは付与されないため
  // undefined のままになり、呼び出し側が渡した値（フォールバック）を使う。
  const lastServerTermsVersionRef = useRef<string | undefined>(undefined);

  const signIn = useCallback(async (terms?: GoogleAuthTerms): Promise<void> => {
    if (!isAvailable) {
      return;
    }

    const validTerms = isGoogleAuthTerms(terms) ? terms : undefined;

    let idToken = validTerms !== undefined ? lastIdTokenRef.current : null;

    if (idToken === null) {
      // 無関係な過去の試行から漏れたバージョンを持ち越さない
      lastServerTermsVersionRef.current = undefined;

      let result: SignInResponse;
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        result = await GoogleSignin.signIn();
      } catch (err) {
        const code = nativeErrorCode(err);
        if (code !== null) {
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

      idToken = rawIdToken;
      lastIdTokenRef.current = rawIdToken;
    }

    try {
      if (validTerms !== undefined) {
        await mutation.mutateAsync({
          idToken,
          termsAccepted: validTerms.termsAccepted,
          termsVersion: lastServerTermsVersionRef.current ?? validTerms.termsVersion,
        });
      } else {
        await mutation.mutateAsync({ idToken });
      }
    } catch (err) {
      const serverTermsVersion = getCurrentTermsVersion(err);
      if (serverTermsVersion !== undefined) {
        lastServerTermsVersionRef.current = serverTermsVersion;
      }
      throw err;
    }
  }, [isAvailable, mutation]);

  return {
    signIn,
    isLoading: mutation.isPending,
    isAvailable,
    error: mutation.error,
  };
}
