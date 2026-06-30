/**
 * @module __tests__/utils/data-factories
 * API レスポンス型（生成型 components['schemas'][...]）準拠のテスト用ファクトリ群。
 * testing.md 規約: モックデータは __tests__/utils/ に集約する。
 */

import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// CommentItem
// ---------------------------------------------------------------------------

export type CommentItem = components['schemas']['CommentsListResponse']['items'][number];

export function makeCommentItem(overrides?: Partial<CommentItem>): CommentItem {
  return {
    id: 'comment-1',
    postId: 'post-1',
    userId: 'user-1',
    parentId: null,
    content: '黒松のお手入れ、参考になります。',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    isDeleted: false,
    isBlockedUser: false,
    likeCount: 0,
    replyCount: 0,
    isLiked: false,
    user: {
      id: 'user-1',
      nickname: '盆栽太郎',
      avatarUrl: null,
      isBlocked: false,
      isMuted: false,
    },
    media: [],
    mentionedUsers: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SearchUserItem
// ---------------------------------------------------------------------------

export type SearchUserItem = components['schemas']['SearchUsersResponse']['items'][number];

export function makeSearchUserItem(overrides?: Partial<SearchUserItem>): SearchUserItem {
  return {
    id: 'user-1',
    nickname: '松の匠',
    avatarUrl: null,
    bio: '盆栽歴20年。黒松専門。',
    followersCount: 150,
    followingCount: 80,
    following: false,
    requested: false,
    isPublic: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

export type NotificationItem = components['schemas']['NotificationsListResponse']['items'][number];

export function makeNotificationItem(overrides?: Partial<NotificationItem>): NotificationItem {
  return {
    id: 'notif-1',
    type: 'like',
    isRead: false,
    createdAt: '2025-06-01T10:00:00Z',
    actorId: 'user-2',
    postId: 'post-1',
    commentId: null,
    actor: {
      id: 'user-2',
      nickname: '盆栽花子',
      avatarUrl: null,
    },
    post: {
      id: 'post-1',
      content: '黒松の春管理です。',
    },
    comment: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// UserProfile
// ---------------------------------------------------------------------------

export type UserProfile = components['schemas']['UserProfileResponse'];

export function makeUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 'user-1',
    nickname: '盆栽太郎',
    avatarUrl: null,
    headerUrl: null,
    bio: '盆栽歴10年。黒松・五葉松を育てています。',
    location: '東京都',
    isPublic: true,
    bonsaiStartYear: 2015,
    bonsaiStartMonth: 4,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    postsCount: 42,
    followersCount: 100,
    followingCount: 50,
    following: false,
    requested: false,
    isSelf: false,
    isBlocked: false,
    isPremium: false,
    isMuted: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FollowRequestItem
// ---------------------------------------------------------------------------

export type FollowRequestItem = components['schemas']['FollowRequestItem'];

export function makeFollowRequestItem(overrides?: Partial<FollowRequestItem>): FollowRequestItem {
  return {
    id: 'req-1',
    createdAt: '2025-06-01T10:00:00Z',
    requester: {
      id: 'requester-1',
      nickname: '申請者',
      avatarUrl: null,
      bio: '盆栽好き',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FeedItem / PostDetail（use-post-card-props テスト用）
// ---------------------------------------------------------------------------

export type FeedItemData = components['schemas']['FeedResponse']['items'][number];

export function makeFeedItem(overrides?: Partial<FeedItemData>): FeedItemData {
  return {
    id: 'post-1',
    content: '黒松の春管理です。新芽が伸びてきました。',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    user: {
      id: 'user-1',
      nickname: '松の匠',
      avatarUrl: null,
      isBlocked: false,
      isMuted: false,
    },
    media: [],
    genres: [],
    likeCount: 5,
    commentCount: 2,
    repostCount: 0,
    isLiked: false,
    isBookmarked: false,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    mentionedUsers: [],
    ...overrides,
  };
}
