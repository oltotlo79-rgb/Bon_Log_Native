/**
 * lib/auth/use-auth のユニットテスト。
 * auth-store の状態変化に追従することを確認する。
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  resetAuthStoreForTest,
  setAuthStatus,
  setLastAuthFailureReason,
} from '@/lib/auth/auth-store';
import { useAuth } from '@/lib/auth/use-auth';

// use-auth はセットアップの一元モックを override して実 use-auth を使う必要があるため
// setup.ts のモックを外して実モジュールを使う
jest.unmock('@/lib/auth/use-auth');

beforeEach(() => {
  resetAuthStoreForTest();
});

describe('useAuth', () => {
  describe('status の反映', () => {
    it('初期状態は loading になる', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.status).toBe('loading');
    });

    it('auth-store が signedIn になると status が更新される', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setAuthStatus('signedIn');
      });

      expect(result.current.status).toBe('signedIn');
    });

    it('auth-store が signedOut になると status が更新される', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setAuthStatus('signedOut');
      });

      expect(result.current.status).toBe('signedOut');
    });
  });

  describe('isSignedIn の導出', () => {
    it('status が loading のとき isSignedIn は false', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isSignedIn).toBe(false);
    });

    it('status が signedIn のとき isSignedIn は true', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setAuthStatus('signedIn');
      });

      expect(result.current.isSignedIn).toBe(true);
    });

    it('status が signedOut のとき isSignedIn は false', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setAuthStatus('signedOut');
      });

      expect(result.current.isSignedIn).toBe(false);
    });
  });

  describe('isLoading の導出', () => {
    it('status が loading のとき isLoading は true', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(true);
    });

    it('status が signedIn のとき isLoading は false', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setAuthStatus('signedIn');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('status が signedOut のとき isLoading は false', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setAuthStatus('signedOut');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('lastAuthFailureReason の反映', () => {
    it('初期状態は null', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.lastAuthFailureReason).toBeNull();
    });

    it('reuseDetected が設定されると反映される', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setLastAuthFailureReason({ kind: 'reuseDetected' });
      });

      expect(result.current.lastAuthFailureReason).toEqual({ kind: 'reuseDetected' });
    });

    it('sessionExpired が設定されると反映される', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setLastAuthFailureReason({ kind: 'sessionExpired' });
      });

      expect(result.current.lastAuthFailureReason).toEqual({ kind: 'sessionExpired' });
    });

    it('null にリセットされると null が返る', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        setLastAuthFailureReason({ kind: 'reuseDetected' });
      });

      act(() => {
        setLastAuthFailureReason(null);
      });

      expect(result.current.lastAuthFailureReason).toBeNull();
    });
  });

  describe('アンマウント後の購読解除', () => {
    it('アンマウント後にストアが変化してもエラーが発生しない', () => {
      const { unmount } = renderHook(() => useAuth());
      unmount();

      // アンマウント後のストア更新でエラーが起きないことを確認
      expect(() => {
        setAuthStatus('signedIn');
      }).not.toThrow();
    });
  });
});
