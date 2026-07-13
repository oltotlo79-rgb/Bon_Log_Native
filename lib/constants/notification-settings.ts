/**
 * @module lib/constants/notification-settings
 * ユーザーが切替可能な通知設定キー 11 種と日本語ラベル・説明文の定数。
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

/**
 * 各通知キーの一行説明文。
 * Web (`components/settings/NotificationPreferences.tsx` の `NOTIFICATION_TYPES[].description`) から一字一句転記。
 * frontend は `NotificationToggleRow` の `sublabel` prop にこの値を渡すことで Web と同じ説明文を表示できる。
 */
export const NOTIFICATION_PREFERENCE_DESCRIPTIONS: Record<NotificationPreferenceKey, string> = {
  like: '投稿にいいねされた時',
  comment: '投稿にコメントされた時',
  reply: 'コメントに返信された時',
  comment_like: 'コメントにいいねされた時',
  follow: 'フォローされた時',
  quote: '投稿が引用された時',
  follow_request: 'フォローリクエストを受けた時',
  follow_request_approved: 'フォローリクエストが承認された時',
  mention: '投稿やコメントでメンションされた時',
  message: 'DM を受信した時',
  repost: '投稿がリポストされた時',
};
