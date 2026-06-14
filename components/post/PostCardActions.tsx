/**
 * @module components/post/PostCardActions
 * PostCard のアクション行（いいね・コメントの 2 アクション）。
 * MVP スコープ外のブックマーク・リポスト・ポーリングは実装しない（PM 決定事項）。
 * いいねは LikeButton に委譲し、楽観更新・アニメーション・デバウンスをそこで完結させる。
 * 仕様: docs/design/post-card.md §10 / docs/design/follow-and-engagement.md §3
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorTextSecondary,
  spacing1,
  spacing2,
  spacing4,
  textSm,
} from '@/lib/constants/design-tokens';
import { LikeButton } from './LikeButton';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PostCardActionsProps = {
  postId: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
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
  currentUserId,
  onComment,
}: PostCardActionsProps) {
  const commentLabel = `コメントする。現在 ${commentCount} 件`;

  return (
    <View style={styles.row}>
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
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing2,
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
