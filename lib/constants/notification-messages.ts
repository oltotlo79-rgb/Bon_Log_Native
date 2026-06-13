/**
 * @module lib/constants/notification-messages
 * 通知 type 別の本文テンプレート定数。
 * 文言はすべて designer 仕様（docs/design/notifications-screen.md §11）に従う。
 * actorNickname の差し込みはテンプレート関数で行う。
 */

// ---------------------------------------------------------------------------
// actorNickname あり（インタラクション通知）
// ---------------------------------------------------------------------------

/** {nickname} さんがあなたの投稿にいいねしました */
export const MSG_NOTIFICATION_LIKE = (nickname: string): string =>
  `${nickname}さんがあなたの投稿にいいねしました`;

/** {nickname} さんがあなたのコメントにいいねしました */
export const MSG_NOTIFICATION_COMMENT_LIKE = (nickname: string): string =>
  `${nickname}さんがあなたのコメントにいいねしました`;

/** {nickname} さんがあなたの投稿にコメントしました */
export const MSG_NOTIFICATION_COMMENT = (nickname: string): string =>
  `${nickname}さんがあなたの投稿にコメントしました`;

/** {nickname} さんがあなたのコメントに返信しました */
export const MSG_NOTIFICATION_REPLY = (nickname: string): string =>
  `${nickname}さんがあなたのコメントに返信しました`;

/** {nickname} さんがあなたをフォローしました */
export const MSG_NOTIFICATION_FOLLOW = (nickname: string): string =>
  `${nickname}さんがあなたをフォローしました`;

/** {nickname} さんからフォローリクエストが届きました */
export const MSG_NOTIFICATION_FOLLOW_REQUEST = (nickname: string): string =>
  `${nickname}さんからフォローリクエストが届きました`;

/** {nickname} さんがフォローリクエストを承認しました */
export const MSG_NOTIFICATION_FOLLOW_REQUEST_APPROVED = (nickname: string): string =>
  `${nickname}さんがフォローリクエストを承認しました`;

/** {nickname} さんがあなたの投稿を引用しました */
export const MSG_NOTIFICATION_QUOTE = (nickname: string): string =>
  `${nickname}さんがあなたの投稿を引用しました`;

/** {nickname} さんがあなたの投稿をリポストしました */
export const MSG_NOTIFICATION_REPOST = (nickname: string): string =>
  `${nickname}さんがあなたの投稿をリポストしました`;

/** {nickname} さんがあなたをメンションしました */
export const MSG_NOTIFICATION_MENTION = (nickname: string): string =>
  `${nickname}さんがあなたをメンションしました`;

/** {nickname} さんからメッセージが届きました */
export const MSG_NOTIFICATION_MESSAGE = (nickname: string): string =>
  `${nickname}さんからメッセージが届きました`;

// ---------------------------------------------------------------------------
// actorNickname なし（システム通知）
// ---------------------------------------------------------------------------

/** プレミアム会員の有効期限が近づいています */
export const MSG_NOTIFICATION_SUBSCRIPTION_EXPIRING =
  'プレミアム会員の有効期限が近づいています';

/** 運営からのお知らせがあります */
export const MSG_NOTIFICATION_SYSTEM = '運営からのお知らせがあります';

// ---------------------------------------------------------------------------
// フォールバック
// ---------------------------------------------------------------------------

/**
 * 未知の type に対するフォールバック文言（notifications-screen.md §11）。
 * actor が null かつ type が未知の場合も含む。
 */
export const MSG_NOTIFICATION_UNKNOWN = 'お知らせがあります';
