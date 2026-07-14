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

/** ログアウト開始後に古い非同期登録を進めないための世代番号。 */
let registrationGeneration = 0;

/** unregister が進行中の登録完了を待ち、最終状態を必ず未登録にするため保持する。 */
const pendingRegistrations = new Set<Promise<unknown>>();

/** logout / auth failure が listener 由来の再登録も待てるよう全登録処理を追跡する。 */
function trackRegistration<T>(registration: Promise<T>): Promise<T> {
  pendingRegistrations.add(registration);
  const removePendingRegistration = (): void => {
    pendingRegistrations.delete(registration);
  };
  void registration.then(removePendingRegistration, removePendingRegistration);
  return registration;
}

async function waitForPendingRegistrations(): Promise<void> {
  while (pendingRegistrations.size > 0) {
    await Promise.allSettled([...pendingRegistrations]);
  }
}

/** 現在の認証セッションに属する Push 登録かを後から判定する guard を返す。 */
export function createPushRegistrationGuard(): () => boolean {
  const generation = registrationGeneration;
  return () => generation === registrationGeneration;
}

/** ログアウト開始時に、権限確認待ちなどの古い登録試行を無効化する。 */
export function cancelPendingPushRegistrations(): void {
  registrationGeneration += 1;
}

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
async function performDeviceRegistration(): Promise<PushPermissionStatus> {
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
      await trackRegistration(fetchTokenAndRegister());
    } catch {
      // 再登録失敗は静かに無視する（次の起動時に再試行される）
    }
  });

  return { granted: true };
}

export function registerDeviceForPushNotifications(): Promise<PushPermissionStatus> {
  return trackRegistration(performDeviceRegistration());
}

/**
 * サーバーのデバイストークン登録を解除し、ローカルのトークンを削除する。
 * ログアウト時に必ず呼び出すこと（auth-tokens.md）。
 *
 * サーバー DELETE が失敗してもローカルのトークン削除は必ず実施する（fail-safe）。
 * トークン変更リスナーも解除する。
 */
export async function unregisterDeviceForPushNotifications(): Promise<void> {
  cancelPendingPushRegistrations();

  // 新しい listener callback を開始させないよう、待機前に購読を解除する。
  if (tokenListenerSubscription !== null) {
    tokenListenerSubscription.remove();
    tokenListenerSubscription = null;
  }

  // 既に API 登録が始まっている場合は完了を待ってから解除し、
  // 遅れて保存されたトークンや listener がログアウト後に残らないようにする。
  await waitForPendingRegistrations();

  const savedToken = await getSavedPushToken();

  if (savedToken !== null) {
    try {
      // openapi-fetch の path serializer が URL エンコードするため、生トークンを渡して二重変換を避ける。
      await apiClient.DELETE('/api/v1/devices/{token}', {
        params: { path: { token: savedToken } },
      });
    } catch {
      // GUEST_NOT_ALLOWED(403) / 429 等のエラーは無視してローカルのクリーンアップを続行する
    }
  }

  await deleteSavedPushToken();
}

/**
 * Push 登録のローカル状態だけを破棄する。
 *
 * 認証更新失敗時はアクセストークンも無効なため、解除 API を呼ぶと別の 401 を発生させる。
 * その経路では本関数を使い、進行中の登録を無効化してから listener と保存済みトークンを消す。
 */
export async function clearLocalPushNotificationRegistration(): Promise<void> {
  cancelPendingPushRegistrations();

  if (tokenListenerSubscription !== null) {
    tokenListenerSubscription.remove();
    tokenListenerSubscription = null;
  }

  // 遅れて完了した登録が token / listener を残さないよう、進行中処理の完了を待つ。
  await waitForPendingRegistrations();

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
