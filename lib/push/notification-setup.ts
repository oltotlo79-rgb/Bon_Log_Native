/**
 * @module lib/push/notification-setup
 * Push 通知の受信ハンドラと Android チャネルの初期化。
 * アプリ起動時に 1 回 setupPushNotifications() を呼び出すこと。
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  NOTIFICATION_CHANNEL_DEFAULT,
  NOTIFICATION_CHANNEL_DEFAULT_NAME,
} from '@/lib/constants/push';

/**
 * フォアグラウンド受信時にバナー・サウンド・バッジを表示する。
 * タップ→画面遷移ロジックは別途 lib/push/device-registration のリスナーで処理する。
 */
function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Android 通知チャネルを作成する。
 * iOS では何もしない（APNs はチャネル概念を持たない）。
 */
async function createAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_DEFAULT, {
    name: NOTIFICATION_CHANNEL_DEFAULT_NAME,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4A7A4A',
  });
}

/**
 * Push 通知の初期化処理。アプリ起動時に 1 回呼び出す。
 * - フォアグラウンド表示ハンドラの設定
 * - Android 通知チャネルの作成（Android 以外は skip）
 */
export async function setupPushNotifications(): Promise<void> {
  configureNotificationHandler();
  await createAndroidChannels();
}
