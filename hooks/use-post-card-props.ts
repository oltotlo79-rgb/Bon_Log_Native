/**
 * @module hooks/use-post-card-props
 * FeedItem / PostDetail（生成型）→ PostCard props への変換ヘルパー。
 * フィード・詳細・検索など複数画面で共用する純粋な変換関数を提供する。
 *
 * editedAt は createdAt !== updatedAt のとき updatedAt を使用する。
 * isPinned は FeedItem に存在しないため false 固定。
 * mentionUsers はスペック未同梱のため空 Map を渡す（PM 決定事項）。
 */

import type { PostCardProps, QuotedPostData } from '@/components/post/PostCard';
import type { PostImageMedia } from '@/components/post/PostImageGallery';
import type { FeedItem } from '@/lib/queries/feed';
import type { PostDetail } from '@/lib/queries/posts';

/** スキーマの media.type は string 型のため、PostImageMedia の union に絞る型ガード */
function toMediaType(value: string): 'image' | 'video' {
  return value === 'video' ? 'video' : 'image';
}

/**
 * repostPost / quotePost の media 配列を QuotedPostData の型に変換する。
 * スキーマ上 optional で type は string のためそのまま渡す（表示側で絞る）。
 */
function toQuotedPostData(
  raw: {
    id: string;
    content: string;
    user: { id: string; nickname: string; avatarUrl: string | null };
    media?: { id: string; url: string; type: string; sortOrder: number }[];
  } | null
): QuotedPostData | null {
  if (raw === null) return null;
  return {
    id: raw.id,
    content: raw.content,
    user: {
      id: raw.user.id,
      nickname: raw.user.nickname,
      avatarUrl: raw.user.avatarUrl,
    },
    media: raw.media?.map((m) => ({
      id: m.id,
      url: m.url,
      type: m.type,
      sortOrder: m.sortOrder,
    })),
  };
}

/** FeedItem / PostDetail に共通するフィールドの最小型 */
type PostLike = FeedItem | PostDetail;

/**
 * API レスポンス（FeedItem または PostDetail）を PostCard の props へ変換する。
 * currentUserId は呼び出し側で useCurrentUserQuery または useAuth から取得して渡す。
 * onComment / onMenuPress は呼び出し側でバインドして渡す。
 * いいねは LikeButton が内部で直接ミューテーションフックを呼ぶため、onLike は不要。
 */
export function mapToPostCardProps(
  post: PostLike,
  currentUserId: string | undefined,
  callbacks: {
    onComment: () => void;
    onMenuPress?: () => void;
  },
  options?: {
    disableNavigation?: boolean;
  }
): PostCardProps {
  const editedAt =
    post.createdAt !== post.updatedAt ? post.updatedAt : undefined;

  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    editedAt,
    isPinned: false,
    user: {
      id: post.user.id,
      nickname: post.user.nickname,
      avatarUrl: post.user.avatarUrl,
      isBlocked: post.user.isBlocked,
      isMuted: post.user.isMuted,
    },
    media: post.media.map((m): PostImageMedia => ({
      id: m.id,
      url: m.url,
      type: toMediaType(m.type),
      sortOrder: m.sortOrder,
    })),
    genres: post.genres.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
    })),
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    repostCount: post.repostCount,
    isLiked: post.isLiked,
    isBookmarked: post.isBookmarked,
    isReposted: post.isReposted,
    repostPost: toQuotedPostData(post.repostPost),
    quotePost: toQuotedPostData(post.quotePost),
    poll: post.poll,
    currentUserId,
    disableNavigation: options?.disableNavigation ?? false,
    mentionUsers: new Map(),
    onComment: callbacks.onComment,
    onMenuPress: callbacks.onMenuPress,
  };
}
