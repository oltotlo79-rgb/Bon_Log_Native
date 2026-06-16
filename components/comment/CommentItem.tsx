/**
 * @module components/comment/CommentItem
 * 投稿詳細画面のコメント一覧で 1 件のコメントを表示するコンポーネント。
 * isDeleted は「削除されたコメント」プレースホルダーを表示する。
 * isBlockedUser のコメントはブロックしたユーザーのため非表示にする。
 * コメント追加（投稿）は 2c 待ちのため表示のみ（入力欄なし）。
 * 他人のコメントには「⋮」ボタンから通報・ブロック・ミュートを提供する（ugc-safety.md §2.4）。
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBorder,
  colorBorderLight,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  spacing2,
  spacing3,
  spacing4,
  radiusFull,
  radiusMd,
  textBase,
  textSm,
  textMd,
  durationFast,
} from '@/lib/constants/design-tokens';
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CommentItemProps = {
  item: CommentItemData;
  /** 閲覧者のユーザー ID（未認証は undefined）。自分のコメント判定と通報導線の表示制御に使用する。 */
  currentUserId: string | undefined;
};

// ---------------------------------------------------------------------------
// Component（React.memo で FlatList 内の不要な再レンダリングを防ぐ）
// ---------------------------------------------------------------------------

function CommentItemInner({ item, currentUserId }: CommentItemProps) {
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

  const isOwnComment = currentUserId !== undefined && currentUserId === item.user.id;
  const canShowMenu = currentUserId !== undefined && !isOwnComment && !item.isDeleted;

  const handlePressAvatar = useCallback(() => {
    router.push(routeUserDetail(item.user.id));
  }, [item.user.id]);

  const handleMenuOpen = useCallback(() => {
    setMenuVisible(true);
  }, []);

  if (item.isBlockedUser) {
    return null;
  }

  return (
    <View testID="comment-item">
      <View style={styles.container}>
        {/* アバター */}
        <Pressable
          onPress={handlePressAvatar}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${item.user.nickname}のプロフィールを表示`}
          style={styles.avatarButton}
        >
          {item.user.avatarUrl !== null ? (
            <Image
              source={{ uri: item.user.avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              transition={durationFast}
              recyclingKey={item.user.id}
              accessibilityLabel={`${item.user.nickname}のプロフィール画像`}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {item.user.nickname.charAt(0)}
              </Text>
            </View>
          )}
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

            {canShowMenu && (
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
        </View>
      </View>

      {/* コメント通報・ブロック・ミュートメニュー（ugc-safety.md §2.4）
          コメントレスポンスに投稿者の isBlocked/isMuted が含まれないため false を渡す（サーバー未提供）。 */}
      {menuVisible && (
        <UserActionMenu
          targetUserId={item.user.id}
          targetUserNickname={item.user.nickname}
          isOwnContent={isOwnComment}
          contentType="comment"
          contentId={item.id}
          isBlocked={false}
          isMuted={false}
          onClose={() => setMenuVisible(false)}
        />
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
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radiusFull,
    borderWidth: 1.5,
    borderColor: colorBorder,
  },
  avatarFallback: {
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    ...textSm,
    color: colorTextSecondary,
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
});
