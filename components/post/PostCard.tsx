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
import { UserActionMenu } from '@/components/user/UserActionMenu';
import type { PostCardHeaderUser } from './PostCardHeader';
import type { PostImageMedia } from './PostImageGallery';
import type { PostGenre } from './PostGenreTags';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

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
  isLiked: boolean;
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
  isLiked,
  currentUserId,
  disableNavigation = false,
  mentionUsers,
  onComment,
  onMenuPress,
}: PostCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const isOwnPost = currentUserId !== undefined && currentUserId === user.id;

  const handlePressCard = useCallback(() => {
    if (!disableNavigation) {
      router.push(routePostDetail(id));
    }
  }, [id, disableNavigation]);

  const handleMenuPress = useCallback(() => {
    if (onMenuPress !== undefined) {
      onMenuPress();
    } else if (!isOwnPost && currentUserId !== undefined) {
      setMenuVisible(true);
    }
  }, [onMenuPress, isOwnPost, currentUserId]);

  const cardAccessibilityLabel = `${user.nickname}の投稿。${(content ?? '').slice(0, 50)}`;

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
        {/* ヘッダー: アバター / ユーザー名 / 日時 / 固定バッジ */}
        <PostCardHeader
          user={user}
          createdAt={createdAt}
          editedAt={editedAt}
          isPinned={isPinned}
          onMenuPress={!isOwnPost && currentUserId !== undefined ? handleMenuPress : undefined}
        />

        {/* 本文（メンション・ハッシュタグ・続きを読む） */}
        <View style={styles.contentArea}>
          <PostCardContent
            content={content}
            disableNavigation={disableNavigation}
            mentionUsers={mentionUsers}
          />
        </View>

        {/* 画像グリッド */}
        {media.length > 0 && (
          <View style={styles.galleryArea}>
            <PostImageGallery
              media={media}
              authorNickname={user.nickname}
            />
          </View>
        )}

        {/* ジャンルタグ */}
        {genres.length > 0 && (
          <View style={styles.genreArea}>
            <PostGenreTags genres={genres} />
          </View>
        )}

        {/* アクション行（いいね・コメント）*/}
        <PostCardActions
          postId={id}
          likeCount={likeCount}
          commentCount={commentCount}
          isLiked={isLiked}
          currentUserId={currentUserId}
          onComment={onComment}
        />
      </Pressable>

      {menuVisible && (
        <UserActionMenu
          targetUserId={user.id}
          targetUserNickname={user.nickname}
          isOwnContent={isOwnPost}
          contentType="post"
          contentId={id}
          isBlocked={user.isBlocked}
          isMuted={user.isMuted}
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
  genreArea: {
    marginBottom: spacing3,
  },
});
