/**
 * @module components/settings/MutedUserListItem
 * ミュートリスト画面の 1 行コンポーネント（ugc-safety.md §6.2 / §8.1）。
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
const UNMUTE_BUTTON_HEIGHT = 36;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type MutedUserListItemProps = {
  user: UserMinimalWithBio;
  onUnmute: (userId: string) => void;
  isUnmuting: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MutedUserListItemBase({ user, onUnmute, isUnmuting }: MutedUserListItemProps) {
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
          styles.unmuteButton,
          isUnmuting && styles.unmuteButtonDisabled,
          pressed && !isUnmuting && styles.unmuteButtonPressed,
        ]}
        onPress={() => onUnmute(id)}
        disabled={isUnmuting}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`${nickname} のミュートを解除する`}
        accessibilityState={{ disabled: isUnmuting }}
      >
        <Text style={[styles.unmuteButtonText, isUnmuting && styles.unmuteButtonTextDisabled]}>
          ミュートを解除
        </Text>
      </Pressable>
    </View>
  );
}

export const MutedUserListItem = React.memo(MutedUserListItemBase);

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
  unmuteButton: {
    height: UNMUTE_BUTTON_HEIGHT,
    paddingHorizontal: spacing3,
    borderRadius: radiusMd,
    borderWidth: 1.5,
    borderColor: colorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing3,
    minWidth: 44,
  },
  unmuteButtonDisabled: {
    opacity: 0.5,
  },
  unmuteButtonPressed: {
    opacity: 0.7,
  },
  unmuteButtonText: {
    ...textSm,
    color: colorTextPrimary,
  },
  unmuteButtonTextDisabled: {
    color: colorTextSecondary,
  },
});
