/**
 * @module components/post/PostCardHeader
 * PostCard のヘッダー行（アバター / ユーザー名 / 日時 / 固定バッジ）。
 * 3点メニューは MVP では省略（props として onMenuPress を受け取るが、実装は後続フェーズ）。
 * 仕様: docs/design/post-card.md §5
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  textMd,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';
import { formatRelativeTime, formatAbsoluteDateTime } from '@/lib/utils/relative-time';
import { routeUserDetail } from '@/lib/constants/routes';
import { UserAvatar } from '@/components/common/UserAvatar';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 44;
const MENU_BUTTON_SIZE = 44;
const PIN_ICON_SIZE = 14;
const MENU_ICON_SIZE = 20;

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type PostCardHeaderUser = {
  id: string;
  nickname: string;
  avatarUrl: string | null | undefined;
  isBlocked: boolean;
  isMuted: boolean;
};

export type PostCardHeaderProps = {
  user: PostCardHeaderUser;
  createdAt: Date | string;
  editedAt?: Date | string | null;
  isPinned?: boolean;
  onMenuPress?: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostCardHeader({
  user,
  createdAt,
  editedAt,
  isPinned = false,
  onMenuPress,
}: PostCardHeaderProps) {
  const relativeTime = useMemo(
    () => formatRelativeTime(createdAt),
    [createdAt]
  );

  const absoluteDateTime = useMemo(
    () => formatAbsoluteDateTime(createdAt instanceof Date ? createdAt : new Date(createdAt)),
    [createdAt]
  );

  function handlePressAvatar() {
    router.push(routeUserDetail(user.id));
  }

  function handlePressNickname() {
    router.push(routeUserDetail(user.id));
  }

  return (
    <View>
      {isPinned && (
        <View style={styles.pinnedRow}>
          <Ionicons
            name="pin-outline"
            size={PIN_ICON_SIZE}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.pinnedText}>固定された投稿</Text>
        </View>
      )}

      <View style={styles.row}>
        {/* アバター */}
        <Pressable
          onPress={handlePressAvatar}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${user.nickname}のプロフィールを表示`}
          style={styles.avatarButton}
        >
          <UserAvatar
            avatarUrl={user.avatarUrl}
            userId={user.id}
            size={AVATAR_SIZE}
            accessibilityLabel={`${user.nickname}のプロフィール画像`}
            recyclingKey={user.id}
          />
        </Pressable>

        {/* ニックネーム・日時エリア */}
        <View style={styles.nameTimeArea}>
          <Pressable onPress={handlePressNickname} accessibilityRole="button">
            <Text style={styles.nickname} numberOfLines={1} ellipsizeMode="tail">
              {user.nickname}
            </Text>
          </Pressable>
          <View style={styles.timeRow}>
            <Text
              style={styles.timeText}
              accessibilityLabel={absoluteDateTime}
            >
              {relativeTime}
            </Text>
            {editedAt !== null && editedAt !== undefined && (
              <Text style={styles.editedText}>（編集済み）</Text>
            )}
          </View>
        </View>

        {/* 3点メニュー */}
        {onMenuPress !== undefined && (
          <Pressable
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.menuButtonPressed,
            ]}
            onPress={onMenuPress}
            accessibilityRole="button"
            accessibilityLabel="投稿のオプションを開く"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={MENU_ICON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    marginBottom: spacing2,
  },
  pinnedText: {
    ...textXs,
    color: colorTextSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  nameTimeArea: {
    flex: 1,
    marginLeft: spacing3,
    gap: 2,
  },
  nickname: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  timeText: {
    ...textSm,
    color: colorTextSecondary,
  },
  editedText: {
    ...textSm,
    color: colorTextSecondary,
  },
  menuButton: {
    width: MENU_BUTTON_SIZE,
    height: MENU_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MENU_BUTTON_SIZE / 2,
  },
  menuButtonPressed: {
    backgroundColor: colorSurfaceMuted,
  },
});
