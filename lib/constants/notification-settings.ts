/**
 * @module lib/constants/notification-settings
 * ユーザーが切替可能な通知設定キー 11 種と日本語ラベルの定数。
 * system / subscription_expiring は切替不可のため含まない（PATCH で送ると 400 VALIDATION_ERROR）。
 */

import type { components } from '@/lib/api/generated/schema.d.ts';

/** ユーザーが切替可能な通知設定の型（NotificationPreferencesResponse のキー）。 */
export type NotificationPreferenceKey = keyof components['schemas']['NotificationPreferencesResponse'];

/**
 * 切替可能な通知キー 11 種の定数配列（型付き）。
 * frontend はこの配列をそのまま設定 UI のリスト生成に使える。
 * system / subscription_expiring はここに含まれない。
 */
export const NOTIFICATION_PREFERENCE_KEYS = [
  'like',
  'comment',
  'reply',
  'comment_like',
  'follow',
  'quote',
  'follow_request',
  'follow_request_approved',
  'mention',
  'message',
  'repost',
] as const satisfies readonly NotificationPreferenceKey[];

/**
 * 各通知キーの日本語ラベル。
 * designer 仕様が後から出た場合に frontend 側で上書き・調整すること。
 */
export const NOTIFICATION_PREFERENCE_LABELS: Record<NotificationPreferenceKey, string> = {
  like: 'いいね',
  comment: 'コメント',
  reply: '返信',
  comment_like: 'コメントへのいいね',
  follow: 'フォロー',
  quote: '引用',
  follow_request: 'フォローリクエスト',
  follow_request_approved: 'フォローリクエストの承認',
  mention: 'メンション',
  message: 'メッセージ',
  repost: 'リポスト',
};
