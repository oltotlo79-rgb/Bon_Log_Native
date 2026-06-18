/**
 * @module lib/constants/push
 * Push 通知関連の定数。
 * チャネル ID はサーバー側のチャネル定義と一致させること（push-notifications.md）。
 */

/**
 * Android 通知チャネル ID（デフォルト）。
 * フォロー・いいね・コメント等の一般的な通知に使用する。
 */
export const NOTIFICATION_CHANNEL_DEFAULT = 'bon-log-default';

/**
 * Android 通知チャネル表示名。
 * OS の通知設定画面に表示される（日本語）。
 */
export const NOTIFICATION_CHANNEL_DEFAULT_NAME = 'Bon_Log 通知';
