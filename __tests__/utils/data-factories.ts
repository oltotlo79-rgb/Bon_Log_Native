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
    editedAt: null,
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
// PostResponse（投稿詳細・引用投稿・リポスト等のテスト用）
// ---------------------------------------------------------------------------

export type PostResponse = components['schemas']['PostResponse'];

export function makePostResponse(overrides?: Partial<PostResponse>): PostResponse {
  return {
    id: 'post-1',
    content: '黒松の春管理',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
    media: [],
    genres: [],
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    isLiked: false,
    isBookmarked: false,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    poll: null,
    mentionedUsers: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PostPoll（アンケート埋め込み型 PostResponse.poll の完全形テスト用）
// ---------------------------------------------------------------------------

export type PostPoll = components['schemas']['PostPoll'];

export function makePostPoll(overrides?: Partial<PostPoll>): PostPoll {
  return {
    id: 'poll-1',
    postId: 'post-1',
    duration: 86400,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2025-06-01T10:00:00Z',
    options: [
      { id: 'option-1', pollId: 'poll-1', text: '黒松', sortOrder: 0, _count: { votes: 7 } },
      { id: 'option-2', pollId: 'poll-1', text: '五葉松', sortOrder: 1, _count: { votes: 3 } },
    ],
    votes: [],
    _count: { votes: 10 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PollVoteResponse（アンケート投票後の集計結果テスト用）
// ---------------------------------------------------------------------------

export type PollVoteResponse = components['schemas']['PollVoteResponse'];

export function makePollVoteResponse(overrides?: Partial<PollVoteResponse>): PollVoteResponse {
  return {
    id: 'poll-1',
    expiresAt: '2025-06-08T10:00:00Z',
    isExpired: false,
    totalVotes: 10,
    userVoteOptionId: 'option-1',
    options: [
      { id: 'option-1', text: '黒松', voteCount: 7, percentage: 70.0 },
      { id: 'option-2', text: '五葉松', voteCount: 3, percentage: 30.0 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ConversationItem
// ---------------------------------------------------------------------------

export type ConversationItem = components['schemas']['ConversationItem'];

export function makeConversationItem(overrides?: Partial<ConversationItem>): ConversationItem {
  return {
    id: 'conv-1',
    updatedAt: '2025-06-01T10:00:00Z',
    otherUser: {
      id: 'user-2',
      nickname: '盆栽花子',
      avatarUrl: null,
    },
    lastMessage: {
      id: 'msg-1',
      content: 'こんにちは',
      senderId: 'user-2',
      createdAt: '2025-06-01T10:00:00Z',
    },
    hasUnread: false,
    ...overrides,
  };
}

export type ConversationListResponse = components['schemas']['ConversationListResponse'];

export function makeConversationListPage(
  items: ConversationItem[],
  nextCursor: string | null = null
): ConversationListResponse {
  return { items, nextCursor };
}

// ---------------------------------------------------------------------------
// MessageItem
// ---------------------------------------------------------------------------

export type MessageItem = components['schemas']['MessageItem'];

export function makeMessageItem(overrides?: Partial<MessageItem>): MessageItem {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    content: 'こんにちは',
    senderId: 'user-1',
    sender: {
      id: 'user-1',
      nickname: '盆栽太郎',
      avatarUrl: null,
    },
    createdAt: '2025-06-01T10:00:00Z',
    ...overrides,
  };
}

export type MessageListResponse = components['schemas']['MessageListResponse'];

export function makeMessageListPage(
  items: MessageItem[],
  nextCursor: string | null = null
): MessageListResponse {
  return { items, nextCursor };
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
    poll: null,
    mentionedUsers: [],
    ...overrides,
  };
}
