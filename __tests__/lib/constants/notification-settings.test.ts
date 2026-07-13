/**
 * lib/constants/notification-settings のユニットテスト。
 * NOTIFICATION_PREFERENCE_KEYS の完全性と NOTIFICATION_PREFERENCE_LABELS /
 * NOTIFICATION_PREFERENCE_DESCRIPTIONS の対応を検証する。
 */

import {
  NOTIFICATION_PREFERENCE_KEYS,
  NOTIFICATION_PREFERENCE_LABELS,
  NOTIFICATION_PREFERENCE_DESCRIPTIONS,
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
    expect(NOTIFICATION_PREFERENCE_LABELS.follow_request_approved).toBe('フォロー承認');
  });

  it('Web 表記に整合された 4 キーのラベルを持つ（be1f44b）', () => {
    expect(NOTIFICATION_PREFERENCE_LABELS.comment_like).toBe('コメントいいね');
    expect(NOTIFICATION_PREFERENCE_LABELS.quote).toBe('引用投稿');
    expect(NOTIFICATION_PREFERENCE_LABELS.follow_request_approved).toBe('フォロー承認');
    expect(NOTIFICATION_PREFERENCE_LABELS.message).toBe('ダイレクトメッセージ');
  });

  it('Web 整合の対象外だった 7 キーのラベルは変わらない', () => {
    expect(NOTIFICATION_PREFERENCE_LABELS.like).toBe('いいね');
    expect(NOTIFICATION_PREFERENCE_LABELS.comment).toBe('コメント');
    expect(NOTIFICATION_PREFERENCE_LABELS.reply).toBe('返信');
    expect(NOTIFICATION_PREFERENCE_LABELS.follow).toBe('フォロー');
    expect(NOTIFICATION_PREFERENCE_LABELS.follow_request).toBe('フォローリクエスト');
    expect(NOTIFICATION_PREFERENCE_LABELS.mention).toBe('メンション');
    expect(NOTIFICATION_PREFERENCE_LABELS.repost).toBe('リポスト');
  });
});

describe('NOTIFICATION_PREFERENCE_DESCRIPTIONS', () => {
  it('すべての NOTIFICATION_PREFERENCE_KEYS に対応する説明文を持つ', () => {
    NOTIFICATION_PREFERENCE_KEYS.forEach((key) => {
      expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS[key]).toBeDefined();
      expect(typeof NOTIFICATION_PREFERENCE_DESCRIPTIONS[key]).toBe('string');
      expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS[key].length).toBeGreaterThan(0);
    });
  });

  it('各キーに Web (NotificationPreferences.tsx) と一致する説明文が設定されている', () => {
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.like).toBe('投稿にいいねされた時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.comment).toBe('投稿にコメントされた時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.reply).toBe('コメントに返信された時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.comment_like).toBe('コメントにいいねされた時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.follow).toBe('フォローされた時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.quote).toBe('投稿が引用された時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.follow_request).toBe('フォローリクエストを受けた時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.follow_request_approved).toBe(
      'フォローリクエストが承認された時'
    );
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.mention).toBe('投稿やコメントでメンションされた時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.message).toBe('DM を受信した時');
    expect(NOTIFICATION_PREFERENCE_DESCRIPTIONS.repost).toBe('投稿がリポストされた時');
  });

  it('NOTIFICATION_PREFERENCE_KEYS と同じ 11 キーちょうどを持つ（余剰・不足がない）', () => {
    const descriptionKeys = Object.keys(NOTIFICATION_PREFERENCE_DESCRIPTIONS);
    expect(descriptionKeys).toHaveLength(NOTIFICATION_PREFERENCE_KEYS.length);
    NOTIFICATION_PREFERENCE_KEYS.forEach((key) => {
      expect(descriptionKeys).toContain(key);
    });
  });
});
