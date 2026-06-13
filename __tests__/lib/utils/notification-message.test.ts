/**
 * lib/utils/notification-message の getNotificationMessage 純粋関数テスト。
 * 全 13 type の正常系・actorNickname null フォールバック・未知 type フォールバックを網羅する。
 */

import { getNotificationMessage } from '@/lib/utils/notification-message';
import {
  MSG_NOTIFICATION_SUBSCRIPTION_EXPIRING,
  MSG_NOTIFICATION_SYSTEM,
  MSG_NOTIFICATION_UNKNOWN,
} from '@/lib/constants/notification-messages';

const ACTOR = '盆栽太郎';

describe('getNotificationMessage — actorNickname あり（13 type）', () => {
  it('like: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('like', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('いいね');
  });

  it('comment_like: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('comment_like', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('いいね');
    expect(result).toContain('コメント');
  });

  it('comment: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('comment', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('コメント');
  });

  it('reply: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('reply', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('返信');
  });

  it('follow: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('follow', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('フォロー');
  });

  it('follow_request: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('follow_request', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('フォローリクエスト');
  });

  it('follow_request_approved: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('follow_request_approved', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('承認');
  });

  it('quote: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('quote', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('引用');
  });

  it('repost: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('repost', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('リポスト');
  });

  it('mention: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('mention', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('メンション');
  });

  it('message: actorNickname を含む文言を返す', () => {
    const result = getNotificationMessage('message', ACTOR);
    expect(result).toContain(ACTOR);
    expect(result).toContain('メッセージ');
  });

  it('subscription_expiring: actorNickname を無視し固定文言を返す', () => {
    const result = getNotificationMessage('subscription_expiring', ACTOR);
    expect(result).toBe(MSG_NOTIFICATION_SUBSCRIPTION_EXPIRING);
    expect(result).not.toContain(ACTOR);
  });

  it('system: actorNickname を無視し固定文言を返す', () => {
    const result = getNotificationMessage('system', ACTOR);
    expect(result).toBe(MSG_NOTIFICATION_SYSTEM);
    expect(result).not.toContain(ACTOR);
  });
});

describe('getNotificationMessage — actorNickname が null のフォールバック', () => {
  it('like で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('like', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('comment_like で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('comment_like', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('comment で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('comment', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('reply で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('reply', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('follow で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('follow', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('follow_request で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('follow_request', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('follow_request_approved で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('follow_request_approved', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('quote で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('quote', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('repost で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('repost', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('mention で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('mention', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('message で actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('message', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('subscription_expiring で actorNickname が null → 固定文言を返す', () => {
    expect(getNotificationMessage('subscription_expiring', null)).toBe(
      MSG_NOTIFICATION_SUBSCRIPTION_EXPIRING
    );
  });

  it('system で actorNickname が null → 固定文言を返す', () => {
    expect(getNotificationMessage('system', null)).toBe(MSG_NOTIFICATION_SYSTEM);
  });
});

describe('getNotificationMessage — 未知 type のフォールバック', () => {
  it('未知の type（空文字）→ MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('', ACTOR)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('未知の type（将来の新 type 文字列）→ MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('new_future_type', ACTOR)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('未知の type かつ actorNickname が null → MSG_NOTIFICATION_UNKNOWN を返す', () => {
    expect(getNotificationMessage('unknown_type', null)).toBe(MSG_NOTIFICATION_UNKNOWN);
  });

  it('throw しない（未知 type でも例外を発生させない）', () => {
    expect(() => getNotificationMessage('completely_unknown', null)).not.toThrow();
  });
});

describe('getNotificationMessage — 文言の内容チェック', () => {
  it('各 type の文言は空文字でない', () => {
    const types = [
      'like',
      'comment_like',
      'comment',
      'reply',
      'follow',
      'follow_request',
      'follow_request_approved',
      'quote',
      'repost',
      'mention',
      'message',
      'subscription_expiring',
      'system',
    ];

    for (const type of types) {
      expect(getNotificationMessage(type, ACTOR).length).toBeGreaterThan(0);
    }
  });

  it('MSG_NOTIFICATION_UNKNOWN は空文字でない', () => {
    expect(MSG_NOTIFICATION_UNKNOWN.length).toBeGreaterThan(0);
  });

  it('subscription_expiring の文言に actorNickname を渡しても含まれない', () => {
    const result = getNotificationMessage('subscription_expiring', '任意のニックネーム');
    expect(result).not.toContain('任意のニックネーム');
  });

  it('system の文言に actorNickname を渡しても含まれない', () => {
    const result = getNotificationMessage('system', '任意のニックネーム');
    expect(result).not.toContain('任意のニックネーム');
  });
});
