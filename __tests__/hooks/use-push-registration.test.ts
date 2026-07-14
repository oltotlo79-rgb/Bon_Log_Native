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
const mockGetPushPermissionStatus = jest.fn();
const mockIsCurrentRegistration = jest.fn();

jest.mock('@/lib/push', () => ({
  createPushRegistrationGuard: () => mockIsCurrentRegistration,
  getPushPermissionStatus: (...args: unknown[]) =>
    mockGetPushPermissionStatus(...args),
  registerDeviceForPushNotifications: (...args: unknown[]) =>
    mockRegisterDevice(...args),
}));

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockIsCurrentRegistration.mockReturnValue(true);
  mockGetPushPermissionStatus.mockResolvedValue({ granted: true, canAskAgain: true });
  mockRegisterDevice.mockResolvedValue({ granted: true });
});

function authProps(status: AuthStatus): { status: AuthStatus } {
  return { status };
}

// ---------------------------------------------------------------------------
// usePushRegistration
// ---------------------------------------------------------------------------

describe('usePushRegistration', () => {
  it('signedIn になった時に registerDeviceForPushNotifications を 1 回呼び出す', async () => {
    const { rerender } = renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: authProps('loading') }
    );

    rerender({ status: 'signedIn' });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    expect(mockGetPushPermissionStatus).toHaveBeenCalledTimes(1);
  });

  it('signedIn 状態で複数回 rerender しても多重発火しない', async () => {
    const { rerender } = renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: authProps('signedIn') }
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
      { initialProps: authProps('signedIn') }
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
      { initialProps: authProps('signedOut') }
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
      { initialProps: authProps('loading') }
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
      { initialProps: authProps('loading') }
    );

    await expect(
      act(async () => {
        rerender({ status: 'signedIn' });
        await Promise.resolve();
      })
    ).resolves.not.toThrow();
  });

  it('通知が未許可なら自動で許可要求を行わず登録もしない', async () => {
    mockGetPushPermissionStatus.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });

    renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: authProps('signedIn') }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetPushPermissionStatus).toHaveBeenCalledTimes(1);
    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it('権限状態の確認に失敗してもエラーを投げない', async () => {
    mockGetPushPermissionStatus.mockRejectedValue(new Error('Permission failed'));

    renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: authProps('signedIn') }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it('権限確認中に signedOut へ遷移した場合は遅れて登録しない', async () => {
    let resolvePermission: ((value: { granted: true }) => void) | undefined;
    mockGetPushPermissionStatus.mockImplementation(
      () =>
        new Promise<{ granted: true }>((resolve) => {
          resolvePermission = resolve;
        })
    );

    const { rerender } = renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: authProps('signedIn') }
    );

    rerender({ status: 'signedOut' });

    await act(async () => {
      if (resolvePermission === undefined) {
        throw new Error('Permission resolver was not initialized');
      }
      resolvePermission({ granted: true });
      await Promise.resolve();
    });

    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it('ログアウト開始で登録世代が無効化された場合は signedIn 表示中でも登録しない', async () => {
    mockIsCurrentRegistration.mockReturnValue(false);

    renderHook(
      ({ status }: { status: AuthStatus }) => usePushRegistration({ status }),
      { initialProps: authProps('signedIn') }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetPushPermissionStatus).toHaveBeenCalledTimes(1);
    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });
});
