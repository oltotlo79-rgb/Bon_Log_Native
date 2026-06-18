/**
 * hooks/use-push-registration のユニットテスト。
 * モック境界は lib/push（testing.md 規約）。
 */

import { renderHook, act } from '@testing-library/react-native';
import { usePushRegistration } from '@/hooks/use-push-registration';
import type { AuthStatus } from '@/lib/auth/auth-store';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockRegisterDevice = jest.fn();

jest.mock('@/lib/push', () => ({
  registerDeviceForPushNotifications: (...args: unknown[]) =>
    mockRegisterDevice(...args),
}));

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockRegisterDevice.mockResolvedValue({ granted: true });
});

// ---------------------------------------------------------------------------
// usePushRegistration
// ---------------------------------------------------------------------------

describe('usePushRegistration', () => {
  it('signedIn になった時に registerDeviceForPushNotifications を 1 回呼び出す', async () => {
    const { rerender } = renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: { status: 'loading' as AuthStatus } }
    );

    rerender({ status: 'signedIn' });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
  });

  it('signedIn 状態で複数回 rerender しても多重発火しない', async () => {
    const { rerender } = renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: { status: 'signedIn' as AuthStatus } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    rerender({ status: 'signedIn' });
    rerender({ status: 'signedIn' });
    rerender({ status: 'signedIn' });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
  });

  it('signedOut → signedIn で再サインインしたら再度 register を呼び出す', async () => {
    const { rerender } = renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: { status: 'signedIn' as AuthStatus } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);

    // signedOut でフラグリセット
    rerender({ status: 'signedOut' });

    await act(async () => {
      await Promise.resolve();
    });

    // 再サインイン
    rerender({ status: 'signedIn' });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
  });

  it('signedOut の間は register を呼ばない', async () => {
    const { rerender } = renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: { status: 'signedOut' as AuthStatus } }
    );

    rerender({ status: 'signedOut' });
    rerender({ status: 'signedOut' });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it('loading 状態では register を呼ばない', async () => {
    renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: { status: 'loading' as AuthStatus } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it('register が失敗してもエラーを投げない（アプリは継続する）', async () => {
    mockRegisterDevice.mockRejectedValue(new Error('Register failed'));

    const { rerender } = renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: { status: 'loading' as AuthStatus } }
    );

    await expect(
      act(async () => {
        rerender({ status: 'signedIn' });
        await Promise.resolve();
      })
    ).resolves.not.toThrow();
  });
});
