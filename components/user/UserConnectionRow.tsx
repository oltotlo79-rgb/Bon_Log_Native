/**
 * @module components/user/UserConnectionRow
 * フォロワー/フォロー中一覧の1行（Web版 components/user/UserCard.tsx 相当）。
 * isFollowedBy はモバイル API 専用フィールドのため、Web にない
 * 「フォローされています」バッジを追加で表示する。
 * FlatList 内での再レンダリング抑制のため React.memo でラップ。
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { UserConnectionItem } from '@/lib/queries/follows';
import { UserAvatar } from '@/components/common/UserAvatar';
import { FollowButton } from '@/components/user/FollowButton';
import { routeUserDetail } from '@/lib/constants/routes';
import {
  colorSurface,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorInfo,
  colorInfoBg,
  spacing2,
  spacing3,
  spacing4,
  radiusLg,
  textMd,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 44;
export const ITEM_MIN_HEIGHT = 72;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UserConnectionRowProps = {
  user: UserConnectionItem;
  currentUserId: string | undefined;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function UserConnectionRowBase({ user, currentUserId }: UserConnectionRowProps) {
  const { id, nickname, avatarUrl, bio, following, requested, isPublic, isFollowedBy } = user;

  // 自分自身の行ではフォローボタンを出さない（UserResultItem と同じ設計）
  const isSelf = currentUserId !== undefined && currentUserId === id;

  const accessibilityLabel = [
    nickname,
    bio !== null && bio.length > 0 ? bio.slice(0, 50) : null,
    isFollowedBy ? 'フォローされています' : null,
    'プロフィールを表示',
  ]
    .filter((part): part is string => part !== null)
    .join('。');

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      onPress={() => router.push(routeUserDetail(id))}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.avatarWrapper}>
        <UserAvatar
          avatarUrl={avatarUrl}
          userId={id}
          size={AVATAR_SIZE}
          accessibilityLabel={`${nickname}のプロフィール画像`}
        />
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.nickname} numberOfLines={1} ellipsizeMode="tail">
            {nickname}
          </Text>
          {isFollowedBy && (
            <View style={styles.followedByBadge}>
              <Text style={styles.followedByBadgeText}>フォローされています</Text>
            </View>
          )}
        </View>

        {bio !== null && bio.length > 0 && (
          <Text style={styles.bio} numberOfLines={2} ellipsizeMode="tail">
            {bio}
          </Text>
        )}
      </View>

      {/* 行全体の onPress（プロフィール遷移）と競合しないよう独立タップ領域に置く */}
      {!isSelf && (
        <View style={styles.followButtonWrapper}>
          <FollowButton
            targetUserId={id}
            isPublic={isPublic}
            following={following}
            requested={requested}
            currentUserId={currentUserId}
            size="compact"
            targetNickname={nickname}
          />
        </View>
      )}
    </Pressable>
  );
}

export const UserConnectionRow = React.memo(UserConnectionRowBase);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurface,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    minHeight: ITEM_MIN_HEIGHT,
  },
  containerPressed: {
    opacity: 0.85,
  },
  avatarWrapper: {
    marginRight: spacing3,
  },
  info: {
    flex: 1,
    gap: spacing2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  nickname: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  followedByBadge: {
    backgroundColor: colorInfoBg,
    borderRadius: radiusLg,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  followedByBadgeText: {
    ...textXs,
    color: colorInfo,
  },
  bio: {
    ...textSm,
    color: colorTextSecondary,
  },
  followButtonWrapper: {
    marginLeft: spacing3,
  },
});
