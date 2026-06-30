/**
 * @module components/post/RepostIndicator
 * リポスト投稿のヘッダー行。「{nickname} がリポスト」を表示する。
 * Web: PostCard.tsx 内のインライン repost-indicator div に相当。
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  colorTextSecondary,
  colorSuccess,
  spacing2,
  textXs,
} from '@/lib/constants/design-tokens';
import { routeUserDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const REPOST_ICON_SIZE = 12;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type RepostIndicatorProps = {
  /** リポストしたユーザーの ID */
  reposterUserId: string;
  /** リポストしたユーザーの表示名 */
  reposterNickname: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RepostIndicator({
  reposterUserId,
  reposterNickname,
}: RepostIndicatorProps) {
  function handlePressNickname() {
    router.push(routeUserDetail(reposterUserId));
  }

  return (
    <View style={styles.row} accessibilityLabel={`${reposterNickname}がリポスト`}>
      <Ionicons
        name="repeat"
        size={REPOST_ICON_SIZE}
        color={colorSuccess}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Pressable
        onPress={handlePressNickname}
        accessibilityRole="link"
        accessibilityLabel={`${reposterNickname}のプロフィールを表示`}
        style={styles.nicknamePressable}
      >
        <Text style={styles.nicknameText} numberOfLines={1}>
          {reposterNickname}
        </Text>
      </Pressable>
      <Text style={styles.suffixText}>がリポスト</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    marginBottom: spacing2,
  },
  nicknamePressable: {
    flexShrink: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  nicknameText: {
    ...textXs,
    color: colorTextSecondary,
    textDecorationLine: 'underline',
  },
  suffixText: {
    ...textXs,
    color: colorTextSecondary,
  },
});
