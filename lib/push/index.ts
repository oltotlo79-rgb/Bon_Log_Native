/**
 * @module lib/push
 * Push 通知モジュールのパブリック API。
 * このファイルから import してモジュール内部構造への依存を避ける。
 */

export {
  registerDeviceForPushNotifications,
  unregisterDeviceForPushNotifications,
  clearLocalPushNotificationRegistration,
  getPushPermissionStatus,
  createPushRegistrationGuard,
  cancelPendingPushRegistrations,
} from '@/lib/push/device-registration';
export type { PushPermissionStatus } from '@/lib/push/device-registration';

export { setupPushNotifications } from '@/lib/push/notification-setup';

export {
  parseNotificationPushData,
  resolveNotificationRoute,
} from '@/lib/push/notification-routing';
export type { NotificationPushData, NotificationRoute } from '@/lib/push/notification-routing';

export {
  setupNotificationNavigation,
  flushPendingNotificationRoute,
} from '@/lib/push/notification-navigation';
export type {
  NotificationNavigateFn,
  NotificationNavigationDeps,
} from '@/lib/push/notification-navigation';
