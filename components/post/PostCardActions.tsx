/**
 * @module components/post/PostCardActions
 * PostCard のアクション行（いいね・コメントの 2 アクション）。
 * MVP スコープ外のブックマーク・リポスト・ポーリングは実装しない（PM 決定事項）。
 * ロジック（楽観更新等）は持たず、コールバック props を呼び出すのみ。
 * 仕様: docs/design/post-card.md §10
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorTextSecondary,
  colorError,
  spacing1,
  spacing2,
  spacing4,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PostCardActionsProps = {
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ICON_SIZE = 20;
/** 44pt タップターゲットを確保するための hitSlop */
const ACTION_HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 } as const;

export function PostCardActions({
  likeCount,
  commentCount,
  isLiked,
  onLike,
  onComment,
}: PostCardActionsProps) {
  const likeLabel = isLiked
    ? `いいねを取り消す。現在 ${likeCount} 件`
    : `いいねする。現在 ${likeCount} 件`;

  const commentLabel = `コメントする。現在 ${commentCount} 件`;

  return (
    <View style={styles.row}>
      {/* いいねボタン */}
      <Pressable
        style={styles.actionButton}
        onPress={onLike}
        hitSlop={ACTION_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={likeLabel}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={ICON_SIZE}
          color={isLiked ? colorError : colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        {likeCount > 0 && (
          <Text style={styles.countText}>{likeCount}</Text>
        )}
      </Pressable>

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
