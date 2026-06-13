/**
 * @module lib/utils/notification-message
 * 通知 type と actorNickname から表示用本文を生成する純粋関数。
 * type は OpenAPI スキーマ上 string のため union に頼らず文字列比較 + フォールバックで処理する。
 */

import {
  MSG_NOTIFICATION_LIKE,
  MSG_NOTIFICATION_COMMENT_LIKE,
  MSG_NOTIFICATION_COMMENT,
  MSG_NOTIFICATION_REPLY,
  MSG_NOTIFICATION_FOLLOW,
  MSG_NOTIFICATION_FOLLOW_REQUEST,
  MSG_NOTIFICATION_FOLLOW_REQUEST_APPROVED,
  MSG_NOTIFICATION_QUOTE,
  MSG_NOTIFICATION_REPOST,
  MSG_NOTIFICATION_MENTION,
  MSG_NOTIFICATION_MESSAGE,
  MSG_NOTIFICATION_SUBSCRIPTION_EXPIRING,
  MSG_NOTIFICATION_SYSTEM,
  MSG_NOTIFICATION_UNKNOWN,
} from '@/lib/constants/notification-messages';

/**
 * 通知 type と actorNickname から表示用本文を返す。
 *
 * - actorNickname が null のとき: actor 不要の type はそのままテンプレートを使い、
 *   actor が必要な type でも null が渡された場合は MSG_NOTIFICATION_UNKNOWN にフォールバックする。
 *   （サーバーが actor: null を返す場合 — 削除済みユーザーの旧通知等。notifications-screen.md §6.3）
 * - 未知の type: MSG_NOTIFICATION_UNKNOWN にフォールバックし throw しない。
 *
 * @param type           - 通知の種別文字列（OpenAPI の NotificationType 相当）
 * @param actorNickname  - 通知主体のニックネーム。system / subscription_expiring では null
 * @returns 日本語の本文テキスト
 */
export function getNotificationMessage(
  type: string,
  actorNickname: string | null
): string {
  switch (type) {
    case 'like':
      return actorNickname !== null
        ? MSG_NOTIFICATION_LIKE(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'comment_like':
      return actorNickname !== null
        ? MSG_NOTIFICATION_COMMENT_LIKE(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'comment':
      return actorNickname !== null
        ? MSG_NOTIFICATION_COMMENT(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'reply':
      return actorNickname !== null
        ? MSG_NOTIFICATION_REPLY(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'follow':
      return actorNickname !== null
        ? MSG_NOTIFICATION_FOLLOW(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'follow_request':
      return actorNickname !== null
        ? MSG_NOTIFICATION_FOLLOW_REQUEST(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'follow_request_approved':
      return actorNickname !== null
        ? MSG_NOTIFICATION_FOLLOW_REQUEST_APPROVED(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'quote':
      return actorNickname !== null
        ? MSG_NOTIFICATION_QUOTE(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'repost':
      return actorNickname !== null
        ? MSG_NOTIFICATION_REPOST(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'mention':
      return actorNickname !== null
        ? MSG_NOTIFICATION_MENTION(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'message':
      return actorNickname !== null
        ? MSG_NOTIFICATION_MESSAGE(actorNickname)
        : MSG_NOTIFICATION_UNKNOWN;

    case 'subscription_expiring':
      return MSG_NOTIFICATION_SUBSCRIPTION_EXPIRING;

    case 'system':
      return MSG_NOTIFICATION_SYSTEM;

    default:
      return MSG_NOTIFICATION_UNKNOWN;
  }
}
