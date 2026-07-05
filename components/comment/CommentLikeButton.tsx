/**
 * @module components/comment/CommentLikeButton
 * コメントのいいねボタン。Web の CommentActions 内 CommentLikeButton の見た目・挙動に準拠する
 * （ハートアイコン + 件数 / liked 時は塗りつぶし表示）。
 * 楽観更新は useToggleCommentLikeMutation フック内で実施済みのため、ここでは mutate を呼ぶのみ。
 */

import React, { useCallback } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToggleCommentLikeMutation } from '@/lib/queries/comments';
import { isApiError } from '@/lib/api/errors';
import { messageForApiError, ERR_LIKE_FAILED } from '@/lib/constants/errors';
import { ROUTE_LOGIN } from '@/lib/constants/routes';
import {
  colorTextSecondary,
  colorError,
  spacing1,
  spacing2,
  textSm,
} from '@/lib/constants/design-tokens';

const ICON_SIZE = 16;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export type CommentLikeButtonProps = {
  postId: string;
  commentId: string;
  parentId: string | null;
  isLiked: boolean;
  likeCount: number;
  currentUserId: string | undefined;
  /** 失敗時のエラーメッセージ通知（画面共通の Toast へ委譲するため呼び出し元から注入する） */
  onError?: (message: string) => void;
};

export function CommentLikeButton({
  postId,
  commentId,
  parentId,
  isLiked,
  likeCount,
  currentUserId,
  onError,
}: CommentLikeButtonProps) {
  const mutation = useToggleCommentLikeMutation(postId);

  const handlePress = useCallback(() => {
    if (currentUserId === undefined) {
      router.push(ROUTE_LOGIN);
      return;
    }

    mutation.mutate(
      { commentId, liked: isLiked, parentId: parentId ?? undefined },
      {
        onError: (error) => {
          const message = isApiError(error) ? messageForApiError(error.code) : ERR_LIKE_FAILED;
          onError?.(message);
        },
      }
    );
  }, [currentUserId, mutation, commentId, isLiked, parentId, onError]);

  const accessibilityLabel =
    currentUserId === undefined
      ? `ログインしていいねする。現在 ${likeCount} 件`
      : isLiked
        ? `いいねを取り消す。現在 ${likeCount} 件`
        : `いいねする。現在 ${likeCount} 件`;

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isLiked }}
    >
      <Ionicons
        name={isLiked ? 'heart' : 'heart-outline'}
        size={ICON_SIZE}
        color={isLiked ? colorError : colorTextSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      {likeCount > 0 && <Text style={styles.countText}>{likeCount}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
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
