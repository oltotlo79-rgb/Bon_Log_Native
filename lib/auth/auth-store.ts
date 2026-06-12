/**
 * @module lib/auth/auth-store
 * 認証状態の外部ストア（useSyncExternalStore ベース）。
 * loading / signedIn / signedOut の 3 状態を管理する。
 * React に依存しない純粋なストア実装。
 */

import type { MobileApiErrorCode } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

/**
 * 直近の認証失敗の理由。
 * frontend が「再利用検知」か「通常のセッション切れ」かを区別して文言を出し分けるために使う。
 */
export type AuthFailureReason =
  | { kind: 'reuseDetected' }
  | { kind: 'sessionExpired' }
  | { kind: 'accountSuspended' }
  | null;

type Listener = () => void;

// ---------------------------------------------------------------------------
// ストア実装
// ---------------------------------------------------------------------------

let status: AuthStatus = 'loading';
let lastFailureReason: AuthFailureReason = null;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** 認証状態のスナップショットを返す。useSyncExternalStore の getSnapshot に渡す。 */
export function getAuthStatus(): AuthStatus {
  return status;
}

/** 認証失敗理由のスナップショットを返す。useSyncExternalStore の getSnapshot に渡す。 */
export function getLastAuthFailureReason(): AuthFailureReason {
  return lastFailureReason;
}

/** ストアの変更を購読する。useSyncExternalStore の subscribe に渡す。 */
export function subscribeAuthStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// 状態変更関数（lib/auth 内部からのみ呼び出す）
// ---------------------------------------------------------------------------

export function setAuthStatus(next: AuthStatus): void {
  if (status !== next) {
    status = next;
    notifyListeners();
  }
}

export function setLastAuthFailureReason(reason: AuthFailureReason): void {
  lastFailureReason = reason;
  notifyListeners();
}

/**
 * API エラーコードから AuthFailureReason を導出する。
 * 外部に公開して auth.ts から呼ぶ。
 */
export function toAuthFailureReason(
  errorCode: MobileApiErrorCode,
  reuseDetected: boolean
): AuthFailureReason {
  if (reuseDetected) {
    return { kind: 'reuseDetected' };
  }
  if (errorCode === 'ACCOUNT_SUSPENDED') {
    return { kind: 'accountSuspended' };
  }
  return { kind: 'sessionExpired' };
}

// ---------------------------------------------------------------------------
// テスト用ユーティリティ
// ---------------------------------------------------------------------------

/**
 * テスト用: ストアの状態をリセットする。
 * アプリコードから呼び出さないこと。
 */
export function resetAuthStoreForTest(): void {
  status = 'loading';
  lastFailureReason = null;
  listeners.clear();
}
