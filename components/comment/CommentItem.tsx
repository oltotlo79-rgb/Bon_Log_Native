/**
 * @module components/comment/CommentItem
 * 投稿詳細画面のコメント一覧で 1 件のコメントを表示するコンポーネント。
 * isDeleted は「削除されたコメント」プレースホルダーを表示する。
 * isBlockedUser のコメントはブロックしたユーザーのため非表示にする。
 * 自分のコメントには「⋮」メニューから削除導線を提供する。
 * 他人のコメントには「⋮」ボタンから通報・ブロック・ミュートを提供する（ugc-safety.md §2.4）。
 * 返信ボタンで親コンポーネントに返信モードを通知する。
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBorderLight,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorError,
  colorBackground,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  radiusMd,
  radius2xl,
  shadowWashiLg,
  textBase,
  textSm,
  textMd,
} from '@/lib/constants/design-tokens';
import { UserAvatar } from '@/components/common/UserAvatar';
import { formatRelativeTime, formatAbsoluteDateTime } from '@/lib/utils/relative-time';
import { parseContentSegments } from '@/lib/utils/parse-content-segments';
import { routeUserDetail } from '@/lib/constants/routes';
import { UserActionMenu } from '@/components/user/UserActionMenu';
import type { CommentItem as CommentItemData } from '@/lib/queries/comments';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 36;
const COMMENT_MENU_BUTTON_SIZE = 44;
const COMMENT_MENU_ICON_SIZE = 18;
const ACTION_BUTTON_HEIGHT = 36;
const DELETE_SHEET_ITEM_HEIGHT = 56;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ReplyTarget = {
  parentId: string;
  nickname: string;
};

type CommentItemProps = {
  item: CommentItemData;
  /** 閲覧者のユーザー ID（未認証は undefined）。自分のコメント判定と通報導線の表示制御に使用する。 */
  currentUserId: string | undefined;
  /** 「返信する」ボタンのコールバック（返信モードを親が管理する） */
  onReply?: (target: ReplyTarget) => void;
  /** 削除コールバック（自分のコメントのみ）*/
  onDelete?: (commentId: string) => void;
  /** 削除処理中のコメント ID（グレーアウト表示） */
  deletingId?: string;
};

// ---------------------------------------------------------------------------
// Component（React.memo で FlatList 内の不要な再レンダリングを防ぐ）
// ---------------------------------------------------------------------------

function CommentItemInner({
  item,
  currentUserId,
  onReply,
  onDelete,
  deletingId,
}: CommentItemProps) {
  const relativeTime = useMemo(
    () => formatRelativeTime(item.createdAt),
    [item.createdAt]
  );

  const absoluteDateTime = useMemo(
    () => formatAbsoluteDateTime(new Date(item.createdAt)),
    [item.createdAt]
  );

  const segments = useMemo(
    () => parseContentSegments(item.isDeleted ? null : item.content),
    [item.isDeleted, item.content]
  );

  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const isOwnComment = currentUserId !== undefined && currentUserId === item.user.id;
  const canShowOthersMenu = currentUserId !== undefined && !isOwnComment && !item.isDeleted;
  const isDeleting = deletingId === item.id;

  const handlePressAvatar = useCallback(() => {
    router.push(routeUserDetail(item.user.id));
  }, [item.user.id]);

  const handleMenuOpen = useCallback(() => {
    if (isOwnComment) {
      setDeleteSheetVisible(true);
    } else {
      setMenuVisible(true);
    }
  }, [isOwnComment]);

  const handlePressReply = useCallback(() => {
    if (onReply !== undefined) {
      onReply({ parentId: item.id, nickname: item.user.nickname });
    }
  }, [onReply, item.id, item.user.nickname]);

  const handleConfirmDelete = useCallback(() => {
    if (Platform.OS === 'ios') {
      setDeleteSheetVisible(false);
      Alert.alert('コメントを削除しますか？', 'この操作は取り消せません。', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            if (onDelete !== undefined) onDelete(item.id);
          },
        },
      ]);
    } else {
      setDeleteSheetVisible(false);
      if (onDelete !== undefined) onDelete(item.id);
    }
  }, [onDelete, item.id]);

  if (item.isBlockedUser) {
    return null;
  }

  return (
    <View
      testID="comment-item"
      style={isDeleting ? styles.containerDeleting : undefined}
    >
      <View style={styles.container}>
        {/* アバター */}
        <Pressable
          onPress={handlePressAvatar}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${item.user.nickname}のプロフィールを表示`}
          style={styles.avatarButton}
        >
          <UserAvatar
            avatarUrl={item.user.avatarUrl}
            userId={item.user.id}
            size={AVATAR_SIZE}
            accessibilityLabel={`${item.user.nickname}のプロフィール画像`}
            recyclingKey={item.user.id}
          />
        </Pressable>

        {/* コンテンツエリア */}
        <View style={styles.contentArea}>
          {/* ヘッダー行: ニックネーム + 日時 + メニュー */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={handlePressAvatar}
              accessibilityRole="button"
              accessibilityLabel={`${item.user.nickname}のプロフィールを表示`}
            >
              <Text style={styles.nickname} numberOfLines={1}>
                {item.user.nickname}
              </Text>
            </Pressable>
            <Text
              style={styles.time}
              accessibilityLabel={absoluteDateTime}
            >
              {relativeTime}
            </Text>

            {/* 自分のコメント または 他人のコメント（認証済み）にメニューを表示 */}
            {(isOwnComment || canShowOthersMenu) && !item.isDeleted && (
              <Pressable
                style={({ pressed }) => [
                  styles.menuButton,
                  pressed && styles.menuButtonPressed,
                ]}
                onPress={handleMenuOpen}
                accessibilityRole="button"
                accessibilityLabel="コメントのオプションを開く"
                hitSlop={spacing2}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={COMMENT_MENU_ICON_SIZE}
                  color={colorTextSecondary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Pressable>
            )}
          </View>

          {/* 本文 */}
          {item.isDeleted ? (
            <View style={styles.deletedContainer}>
              <Text style={styles.deletedText}>削除されたコメント</Text>
            </View>
          ) : (
            <Text style={styles.body}>
              {segments.map((segment, index) => {
                if (segment.type === 'mention') {
                  return (
                    <Text
                      key={index}
                      style={styles.mention}
                      onPress={() => router.push(routeUserDetail(segment.userId))}
                      accessibilityRole="link"
                      accessibilityLabel={`@${segment.userId}のプロフィールを表示`}
                    >
                      {`@${segment.userId}`}
                    </Text>
                  );
                }
                if (segment.type === 'hashtag') {
                  return (
                    <Text key={index} style={styles.hashtag}>
                      {segment.tag}
                    </Text>
                  );
                }
                return (
                  <Text key={index} style={styles.body}>
                    {segment.content}
                  </Text>
                );
              })}
            </Text>
          )}

          {/* アクション行（返信ボタン）*/}
          {!item.isDeleted && onReply !== undefined && (
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.actionButton}
                onPress={handlePressReply}
                accessibilityRole="button"
                accessibilityLabel={`${item.user.nickname}のコメントに返信する`}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={styles.actionButtonText}>返信する</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* 他人のコメントの通報・ブロック・ミュートメニュー */}
      {menuVisible && (
        <UserActionMenu
          targetUserId={item.user.id}
          targetUserNickname={item.user.nickname}
          isOwnContent={isOwnComment}
          contentType="comment"
          contentId={item.id}
          isBlocked={item.user.isBlocked}
          isMuted={item.user.isMuted}
          onClose={() => setMenuVisible(false)}
        />
      )}

      {/* 自分のコメントの削除メニュー（Android: カスタムシート） */}
      {deleteSheetVisible && Platform.OS !== 'ios' && (
        <Modal
          visible={deleteSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDeleteSheetVisible(false)}
          accessibilityViewIsModal
        >
          <Pressable
            style={styles.deleteSheetBackdrop}
            onPress={() => setDeleteSheetVisible(false)}
          />
          <View style={styles.deleteSheet}>
            <View style={styles.deleteSheetHandle} />
            <Pressable
              style={({ pressed }) => [
                styles.deleteSheetItem,
                pressed && styles.deleteSheetItemPressed,
              ]}
              onPress={handleConfirmDelete}
              accessibilityRole="button"
              accessibilityLabel="コメントを削除"
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={colorError}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.deleteSheetItemText}>削除</Text>
            </Pressable>
            <View style={styles.deleteSheetDivider} />
            <Pressable
              style={({ pressed }) => [
                styles.deleteSheetItem,
                pressed && styles.deleteSheetItemPressed,
              ]}
              onPress={() => setDeleteSheetVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
            >
              <Text style={styles.deleteSheetCancelText}>キャンセル</Text>
            </Pressable>
          </View>
        </Modal>
      )}
    </View>
  );
}

export const CommentItem = React.memo(CommentItemInner);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurface,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  avatarButton: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginRight: spacing3,
    flexShrink: 0,
  },
  contentArea: {
    flex: 1,
    gap: spacing2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  menuButton: {
    width: COMMENT_MENU_BUTTON_SIZE,
    height: COMMENT_MENU_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: COMMENT_MENU_BUTTON_SIZE / 2,
    marginLeft: 'auto',
  },
  menuButtonPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  nickname: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  time: {
    ...textSm,
    color: colorTextSecondary,
    flexShrink: 0,
  },
  body: {
    ...textBase,
    color: colorTextPrimary,
  },
  mention: {
    ...textBase,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  hashtag: {
    ...textBase,
    color: colorTextSecondary,
  },
  deletedContainer: {
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    backgroundColor: colorSurfaceMuted,
  },
  deletedText: {
    ...textSm,
    color: colorTextTertiary,
    fontStyle: 'italic',
  },
  containerDeleting: {
    opacity: 0.4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing3,
    marginTop: spacing2,
  },
  actionButton: {
    height: ACTION_BUTTON_HEIGHT,
    justifyContent: 'center',
    paddingRight: spacing3,
  },
  actionButtonText: {
    ...textSm,
    color: colorTextSecondary,
  },
  deleteSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  deleteSheet: {
    backgroundColor: colorBackground,
    borderTopLeftRadius: radius2xl,
    borderTopRightRadius: radius2xl,
    paddingBottom: spacing6,
    ...shadowWashiLg,
    alignItems: 'center',
  },
  deleteSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: radiusFull,
    backgroundColor: colorBorderLight,
    marginTop: spacing2,
    marginBottom: spacing2,
  },
  deleteSheetItem: {
    width: '100%',
    height: DELETE_SHEET_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    gap: spacing4,
  },
  deleteSheetItemPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  deleteSheetItemText: {
    ...textMd,
    color: colorError,
    flex: 1,
  },
  deleteSheetDivider: {
    height: 1,
    backgroundColor: colorBorderLight,
    width: '90%',
  },
  deleteSheetCancelText: {
    ...textMd,
    color: colorTextSecondary,
    flex: 1,
    textAlign: 'center',
  },
});
