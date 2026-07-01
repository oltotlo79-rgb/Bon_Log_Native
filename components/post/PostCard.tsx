/**
 * @module components/post/PostCard
 * フィード・プロフィール・投稿詳細で 1 件の投稿を表示するカードコンポーネント。
 * React.memo でラップし、FlatList 内での不要な再レンダリングを防ぐ。
 * UserActionMenu を内包し、各画面が個別にメニューハンドラを持たない構造にする（ugc-safety.md §2.2）。
 * 仕様: docs/design/post-card.md
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  colorSurface,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  radiusLg,
  shadowWashi,
  shadowWashiHover,
} from '@/lib/constants/design-tokens';
import { routePostDetail } from '@/lib/constants/routes';
import { PostCardHeader } from './PostCardHeader';
import { PostCardContent } from './PostCardContent';
import { PostImageGallery } from './PostImageGallery';
import { PostGenreTags } from './PostGenreTags';
import { PostCardActions } from './PostCardActions';
import { RepostIndicator } from './RepostIndicator';
import { QuotedPostCard } from './QuotedPostCard';
import { PollDisplay } from './PollDisplay';
import { UserActionMenu } from '@/components/user/UserActionMenu';
import type { PostCardHeaderUser } from './PostCardHeader';
import type { PostImageMedia } from './PostImageGallery';
import type { PostGenre } from './PostGenreTags';
import type { QuotedPostCardProps } from './QuotedPostCard';
import type { PostPoll } from './PollDisplay';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** QuotedPostCard に渡す引用投稿データの型 */
export type QuotedPostData = QuotedPostCardProps['post'];

export type PostCardProps = {
  id: string;
  content: string | null | undefined;
  createdAt: Date | string;
  editedAt?: Date | string | null;
  isPinned?: boolean;
  user: PostCardHeaderUser;
  media: readonly PostImageMedia[];
  genres: readonly PostGenre[];
  likeCount: number;
  commentCount: number;
  repostCount?: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isReposted?: boolean;
  /** リポスト投稿のとき、元投稿データ。通常投稿は null */
  repostPost?: QuotedPostData | null;
  /** 引用投稿データ。引用でない場合は null */
  quotePost?: QuotedPostData | null;
  /** アンケートデータ。アンケートなし投稿は undefined、あり投稿は PostPoll、サーバーが null を返した場合は null */
  poll?: PostPoll | null;
  /** 閲覧者のユーザー ID（未認証は undefined）*/
  currentUserId: string | undefined;
  /** true のとき投稿詳細遷移を無効化（投稿詳細画面での使用時）*/
  disableNavigation?: boolean;
  /** メンション解決用 Map（userId → 表示名）。仕様 §15 */
  mentionUsers: ReadonlyMap<string, string>;
  onComment: () => void;
  onMenuPress?: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PostCardInner({
  id,
  content,
  createdAt,
  editedAt,
  isPinned = false,
  user,
  media,
  genres,
  likeCount,
  commentCount,
  repostCount = 0,
  isLiked,
  isBookmarked,
  isReposted = false,
  repostPost = null,
  quotePost = null,
  poll,
  currentUserId,
  disableNavigation = false,
  mentionUsers,
  onComment,
  onMenuPress,
}: PostCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const isRepost = repostPost !== null;

  // リポストのとき本文・メディア・ヘッダーは元投稿側を使う（Web の displayPost に相当）
  const displayUser = isRepost ? repostPost.user : user;
  const displayContent = isRepost ? repostPost.content : content;
  const displayMedia = isRepost
    ? (repostPost.media?.filter(
        (m): m is { id: string; url: string; type: 'image' | 'video'; sortOrder: number } =>
          m.type === 'image' || m.type === 'video'
      ) ?? [])
    : media;
  // リポスト元の詳細画面に遷移するため ID も切り替える
  const displayPostId = isRepost ? repostPost.id : id;

  const isOwnPost =
    currentUserId !== undefined && currentUserId === displayUser.id;

  const handlePressCard = useCallback(() => {
    if (!disableNavigation) {
      router.push(routePostDetail(displayPostId));
    }
  }, [displayPostId, disableNavigation]);

  const handleMenuPress = useCallback(() => {
    if (onMenuPress !== undefined) {
      // 呼び出し元（投稿詳細画面等）が自前のメニュー処理を渡している場合はそちらに委ねる
      onMenuPress();
    } else if (!isOwnPost && currentUserId !== undefined) {
      setMenuVisible(true);
    }
  }, [onMenuPress, isOwnPost, currentUserId]);

  const cardAccessibilityLabel = `${displayUser.nickname}の投稿。${(displayContent ?? '').slice(0, 50)}`;

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && !disableNavigation && styles.cardPressed,
        ]}
        onPress={handlePressCard}
        accessibilityRole={disableNavigation ? undefined : 'button'}
        accessibilityLabel={disableNavigation ? undefined : cardAccessibilityLabel}
        testID="post-card"
      >
        {/* リポスト表示: 「{nickname} がリポスト」ヘッダー行 */}
        {isRepost && (
          <RepostIndicator
            reposterUserId={user.id}
            reposterNickname={user.nickname}
          />
        )}

        {/* ヘッダー: アバター / ユーザー名 / 日時 / 固定バッジ */}
        <PostCardHeader
          user={
            isRepost
              ? {
                  id: repostPost.user.id,
                  nickname: repostPost.user.nickname,
                  avatarUrl: repostPost.user.avatarUrl,
                  // リポスト元著者の block/mute 状態は FeedItem では提供されないため false 固定
                  isBlocked: false,
                  isMuted: false,
                }
              : user
          }
          createdAt={createdAt}
          editedAt={editedAt}
          isPinned={isPinned}
          onMenuPress={
            // onMenuPress が渡されている（詳細画面の自分の投稿メニュー）か、
            // 他人の投稿でログイン済み（UserActionMenu を開く）場合にボタンを表示する
            onMenuPress !== undefined || (!isOwnPost && currentUserId !== undefined)
              ? handleMenuPress
              : undefined
          }
        />

        {/* 本文（メンション・ハッシュタグ・続きを読む） */}
        <View style={styles.contentArea}>
          <PostCardContent
            content={displayContent}
            disableNavigation={disableNavigation}
            mentionUsers={mentionUsers}
          />
        </View>

        {/* アンケート付き投稿のみ表示（undefined は未アンケート投稿、null はサーバー除外済み） */}
        {poll != null && (
          <View style={styles.pollArea}>
            <PollDisplay poll={poll} postId={displayPostId} />
          </View>
        )}

        {/* 画像グリッド */}
        {displayMedia.length > 0 && (
          <View style={styles.galleryArea}>
            <PostImageGallery
              media={displayMedia}
              authorNickname={displayUser.nickname}
            />
          </View>
        )}

        {/* 引用投稿カード */}
        {quotePost !== null && (
          <View style={styles.quoteArea}>
            <QuotedPostCard post={quotePost} />
          </View>
        )}

        {/* ジャンルタグ */}
        {genres.length > 0 && (
          <View style={styles.genreArea}>
            <PostGenreTags genres={genres} />
          </View>
        )}

        {/* アクション行（いいね・コメント・リポスト数・ブックマーク）*/}
        <PostCardActions
          postId={displayPostId}
          likeCount={likeCount}
          commentCount={commentCount}
          repostCount={repostCount}
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          isReposted={isReposted}
          currentUserId={currentUserId}
          onComment={onComment}
        />
      </Pressable>

      {menuVisible && (
        <UserActionMenu
          targetUserId={displayUser.id}
          targetUserNickname={displayUser.nickname}
          isOwnContent={isOwnPost}
          contentType="post"
          contentId={displayPostId}
          isBlocked={isRepost ? false : user.isBlocked}
          isMuted={isRepost ? false : user.isMuted}
          onClose={() => setMenuVisible(false)}
        />
      )}
    </View>
  );
}

export const PostCard = React.memo(PostCardInner);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing5,
    marginBottom: spacing4,
    ...shadowWashi,
  },
  cardPressed: {
    ...shadowWashiHover,
    opacity: 0.97,
  },
  contentArea: {
    marginTop: spacing2,
    marginBottom: spacing3,
  },
  galleryArea: {
    marginBottom: spacing3,
  },
  pollArea: {
    marginBottom: spacing3,
  },
  quoteArea: {
    marginBottom: spacing3,
  },
  genreArea: {
    marginBottom: spacing3,
  },
});
