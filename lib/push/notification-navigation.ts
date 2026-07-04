/**
 * @module lib/push/notification-navigation
 * Push 通知タップ（フォアグラウンド／バックグラウンド／コールドスタート）を
 * 遷移コールバックへ配線する。
 * expo-router への直接依存は持ち込まず、遷移実行は frontend が注入する
 * コールバックに委譲する（navigation.md: lib は UI 層に依存しない）。
 */

import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import {
  parseNotificationPushData,
  resolveNotificationRoute,
  type NotificationRoute,
} from '@/lib/push/notification-routing';

export type NotificationNavigateFn = (route: NotificationRoute) => void;

export type NotificationNavigationDeps = {
  /** 遷移実行コールバック（例: `(route) => router.push(route)`）。 */
  navigate: NotificationNavigateFn;
  /**
   * 遷移を今すぐ実行してよいかを返す（例: 認証済みかどうか）。
   * false を返した場合は遷移を保留し、`flushPendingNotificationRoute` 呼び出し時に実行する。
   * 省略時は常に遷移可能として扱う。
   */
  canNavigateNow?: () => boolean;
};

// ---------------------------------------------------------------------------
// モジュール状態
// ---------------------------------------------------------------------------

/** 未認証時等に保留された遷移先。ログイン完了後に flushPendingNotificationRoute で処理する。 */
let pendingRoute: NotificationRoute | null = null;

function dispatchRoute(route: NotificationRoute, deps: NotificationNavigationDeps): void {
  const canNavigateNow = deps.canNavigateNow ? deps.canNavigateNow() : true;
  if (canNavigateNow) {
    deps.navigate(route);
    return;
  }
  pendingRoute = route;
}

function handleResponse(
  response: Notifications.NotificationResponse,
  deps: NotificationNavigationDeps
): void {
  const data = parseNotificationPushData(response.notification.request.content.data);
  dispatchRoute(resolveNotificationRoute(data), deps);
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/**
 * Push 通知タップの配線を初期化する。アプリ起動時（ルートレイアウト）に 1 回呼び出すこと。
 * - フォアグラウンド／バックグラウンドでのタップ: `addNotificationResponseReceivedListener`
 * - コールドスタート（通知タップでアプリを起動した場合）: 呼び出し時に 1 回だけ最終レスポンスを確認する
 *
 * @returns リスナー解除関数。画面アンマウント時に呼び出すこと。
 */
export function setupNotificationNavigation(deps: NotificationNavigationDeps): () => void {
  const subscription: EventSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      handleResponse(response, deps);
    }
  );

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response !== null) {
      handleResponse(response, deps);
    }
    // 同じコールドスタートレスポンスで再度遷移させないため、確認後にクリアする
    void Notifications.clearLastNotificationResponseAsync();
  });

  return () => {
    subscription.remove();
  };
}

/**
 * 保留中の通知遷移があれば実行する。
 * ログイン完了直後など、`canNavigateNow` が true に変わったタイミングで frontend が呼び出す。
 * 保留が無ければ何もしない。
 */
export function flushPendingNotificationRoute(navigate: NotificationNavigateFn): void {
  if (pendingRoute === null) {
    return;
  }
  const route = pendingRoute;
  pendingRoute = null;
  navigate(route);
}

/**
 * テスト用: モジュール内部の保留状態をリセットする。
 * アプリコードから呼び出さないこと。
 */
export function resetPendingNotificationRouteForTest(): void {
  pendingRoute = null;
}
