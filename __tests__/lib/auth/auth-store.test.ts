/**
 * lib/auth/auth-store のユニットテスト。
 * 外部ストアのスナップショット・購読・状態変更を検証する。
 */

import {
  getAuthStatus,
  getLastAuthFailureReason,
  subscribeAuthStore,
  setAuthStatus,
  setLastAuthFailureReason,
  toAuthFailureReason,
  resetAuthStoreForTest,
} from '@/lib/auth/auth-store';

beforeEach(() => {
  resetAuthStoreForTest();
});

describe('getAuthStatus', () => {
  it('初期値は loading', () => {
    expect(getAuthStatus()).toBe('loading');
  });
});

describe('setAuthStatus', () => {
  it('状態を変更するとスナップショットが更新される', () => {
    setAuthStatus('signedIn');
    expect(getAuthStatus()).toBe('signedIn');
  });

  it('同じ状態への更新は通知しない（リスナーが呼ばれない）', () => {
    const listener = jest.fn();
    subscribeAuthStore(listener);

    setAuthStatus('loading'); // 初期値 = loading のため変化なし
    expect(listener).not.toHaveBeenCalled();
  });

  it('異なる状態への更新はリスナーに通知する', () => {
    const listener = jest.fn();
    subscribeAuthStore(listener);

    setAuthStatus('signedIn');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('setLastAuthFailureReason', () => {
  it('値を設定するとスナップショットが更新される', () => {
    setLastAuthFailureReason({ kind: 'reuseDetected' });
    expect(getLastAuthFailureReason()).toEqual({ kind: 'reuseDetected' });
  });

  it('null に設定できる', () => {
    setLastAuthFailureReason({ kind: 'sessionExpired' });
    setLastAuthFailureReason(null);
    expect(getLastAuthFailureReason()).toBeNull();
  });

  it('設定のたびにリスナーに通知する', () => {
    const listener = jest.fn();
    subscribeAuthStore(listener);

    setLastAuthFailureReason({ kind: 'reuseDetected' });
    expect(listener).toHaveBeenCalledTimes(1);

    setLastAuthFailureReason(null);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('subscribeAuthStore', () => {
  it('解除関数を呼ぶとリスナーが解除される', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAuthStore(listener);

    unsubscribe();
    setAuthStatus('signedIn');

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('toAuthFailureReason', () => {
  it('reuseDetected=true は kind: reuseDetected を返す', () => {
    const result = toAuthFailureReason('AUTH_REFRESH_TOKEN_REUSE_DETECTED', true);
    expect(result).toEqual({ kind: 'reuseDetected' });
  });

  it('ACCOUNT_SUSPENDED は kind: accountSuspended を返す', () => {
    const result = toAuthFailureReason('ACCOUNT_SUSPENDED', false);
    expect(result).toEqual({ kind: 'accountSuspended' });
  });

  it('その他は kind: sessionExpired を返す', () => {
    const result = toAuthFailureReason('AUTH_REFRESH_TOKEN_INVALID', false);
    expect(result).toEqual({ kind: 'sessionExpired' });
  });
});

describe('resetAuthStoreForTest', () => {
  it('リセット後はリスナーが消える', () => {
    const listener = jest.fn();
    subscribeAuthStore(listener);

    resetAuthStoreForTest();
    setAuthStatus('signedIn'); // reset後なので登録済みリスナーは消えている

    expect(listener).not.toHaveBeenCalled();
  });
});
