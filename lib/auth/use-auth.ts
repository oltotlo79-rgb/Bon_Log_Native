/**
 * @module lib/auth/use-auth
 * 認証状態を参照するフック。
 * 画面は useAuth() だけを参照し、auth-store の内部実装に依存しない。
 */

import { useSyncExternalStore } from 'react';
import {
  subscribeAuthStore,
  getAuthStatus,
  getLastAuthFailureReason,
  type AuthStatus,
  type AuthFailureReason,
} from '@/lib/auth/auth-store';

export type UseAuthReturn = {
  /** 認証状態: loading / signedIn / signedOut */
  status: AuthStatus;
  /** ログイン済みかどうか */
  isSignedIn: boolean;
  /** 初期化完了前かどうか */
  isLoading: boolean;
  /**
   * 直近の認証失敗理由。
   * frontend はこれを参照してログイン画面での警告文言を切り替える。
   * null = 失敗なし（または失敗理由をクリア済み）
   */
  lastAuthFailureReason: AuthFailureReason;
};

/**
 * 認証状態を購読するフック。
 * ルートレイアウトのガード判定と、ログイン画面での警告文言表示に使う。
 */
export function useAuth(): UseAuthReturn {
  const status = useSyncExternalStore(subscribeAuthStore, getAuthStatus, getAuthStatus);
  const lastAuthFailureReason = useSyncExternalStore(
    subscribeAuthStore,
    getLastAuthFailureReason,
    getLastAuthFailureReason
  );

  return {
    status,
    isSignedIn: status === 'signedIn',
    isLoading: status === 'loading',
    lastAuthFailureReason,
  };
}
