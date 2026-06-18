/**
 * @module lib/push/device-registration
 * Push 通知のデバイストークン登録・解除。
 * push-notifications.md: 許可取得後にサーバー登録。ログアウト時に解除。トークン変更で再登録。
 * トークンは秘匿情報に準じる — ログ・Sentry に出さない。
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { EventSubscription } from 'expo-modules-core';
import { apiClient } from '@/lib/api/client';
import { SECURE_STORE_PUSH_TOKEN } from '@/lib/constants/secure-store-keys';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** 許可要求の結果 */
export type PushPermissionStatus =
  | { granted: true }
  | { granted: false; canAskAgain: boolean };

// ---------------------------------------------------------------------------
// モジュール状態
// ---------------------------------------------------------------------------

/** トークン変更リスナーの subscription（解除用に保持） */
let tokenListenerSubscription: EventSubscription | null = null;

// ---------------------------------------------------------------------------
// 内部ユーティリティ
// ---------------------------------------------------------------------------

/** app.json の extra.eas.projectId を型安全に取得する */
function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra;
  if (
    extra !== null &&
    extra !== undefined &&
    typeof extra === 'object' &&
    'eas' in extra &&
    typeof extra.eas === 'object' &&
    extra.eas !== null &&
    'projectId' in extra.eas &&
    typeof extra.eas.projectId === 'string'
  ) {
    return extra.eas.projectId;
  }
  return undefined;
}

/**
 * 物理デバイスかどうかを確認する。
 * エミュレータ上では Expo プッシュトークンを取得できない。
 */
function isPhysicalDevice(): boolean {
  return Device.isDevice;
}

/**
 * 保存済みの Push トークンを取得する。
 * 登録解除時に使用する。
 */
async function getSavedPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_STORE_PUSH_TOKEN);
}

/**
 * Push トークンを secure-store に保存する。
 * トークン文字列はログに出さない。
 */
async function savePushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_PUSH_TOKEN, token);
}

/**
 * Push トークンを secure-store から削除する。
 */
async function deleteSavedPushToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_PUSH_TOKEN);
}

/**
 * Expo プッシュトークンを取得してサーバーに登録する。
 * 登録成功時はトークンを secure-store に保存する。
 * android / ios 以外（web 等）では何もしない。
 */
async function fetchTokenAndRegister(): Promise<void> {
  const os = Platform.OS;

  // android / ios のみ登録する（web 等は skip）
  if (os !== 'android' && os !== 'ios') {
    return;
  }

  const projectId = resolveProjectId();

  const expoPushToken = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const tokenString = expoPushToken.data;

  await apiClient.POST('/api/v1/devices', {
    body: { token: tokenString, platform: os },
  });

  await savePushToken(tokenString);
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/**
 * Push 通知の許可を確認し、未取得なら要求する。
 * 許可が得られた場合はデバイストークンをサーバーに登録する。
 *
 * 呼び出しタイミング: ログイン後、または通知に価値が生まれる文脈で frontend が呼び出す。
 * 初回起動では呼ばないこと（push-notifications.md）。
 *
 * 物理デバイス以外（エミュレータ等）では許可要求をスキップして `{ granted: false, canAskAgain: false }` を返す。
 */
export async function registerDeviceForPushNotifications(): Promise<PushPermissionStatus> {
  if (!isPhysicalDevice()) {
    return { granted: false, canAskAgain: false };
  }

  const existingPermission = await Notifications.getPermissionsAsync();

  let finalPermission = existingPermission;

  if (!existingPermission.granted && existingPermission.canAskAgain) {
    finalPermission = await Notifications.requestPermissionsAsync();
  }

  if (!finalPermission.granted) {
    return { granted: false, canAskAgain: finalPermission.canAskAgain };
  }

  await fetchTokenAndRegister();

  // トークン変更リスナーの登録（既存リスナーがあれば先に解除する）
  if (tokenListenerSubscription !== null) {
    tokenListenerSubscription.remove();
  }

  // DevicePushToken が変わったら Expo プッシュトークンを再取得して再登録する
  tokenListenerSubscription = Notifications.addPushTokenListener(async () => {
    try {
      await fetchTokenAndRegister();
    } catch {
      // 再登録失敗は静かに無視する（次の起動時に再試行される）
    }
  });

  return { granted: true };
}

/**
 * サーバーのデバイストークン登録を解除し、ローカルのトークンを削除する。
 * ログアウト時に必ず呼び出すこと（auth-tokens.md）。
 *
 * サーバー DELETE が失敗してもローカルのトークン削除は必ず実施する（fail-safe）。
 * トークン変更リスナーも解除する。
 */
export async function unregisterDeviceForPushNotifications(): Promise<void> {
  // トークン変更リスナーを解除する
  if (tokenListenerSubscription !== null) {
    tokenListenerSubscription.remove();
    tokenListenerSubscription = null;
  }

  const savedToken = await getSavedPushToken();

  if (savedToken !== null) {
    try {
      // ExponentPushToken[...] の [ ] を URL エンコードする（仕様: delete エンドポイント）
      const encodedToken = encodeURIComponent(savedToken);
      await apiClient.DELETE('/api/v1/devices/{token}', {
        params: { path: { token: encodedToken } },
      });
    } catch {
      // GUEST_NOT_ALLOWED(403) / 429 等のエラーは無視してローカルのクリーンアップを続行する
    }
  }

  await deleteSavedPushToken();
}

/**
 * 現在の Push 通知許可状態を返す。
 * frontend が設定アプリ導線を出すかどうかの判定に使用する。
 */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) {
    return { granted: true };
  }
  return { granted: false, canAskAgain: permission.canAskAgain };
}
