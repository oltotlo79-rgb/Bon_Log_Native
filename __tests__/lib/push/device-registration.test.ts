/**
 * lib/push/device-registration のユニットテスト。
 * モック境界は lib/api/client（testing.md 規約）。
 * expo-notifications / expo-device / expo-constants は setup.ts で一元モック済み。
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { PermissionStatus } from 'expo-modules-core';
import type { NotificationPermissionsStatus } from 'expo-notifications';
import {
  registerDeviceForPushNotifications,
  unregisterDeviceForPushNotifications,
  getPushPermissionStatus,
  createPushRegistrationGuard,
  cancelPendingPushRegistrations,
} from '@/lib/push/device-registration';
import { SECURE_STORE_PUSH_TOKEN } from '@/lib/constants/secure-store-keys';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientPost = jest.fn();
const mockApiClientDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    POST: (...args: unknown[]) => mockApiClientPost(...args),
    DELETE: (...args: unknown[]) => mockApiClientDelete(...args),
  },
  configureAuthHooks: jest.fn(),
}));

// expo-secure-store はセットアップで in-memory モック済み。
// ここでは各 fn への参照を型付きで取得する。
const mockSecureStoreGet = jest.mocked(SecureStore.getItemAsync);
const mockSecureStoreSet = jest.mocked(SecureStore.setItemAsync);
const mockSecureStoreDelete = jest.mocked(SecureStore.deleteItemAsync);

const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
const mockRequestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
const mockGetExpoPushToken = jest.mocked(Notifications.getExpoPushTokenAsync);
const mockAddPushTokenListener = jest.mocked(Notifications.addPushTokenListener);

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeGrantedPermission(): NotificationPermissionsStatus {
  return {
    granted: true,
    canAskAgain: false,
    status: PermissionStatus.GRANTED,
    expires: 'never',
  };
}

function makeDeniedPermission(canAskAgain: boolean): NotificationPermissionsStatus {
  return {
    granted: false,
    canAskAgain,
    status: canAskAgain ? PermissionStatus.UNDETERMINED : PermissionStatus.DENIED,
    expires: 'never',
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // デフォルト: 許可済み
  mockGetPermissions.mockResolvedValue(makeGrantedPermission());
  mockRequestPermissions.mockResolvedValue(makeGrantedPermission());
  mockGetExpoPushToken.mockResolvedValue({
    data: 'ExponentPushToken[test-token-abc]',
    type: 'expo',
  });

  mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
  mockApiClientDelete.mockResolvedValue({ data: { success: true }, error: undefined });

  // secure-store: 初期は空
  mockSecureStoreGet.mockResolvedValue(null);
  mockSecureStoreSet.mockResolvedValue(undefined);
  mockSecureStoreDelete.mockResolvedValue(undefined);

  // addPushTokenListener はリスナーオブジェクトを返す
  mockAddPushTokenListener.mockReturnValue({ remove: jest.fn() });
});

// ---------------------------------------------------------------------------
// registerDeviceForPushNotifications
// ---------------------------------------------------------------------------

describe('registerDeviceForPushNotifications', () => {
  describe('許可済みの場合', () => {
    it('POST /api/v1/devices を token と platform で呼び出す', async () => {
      const result = await registerDeviceForPushNotifications();

      expect(result).toEqual({ granted: true });
      expect(mockApiClientPost).toHaveBeenCalledTimes(1);
      expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/devices', {
        body: {
          token: 'ExponentPushToken[test-token-abc]',
          platform: expect.stringMatching(/^(android|ios)$/),
        },
      });
    });

    it('取得したトークンを secure-store に保存する', async () => {
      await registerDeviceForPushNotifications();

      expect(mockSecureStoreSet).toHaveBeenCalledWith(
        SECURE_STORE_PUSH_TOKEN,
        'ExponentPushToken[test-token-abc]'
      );
    });

    it('許可ダイアログを要求しない（既に許可済み）', async () => {
      await registerDeviceForPushNotifications();

      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });
  });

  describe('未許可でcanAskAgain=trueの場合', () => {
    beforeEach(() => {
      mockGetPermissions.mockResolvedValue(makeDeniedPermission(true));
    });

    it('requestPermissionsAsync を呼び出す', async () => {
      mockRequestPermissions.mockResolvedValue(makeGrantedPermission());

      await registerDeviceForPushNotifications();

      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });

    it('requestPermissionsAsync で許可が取れたらトークン登録を行う', async () => {
      mockRequestPermissions.mockResolvedValue(makeGrantedPermission());

      const result = await registerDeviceForPushNotifications();

      expect(result).toEqual({ granted: true });
      expect(mockApiClientPost).toHaveBeenCalledTimes(1);
    });

    it('requestPermissionsAsync で拒否されたら登録せず status を返す', async () => {
      mockRequestPermissions.mockResolvedValue(makeDeniedPermission(false));

      const result = await registerDeviceForPushNotifications();

      expect(result).toEqual({ granted: false, canAskAgain: false });
      expect(mockApiClientPost).not.toHaveBeenCalled();
      expect(mockSecureStoreSet).not.toHaveBeenCalled();
    });
  });

  describe('完全拒否済み（canAskAgain=false）の場合', () => {
    beforeEach(() => {
      mockGetPermissions.mockResolvedValue(makeDeniedPermission(false));
    });

    it('許可ダイアログを要求しない', async () => {
      await registerDeviceForPushNotifications();

      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('登録せずに { granted: false, canAskAgain: false } を返す', async () => {
      const result = await registerDeviceForPushNotifications();

      expect(result).toEqual({ granted: false, canAskAgain: false });
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });

  describe('エミュレータ（Device.isDevice === false）の場合', () => {
    beforeEach(() => {
      jest.spyOn(Device, 'isDevice', 'get').mockReturnValue(false);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('許可要求をスキップして { granted: false, canAskAgain: false } を返す', async () => {
      const result = await registerDeviceForPushNotifications();

      expect(result).toEqual({ granted: false, canAskAgain: false });
    });

    it('getPermissionsAsync / requestPermissionsAsync を呼ばない', async () => {
      await registerDeviceForPushNotifications();

      expect(mockGetPermissions).not.toHaveBeenCalled();
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('POST /api/v1/devices を呼ばない', async () => {
      await registerDeviceForPushNotifications();

      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });

  it('トークン変更リスナーを登録する', async () => {
    await registerDeviceForPushNotifications();

    expect(mockAddPushTokenListener).toHaveBeenCalledTimes(1);
    expect(mockAddPushTokenListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('2回目の呼び出しで既存リスナーを解除してから再登録する', async () => {
    const mockRemove = jest.fn();
    mockAddPushTokenListener.mockReturnValue({ remove: mockRemove });

    await registerDeviceForPushNotifications();
    await registerDeviceForPushNotifications();

    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockAddPushTokenListener).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// unregisterDeviceForPushNotifications
// ---------------------------------------------------------------------------

describe('unregisterDeviceForPushNotifications', () => {
  it('進行中の登録完了を待ってから、遅れて保存されたトークンも解除する', async () => {
    type PostResult = { data: { success: boolean }; error: undefined };
    let resolvePost: ((value: PostResult) => void) | undefined;
    let savedToken: string | null = null;

    mockApiClientPost.mockImplementation(
      () =>
        new Promise<PostResult>((resolve) => {
          resolvePost = resolve;
        })
    );
    mockSecureStoreSet.mockImplementation(async (_key, value) => {
      savedToken = value;
    });
    mockSecureStoreGet.mockImplementation(async () => savedToken);

    const registration = registerDeviceForPushNotifications();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockApiClientPost).toHaveBeenCalledTimes(1);

    const unregister = unregisterDeviceForPushNotifications();
    expect(mockSecureStoreGet).not.toHaveBeenCalled();

    if (resolvePost === undefined) {
      throw new Error('POST resolver was not initialized');
    }
    resolvePost({ data: { success: true }, error: undefined });
    await Promise.all([registration, unregister]);

    expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/devices/{token}', {
      params: { path: { token: 'ExponentPushToken[test-token-abc]' } },
    });
    expect(mockSecureStoreDelete).toHaveBeenCalledWith(SECURE_STORE_PUSH_TOKEN);
  });

  it('保存済みの生トークンを path serializer に渡して DELETE を呼び出す', async () => {
    const savedToken = 'ExponentPushToken[saved-token]';
    mockSecureStoreGet.mockResolvedValue(savedToken);

    await unregisterDeviceForPushNotifications();

    expect(mockApiClientDelete).toHaveBeenCalledTimes(1);
    expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/devices/{token}', {
      params: { path: { token: savedToken } },
    });
  });

  it('DELETE 後に secure-store からトークンを削除する', async () => {
    mockSecureStoreGet.mockResolvedValue('ExponentPushToken[saved-token]');

    await unregisterDeviceForPushNotifications();

    expect(mockSecureStoreDelete).toHaveBeenCalledWith(SECURE_STORE_PUSH_TOKEN);
  });

  it('保存済みトークンがない場合は DELETE を呼ばない', async () => {
    mockSecureStoreGet.mockResolvedValue(null);

    await unregisterDeviceForPushNotifications();

    expect(mockApiClientDelete).not.toHaveBeenCalled();
    expect(mockSecureStoreDelete).toHaveBeenCalledWith(SECURE_STORE_PUSH_TOKEN);
  });

  it('DELETE が失敗してもローカルのトークン削除を実施する（fail-safe）', async () => {
    mockSecureStoreGet.mockResolvedValue('ExponentPushToken[saved-token]');
    mockApiClientDelete.mockRejectedValue(new Error('Network error'));

    await expect(unregisterDeviceForPushNotifications()).resolves.toBeUndefined();

    expect(mockSecureStoreDelete).toHaveBeenCalledWith(SECURE_STORE_PUSH_TOKEN);
  });

  it('DELETE 失敗で例外を投げない', async () => {
    mockSecureStoreGet.mockResolvedValue('ExponentPushToken[saved-token]');
    mockApiClientDelete.mockRejectedValue(new Error('403 Forbidden'));

    await expect(unregisterDeviceForPushNotifications()).resolves.toBeUndefined();
  });
});

describe('Push 登録世代 guard', () => {
  it('ログアウト開始で既存 guard を無効化する', () => {
    const isCurrentRegistration = createPushRegistrationGuard();

    expect(isCurrentRegistration()).toBe(true);
    cancelPendingPushRegistrations();
    expect(isCurrentRegistration()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPushPermissionStatus
// ---------------------------------------------------------------------------

describe('getPushPermissionStatus', () => {
  it('許可済みの場合は { granted: true } を返す', async () => {
    mockGetPermissions.mockResolvedValue(makeGrantedPermission());

    const result = await getPushPermissionStatus();

    expect(result).toEqual({ granted: true });
  });

  it('未許可でcanAskAgain=trueの場合は { granted: false, canAskAgain: true } を返す', async () => {
    mockGetPermissions.mockResolvedValue(makeDeniedPermission(true));

    const result = await getPushPermissionStatus();

    expect(result).toEqual({ granted: false, canAskAgain: true });
  });

  it('完全拒否（canAskAgain=false）の場合は { granted: false, canAskAgain: false } を返す', async () => {
    mockGetPermissions.mockResolvedValue(makeDeniedPermission(false));

    const result = await getPushPermissionStatus();

    expect(result).toEqual({ granted: false, canAskAgain: false });
  });

  it('requestPermissionsAsync を呼ばない（状態の読み取りのみ）', async () => {
    mockGetPermissions.mockResolvedValue(makeDeniedPermission(true));

    await getPushPermissionStatus();

    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });
});
