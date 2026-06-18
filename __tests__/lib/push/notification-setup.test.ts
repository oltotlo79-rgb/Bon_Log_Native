/**
 * lib/push/notification-setup のユニットテスト。
 * expo-notifications は setup.ts で一元モック済み。
 * Android チャネル定数は lib/constants/push から参照する。
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { setupPushNotifications } from '@/lib/push/notification-setup';
import {
  NOTIFICATION_CHANNEL_DEFAULT,
  NOTIFICATION_CHANNEL_DEFAULT_NAME,
} from '@/lib/constants/push';

// ---------------------------------------------------------------------------
// モック参照
// ---------------------------------------------------------------------------

const mockSetNotificationHandler = Notifications.setNotificationHandler as jest.Mock;
const mockSetNotificationChannelAsync = Notifications.setNotificationChannelAsync as jest.Mock;

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockSetNotificationChannelAsync.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// setupPushNotifications
// ---------------------------------------------------------------------------

describe('setupPushNotifications', () => {
  it('setNotificationHandler を呼び出す', async () => {
    await setupPushNotifications();

    expect(mockSetNotificationHandler).toHaveBeenCalledTimes(1);
    expect(mockSetNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({ handleNotification: expect.any(Function) })
    );
  });

  it('handleNotification がフォアグラウンド表示フラグを全て true で返す', async () => {
    await setupPushNotifications();

    const handler = mockSetNotificationHandler.mock.calls[0][0] as {
      handleNotification: () => Promise<Record<string, boolean>>;
    };
    const result = await handler.handleNotification();

    expect(result.shouldShowAlert).toBe(true);
    expect(result.shouldPlaySound).toBe(true);
    expect(result.shouldSetBadge).toBe(true);
  });

  describe('Android 環境の場合', () => {
    const originalOS = Platform.OS;

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: originalOS,
        configurable: true,
      });
    });

    it('setNotificationChannelAsync を呼び出す', async () => {
      await setupPushNotifications();

      expect(mockSetNotificationChannelAsync).toHaveBeenCalledTimes(1);
    });

    it('正しいチャネル ID とチャネル名でチャネルを作成する', async () => {
      await setupPushNotifications();

      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
        NOTIFICATION_CHANNEL_DEFAULT,
        expect.objectContaining({
          name: NOTIFICATION_CHANNEL_DEFAULT_NAME,
          importance: Notifications.AndroidImportance.HIGH,
        })
      );
    });
  });

  describe('iOS 環境の場合', () => {
    const originalOS = Platform.OS;

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: originalOS,
        configurable: true,
      });
    });

    it('setNotificationChannelAsync を呼ばない（iOS はチャネル非対応）', async () => {
      await setupPushNotifications();

      expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });
});
