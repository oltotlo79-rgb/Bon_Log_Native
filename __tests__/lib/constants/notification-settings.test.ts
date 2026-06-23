/**
 * lib/constants/notification-settings のユニットテスト。
 * NOTIFICATION_PREFERENCE_KEYS の完全性と NOTIFICATION_PREFERENCE_LABELS の対応を検証する。
 */

import {
  NOTIFICATION_PREFERENCE_KEYS,
  NOTIFICATION_PREFERENCE_LABELS,
} from '@/lib/constants/notification-settings';

describe('NOTIFICATION_PREFERENCE_KEYS', () => {
  it('11 種のキーを持つ', () => {
    expect(NOTIFICATION_PREFERENCE_KEYS).toHaveLength(11);
  });

  it('system と subscription_expiring を含まない', () => {
    expect(NOTIFICATION_PREFERENCE_KEYS).not.toContain('system');
    expect(NOTIFICATION_PREFERENCE_KEYS).not.toContain('subscription_expiring');
  });

  it('期待するキーをすべて含む', () => {
    const expected = [
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
    ] as const;

    expected.forEach((key) => {
      expect(NOTIFICATION_PREFERENCE_KEYS).toContain(key);
    });
  });

  it('重複キーがない', () => {
    const unique = new Set(NOTIFICATION_PREFERENCE_KEYS);
    expect(unique.size).toBe(NOTIFICATION_PREFERENCE_KEYS.length);
  });
});

describe('NOTIFICATION_PREFERENCE_LABELS', () => {
  it('すべての NOTIFICATION_PREFERENCE_KEYS に対応するラベルを持つ', () => {
    NOTIFICATION_PREFERENCE_KEYS.forEach((key) => {
      expect(NOTIFICATION_PREFERENCE_LABELS[key]).toBeDefined();
      expect(typeof NOTIFICATION_PREFERENCE_LABELS[key]).toBe('string');
      expect(NOTIFICATION_PREFERENCE_LABELS[key].length).toBeGreaterThan(0);
    });
  });

  it('各キーに日本語ラベルが設定されている', () => {
    expect(NOTIFICATION_PREFERENCE_LABELS.like).toBe('いいね');
    expect(NOTIFICATION_PREFERENCE_LABELS.comment).toBe('コメント');
    expect(NOTIFICATION_PREFERENCE_LABELS.follow_request).toBe('フォローリクエスト');
    expect(NOTIFICATION_PREFERENCE_LABELS.follow_request_approved).toBe('フォローリクエストの承認');
  });
});
