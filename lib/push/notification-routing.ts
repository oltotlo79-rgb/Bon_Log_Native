/**
 * @module lib/push/notification-routing
 * Push 通知タップ時の遷移先解決。
 *
 * サーバー（Bon_Log_cfw `lib/services/notification-core.ts`）は現状 Expo Push の
 * `data` に `{ url, type }` のみを載せる（`url` は `postId` があれば `/posts/{id}`、
 * なければ `/notifications`）。`postId` 自体は含まれないため、post 系通知は
 * `url` から抽出して補う。`actorId` / `commentId` / `conversationId` は現状ペイロードに
 * 含まれず、将来サーバーが追加した場合に備えて型だけ用意している（フォロー・
 * メッセージ通知は現状 `/notifications` へのフォールバックになる — 詳細は報告参照）。
 */

import {
  ROUTE_NOTIFICATIONS,
  ROUTE_FOLLOW_REQUESTS,
  ROUTE_SETTINGS_SUBSCRIPTION,
  routePostDetail,
  routeUserDetail,
  routeMessageThread,
} from '@/lib/constants/routes';

/** 投稿詳細への遷移が対応する通知タイプ（`types/notification.ts` の NotificationType と同期）。 */
const POST_LINKED_NOTIFICATION_TYPES = new Set([
  'like',
  'comment',
  'reply',
  'comment_like',
  'quote',
  'repost',
  'mention',
]);

/** 対象ユーザー詳細への遷移が対応する通知タイプ。 */
const USER_LINKED_NOTIFICATION_TYPES = new Set(['follow', 'follow_request_approved']);

export type NotificationRoute =
  | ReturnType<typeof routePostDetail>
  | ReturnType<typeof routeUserDetail>
  | ReturnType<typeof routeMessageThread>
  | typeof ROUTE_FOLLOW_REQUESTS
  | typeof ROUTE_SETTINGS_SUBSCRIPTION
  | typeof ROUTE_NOTIFICATIONS;

/**
 * Expo Push の `data` から読み取る通知ペイロード。
 * サーバーが将来フィールドを追加しても壊れないよう、既知フィールドはすべて任意（欠落時 null）。
 */
export type NotificationPushData = {
  type: string | null;
  postId: string | null;
  commentId: string | null;
  actorId: string | null;
  conversationId: string | null;
  url: string | null;
};

function readStringField(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * `url` が `/posts/{id}` 形式の場合に postId を抽出する。
 * notification-core.ts が postId を `data` に直接含めず url に埋め込むため、
 * postId 未指定時のフォールバック抽出として使う。
 */
function extractPostIdFromUrl(url: string | null): string | null {
  if (url === null) {
    return null;
  }
  const match = /^\/posts\/([^/?#]+)/.exec(url);
  return match ? match[1] : null;
}

/**
 * expo-notifications の `notification.request.content.data`（`unknown`）を安全にパースする。
 * どのキーも欠落・型不一致があり得るため、それぞれ独立に検証し null にフォールバックする。
 */
export function parseNotificationPushData(raw: unknown): NotificationPushData {
  const source: Record<string, unknown> =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  const url = readStringField(source, 'url');
  const postId = readStringField(source, 'postId') ?? extractPostIdFromUrl(url);

  return {
    type: readStringField(source, 'type'),
    postId,
    commentId: readStringField(source, 'commentId'),
    actorId: readStringField(source, 'actorId'),
    conversationId: readStringField(source, 'conversationId'),
    url,
  };
}

/**
 * 通知ペイロードから遷移先ルートを解決する純関数。
 *
 * 対応（`docs/design/notifications-screen.md` §6.1 準拠 + 現行実装の follow-requests/messages 画面を反映）:
 * - like / comment / reply / comment_like / quote / repost / mention → 投稿詳細（postId 不明時は通知一覧）
 * - follow / follow_request_approved → 対象ユーザー（actorId 不明時は通知一覧）
 * - follow_request → フォローリクエスト一覧
 * - message → 会話スレッド（conversationId 不明時は通知一覧）
 * - subscription_expiring → サブスクリプション設定
 * - system・不明タイプ → 通知一覧
 */
export function resolveNotificationRoute(data: NotificationPushData): NotificationRoute {
  const { type, postId, actorId, conversationId } = data;

  if (type !== null && POST_LINKED_NOTIFICATION_TYPES.has(type)) {
    return postId !== null ? routePostDetail(postId) : ROUTE_NOTIFICATIONS;
  }

  if (type !== null && USER_LINKED_NOTIFICATION_TYPES.has(type)) {
    return actorId !== null ? routeUserDetail(actorId) : ROUTE_NOTIFICATIONS;
  }

  if (type === 'follow_request') {
    return ROUTE_FOLLOW_REQUESTS;
  }

  if (type === 'message') {
    return conversationId !== null ? routeMessageThread(conversationId) : ROUTE_NOTIFICATIONS;
  }

  if (type === 'subscription_expiring') {
    return ROUTE_SETTINGS_SUBSCRIPTION;
  }

  return ROUTE_NOTIFICATIONS;
}
