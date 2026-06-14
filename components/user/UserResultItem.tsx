/**
 * @module components/user/UserResultItem
 * ユーザー検索結果 1 件表示コンポーネント（search-screen.md §7）。
 * FlatList 内での再レンダリング抑制のため React.memo でラップ。
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import type { SearchUserItem } from '@/lib/queries/search';
import { FollowButton } from '@/components/user/FollowButton';
import {
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorSurfaceMuted,
  shadowWashi,
  spacing4,
  spacing2,
  spacing3,
  radiusFull,
  radiusLg,
  textMd,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 44;
export const ITEM_MIN_HEIGHT = 72;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type UserResultItemProps = {
  user: SearchUserItem;
  onPress: (userId: string) => void;
  currentUserId: string | undefined;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function UserResultItemBase({ user, onPress, currentUserId }: UserResultItemProps) {
  const { id, nickname, avatarUrl, bio, followersCount, following, requested, isPublic } = user;

  // 自分自身の行ではフォローボタンを出さない（設計 §2.5）
  const isSelf = currentUserId !== undefined && currentUserId === id;

  const accessibilityLabel = [
    nickname,
    bio ? bio.slice(0, 50) : null,
    `${followersCount}フォロワー`,
    'プロフィールを表示',
  ]
    .filter(Boolean)
    .join('。');

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      onPress={() => onPress(id)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.avatarWrapper}>
        {avatarUrl !== null ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            accessibilityRole="image"
            accessibilityLabel={`${nickname}のプロフィール画像`}
            accessibilityElementsHidden
          />
        ) : (
          <View style={styles.avatarFallback} accessibilityElementsHidden>
            <Text style={styles.avatarFallbackText}>{nickname.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={styles.nickname}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {nickname}
        </Text>

        {bio !== null && bio.length > 0 && (
          <Text
            style={styles.bio}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {bio}
          </Text>
        )}

        <Text style={styles.followersCount}>
          {followersCount}フォロワー
        </Text>
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

export const UserResultItem = React.memo(UserResultItemBase);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    minHeight: ITEM_MIN_HEIGHT,
    ...shadowWashi,
  },
  containerPressed: {
    opacity: 0.85,
  },
  avatarWrapper: {
    marginRight: spacing3,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radiusFull,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    ...textMd,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    gap: spacing2,
  },
  followButtonWrapper: {
    marginLeft: spacing3,
  },
  nickname: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  bio: {
    ...textBase,
    color: colorTextSecondary,
  },
  followersCount: {
    ...textSm,
    color: colorTextSecondary,
  },
});
