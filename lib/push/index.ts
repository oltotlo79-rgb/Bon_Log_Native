/**
 * @module lib/push
 * Push 通知モジュールのパブリック API。
 * このファイルから import してモジュール内部構造への依存を避ける。
 */

export {
  registerDeviceForPushNotifications,
  unregisterDeviceForPushNotifications,
  getPushPermissionStatus,
} from '@/lib/push/device-registration';
export type { PushPermissionStatus } from '@/lib/push/device-registration';

export { setupPushNotifications } from '@/lib/push/notification-setup';
