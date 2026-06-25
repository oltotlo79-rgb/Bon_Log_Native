/**
 * @module components/settings/BlockedUserListItem
 * ブロックリスト画面の 1 行コンポーネント（ugc-safety.md §6.1 / §8.1）。
 * FlatList 内での再レンダリング抑制のため React.memo でラップ。
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { UserMinimalWithBio } from '@/lib/queries/moderation';
import {
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorBorder,
  spacing3,
  spacing4,
  radiusMd,
  textMd,
  textSm,
} from '@/lib/constants/design-tokens';
import { UserAvatar } from '@/components/common/UserAvatar';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 44;
const UNBLOCK_BUTTON_HEIGHT = 36;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type BlockedUserListItemProps = {
  user: UserMinimalWithBio;
  onUnblock: (userId: string) => void;
  isUnblocking: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function BlockedUserListItemBase({ user, onUnblock, isUnblocking }: BlockedUserListItemProps) {
  const { id, nickname, avatarUrl, bio } = user;

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <UserAvatar
          avatarUrl={avatarUrl}
          userId={id}
          size={AVATAR_SIZE}
          accessibilityLabel={`${nickname}のプロフィール画像`}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.nickname} numberOfLines={1} ellipsizeMode="tail">
          {nickname}
        </Text>
        {bio !== null && bio.length > 0 && (
          <Text style={styles.bio} numberOfLines={1} ellipsizeMode="tail">
            {bio}
          </Text>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.unblockButton,
          isUnblocking && styles.unblockButtonDisabled,
          pressed && !isUnblocking && styles.unblockButtonPressed,
        ]}
        onPress={() => onUnblock(id)}
        disabled={isUnblocking}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`${nickname} のブロックを解除する`}
        accessibilityState={{ disabled: isUnblocking }}
      >
        <Text style={[styles.unblockButtonText, isUnblocking && styles.unblockButtonTextDisabled]}>
          ブロックを解除
        </Text>
      </Pressable>
    </View>
  );
}

export const BlockedUserListItem = React.memo(BlockedUserListItemBase);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  avatarWrapper: {
    marginRight: spacing3,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nickname: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  bio: {
    ...textSm,
    color: colorTextSecondary,
  },
  unblockButton: {
    height: UNBLOCK_BUTTON_HEIGHT,
    paddingHorizontal: spacing3,
    borderRadius: radiusMd,
    borderWidth: 1.5,
    borderColor: colorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing3,
    minWidth: 44,
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  unblockButtonPressed: {
    opacity: 0.7,
  },
  unblockButtonText: {
    ...textSm,
    color: colorTextPrimary,
  },
  unblockButtonTextDisabled: {
    color: colorTextSecondary,
  },
});
