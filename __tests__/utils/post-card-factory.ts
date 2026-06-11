/**
 * @module __tests__/utils/post-card-factory
 * PostCard コンポーネント群のテスト用モックデータファクトリ。
 * testing.md 規約: モックデータは __tests__/utils/ に集約する。
 */

import type { PostCardProps } from '@/components/post/PostCard';
import type { PostCardHeaderUser } from '@/components/post/PostCardHeader';
import type { PostImageMedia } from '@/components/post/PostImageGallery';
import type { PostGenre } from '@/components/post/PostGenreTags';

export function makeUser(overrides?: Partial<PostCardHeaderUser>): PostCardHeaderUser {
  return {
    id: 'user-1',
    nickname: '松の匠',
    avatarUrl: null,
    ...overrides,
  };
}

export function makeMedia(overrides?: Partial<PostImageMedia>): PostImageMedia {
  return {
    id: 'media-1',
    url: 'https://example.com/image.jpg',
    type: 'image',
    sortOrder: 0,
    ...overrides,
  };
}

export function makeGenre(overrides?: Partial<PostGenre>): PostGenre {
  return {
    id: 'genre-1',
    name: '松柏類',
    category: 'tree',
    ...overrides,
  };
}

export function makePostCardProps(overrides?: Partial<PostCardProps>): PostCardProps {
  return {
    id: 'post-1',
    content: '黒松の春管理です。新芽が伸びてきました。',
    createdAt: new Date('2025-06-01T10:00:00Z'),
    user: makeUser(),
    media: [],
    genres: [],
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    currentUserId: undefined,
    mentionUsers: new Map(),
    onLike: jest.fn(),
    onComment: jest.fn(),
    ...overrides,
  };
}
