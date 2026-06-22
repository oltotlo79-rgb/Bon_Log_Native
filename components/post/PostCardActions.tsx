/**
 * @module components/post/PostCardActions
 * PostCard のアクション行（いいね・コメント・ブックマーク）。
 * いいねは LikeButton に委譲し、楽観更新・アニメーション・デバウンスをそこで完結させる。
 * ブックマークは useToggleBookmarkMutation の楽観更新を使う。
 * 仕様: docs/design/post-card.md §10 / docs/design/bookmarks.md §2.3
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorTextSecondary,
  colorActionPrimary,
  spacing1,
  spacing2,
  spacing4,
  textSm,
} from '@/lib/constants/design-tokens';
import { LikeButton } from './LikeButton';
import { useToggleBookmarkMutation } from '@/lib/queries/bookmarks';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PostCardActionsProps = {
  postId: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  currentUserId: string | undefined;
  onComment: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ICON_SIZE = 20;
/** 44pt タップターゲットを確保するための hitSlop */
const ACTION_HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 } as const;

export function PostCardActions({
  postId,
  likeCount,
  commentCount,
  isLiked,
  isBookmarked,
  currentUserId,
  onComment,
}: PostCardActionsProps) {
  const commentLabel = `コメントする。現在 ${commentCount} 件`;
  const { mutate: toggleBookmark, isPending: isBookmarkPending } = useToggleBookmarkMutation();

  const handleBookmarkPress = useCallback(() => {
    if (currentUserId === undefined || isBookmarkPending) return;
    toggleBookmark({ postId, currentlyBookmarked: isBookmarked });
  }, [currentUserId, isBookmarkPending, toggleBookmark, postId, isBookmarked]);

  const bookmarkLabel = isBookmarked ? 'ブックマークを解除' : 'ブックマークに追加';

  return (
    <View style={styles.row}>
      {/* 左寄せ: いいね・コメント */}
      <View style={styles.leftActions}>
        {/* いいねボタン（楽観更新・アニメーション・デバウンスは LikeButton が担当）*/}
        <LikeButton
          postId={postId}
          isLiked={isLiked}
          likeCount={likeCount}
          currentUserId={currentUserId}
        />

        {/* コメントボタン */}
        <Pressable
          style={styles.actionButton}
          onPress={onComment}
          hitSlop={ACTION_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={commentLabel}
        >
          <Ionicons
            name="chatbubble-outline"
            size={ICON_SIZE}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          {commentCount > 0 && (
            <Text style={styles.countText}>{commentCount}</Text>
          )}
        </Pressable>
      </View>

      {/* 右寄せ: ブックマーク */}
      {currentUserId !== undefined && (
        <Pressable
          style={styles.actionButton}
          onPress={handleBookmarkPress}
          disabled={isBookmarkPending}
          hitSlop={ACTION_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={bookmarkLabel}
          accessibilityState={{ checked: isBookmarked }}
        >
          {isBookmarkPending ? (
            <ActivityIndicator size="small" color={colorActionPrimary} />
          ) : (
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={ICON_SIZE}
              color={isBookmarked ? colorActionPrimary : colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing2,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -spacing2,
    gap: spacing4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    minHeight: 44,
    paddingHorizontal: spacing2,
  },
  countText: {
    ...textSm,
    color: colorTextSecondary,
  },
});
