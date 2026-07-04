/**
 * lib/push/notification-routing のユニットテスト。
 * 純関数 resolveNotificationRoute / parseNotificationPushData を検証する。
 * ネイティブモジュール依存なし（純粋ロジックのみ）。
 */

import {
  resolveNotificationRoute,
  parseNotificationPushData,
  type NotificationPushData,
} from '@/lib/push/notification-routing';
import {
  ROUTE_NOTIFICATIONS,
  ROUTE_FOLLOW_REQUESTS,
  ROUTE_SETTINGS_SUBSCRIPTION,
  routePostDetail,
  routeUserDetail,
  routeMessageThread,
} from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeData(overrides: Partial<NotificationPushData> = {}): NotificationPushData {
  return {
    type: null,
    postId: null,
    commentId: null,
    actorId: null,
    conversationId: null,
    url: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseNotificationPushData
// ---------------------------------------------------------------------------

describe('parseNotificationPushData', () => {
  it('全フィールドが揃った data をそのまま読み取る', () => {
    const result = parseNotificationPushData({
      type: 'like',
      postId: 'post-1',
      commentId: 'comment-1',
      actorId: 'actor-1',
      conversationId: 'conv-1',
      url: '/posts/post-1',
    });

    expect(result).toEqual({
      type: 'like',
      postId: 'post-1',
      commentId: 'comment-1',
      actorId: 'actor-1',
      conversationId: 'conv-1',
      url: '/posts/post-1',
    });
  });

  it('欠落したフィールドは null になる', () => {
    const result = parseNotificationPushData({ type: 'follow' });

    expect(result).toEqual(
      makeData({ type: 'follow' })
    );
  });

  it('postId が無く url が /posts/{id} 形式の場合は url から抽出する', () => {
    const result = parseNotificationPushData({ type: 'like', url: '/posts/abc123' });

    expect(result.postId).toBe('abc123');
  });

  it('postId が data に直接あればそれを優先し url からは抽出しない', () => {
    const result = parseNotificationPushData({
      type: 'like',
      postId: 'direct-id',
      url: '/posts/from-url',
    });

    expect(result.postId).toBe('direct-id');
  });

  it('url にクエリ文字列が付与されていても postId を抽出できる', () => {
    const result = parseNotificationPushData({ url: '/posts/xyz789?ref=push#frag' });

    expect(result.postId).toBe('xyz789');
  });

  it('url が /posts/ 形式でなければ postId は null', () => {
    const result = parseNotificationPushData({ url: '/notifications' });

    expect(result.postId).toBeNull();
  });

  it('空文字列フィールドは null 扱いになる', () => {
    const result = parseNotificationPushData({ type: '', postId: '', url: '' });

    expect(result).toEqual(makeData());
  });

  it('フィールドの型が不一致（数値・オブジェクト等）でも null にフォールバックする', () => {
    const result = parseNotificationPushData({
      type: 123,
      postId: { id: 'post-1' },
      actorId: true,
      conversationId: undefined,
      url: null,
    });

    expect(result).toEqual(makeData());
  });

  it('raw が null の場合でも例外を投げず全フィールド null を返す', () => {
    expect(() => parseNotificationPushData(null)).not.toThrow();
    expect(parseNotificationPushData(null)).toEqual(makeData());
  });

  it('raw が文字列・数値等オブジェクトでない場合でも安全にフォールバックする', () => {
    expect(parseNotificationPushData('unexpected-string')).toEqual(makeData());
    expect(parseNotificationPushData(42)).toEqual(makeData());
    expect(parseNotificationPushData(undefined)).toEqual(makeData());
  });
});

// ---------------------------------------------------------------------------
// resolveNotificationRoute — 投稿系通知
// ---------------------------------------------------------------------------

describe('resolveNotificationRoute: 投稿系通知', () => {
  const postLinkedTypes = ['like', 'comment', 'reply', 'comment_like', 'quote', 'repost', 'mention'];

  it.each(postLinkedTypes)('%s: postId があれば投稿詳細へ遷移する', (type) => {
    const route = resolveNotificationRoute(makeData({ type, postId: 'post-42' }));
    expect(route).toBe(routePostDetail('post-42'));
  });

  it.each(postLinkedTypes)('%s: postId が無ければ通知一覧へ遷移する', (type) => {
    const route = resolveNotificationRoute(makeData({ type, postId: null }));
    expect(route).toBe(ROUTE_NOTIFICATIONS);
  });
});

// ---------------------------------------------------------------------------
// resolveNotificationRoute — ユーザー系通知
// ---------------------------------------------------------------------------

describe('resolveNotificationRoute: ユーザー系通知', () => {
  const userLinkedTypes = ['follow', 'follow_request_approved'];

  it.each(userLinkedTypes)('%s: actorId があればユーザー詳細へ遷移する', (type) => {
    const route = resolveNotificationRoute(makeData({ type, actorId: 'user-7' }));
    expect(route).toBe(routeUserDetail('user-7'));
  });

  it.each(userLinkedTypes)('%s: actorId が無ければ通知一覧へ遷移する', (type) => {
    const route = resolveNotificationRoute(makeData({ type, actorId: null }));
    expect(route).toBe(ROUTE_NOTIFICATIONS);
  });
});

// ---------------------------------------------------------------------------
// resolveNotificationRoute — フォローリクエスト
// ---------------------------------------------------------------------------

describe('resolveNotificationRoute: follow_request', () => {
  it('フォローリクエスト一覧へ遷移する', () => {
    const route = resolveNotificationRoute(makeData({ type: 'follow_request' }));
    expect(route).toBe(ROUTE_FOLLOW_REQUESTS);
  });

  it('actorId 等の他フィールドの有無に関わらずフォローリクエスト一覧へ遷移する', () => {
    const route = resolveNotificationRoute(
      makeData({ type: 'follow_request', actorId: 'user-1', postId: 'post-1' })
    );
    expect(route).toBe(ROUTE_FOLLOW_REQUESTS);
  });
});

// ---------------------------------------------------------------------------
// resolveNotificationRoute — メッセージ
// ---------------------------------------------------------------------------

describe('resolveNotificationRoute: message', () => {
  it('conversationId があれば会話スレッドへ遷移する', () => {
    const route = resolveNotificationRoute(makeData({ type: 'message', conversationId: 'conv-9' }));
    expect(route).toEqual(routeMessageThread('conv-9'));
  });

  it('conversationId が無ければ通知一覧へ遷移する', () => {
    const route = resolveNotificationRoute(makeData({ type: 'message', conversationId: null }));
    expect(route).toBe(ROUTE_NOTIFICATIONS);
  });
});

// ---------------------------------------------------------------------------
// resolveNotificationRoute — サブスクリプション・システム・不明
// ---------------------------------------------------------------------------

describe('resolveNotificationRoute: その他', () => {
  it('subscription_expiring はサブスクリプション設定へ遷移する', () => {
    const route = resolveNotificationRoute(makeData({ type: 'subscription_expiring' }));
    expect(route).toBe(ROUTE_SETTINGS_SUBSCRIPTION);
  });

  it('system は通知一覧へ遷移する', () => {
    const route = resolveNotificationRoute(makeData({ type: 'system' }));
    expect(route).toBe(ROUTE_NOTIFICATIONS);
  });

  it('未知のタイプは通知一覧へフォールバックする', () => {
    const route = resolveNotificationRoute(makeData({ type: 'unknown_future_type' }));
    expect(route).toBe(ROUTE_NOTIFICATIONS);
  });

  it('type が null の場合も通知一覧へフォールバックする', () => {
    const route = resolveNotificationRoute(makeData({ type: null }));
    expect(route).toBe(ROUTE_NOTIFICATIONS);
  });
});
