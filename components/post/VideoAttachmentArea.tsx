/**
 * @module components/post/VideoAttachmentArea
 * 投稿コンポーザの動画選択エリア。
 * 無料ユーザーには非活性 + アップグレード案内を表示する。
 * 仕様: docs/design/post-composer.md §9
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  colorSurfaceMuted,
  colorTextSecondary,
  colorTextLink,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorderLight,
  colorTextTertiary,
  spacing3,
  spacing4,
  radiusMd,
  radiusFull,
  textSm,
  textXs,
  durationFast,
} from '@/lib/constants/design-tokens';
import { ROUTE_SETTINGS_SUBSCRIPTION } from '@/lib/constants/routes';
import { router } from 'expo-router';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const VIDEO_ADD_BUTTON_HEIGHT = 56;
const LOCK_ICON_SIZE = 16;
const DELETE_BUTTON_SIZE = 24;
const DELETE_ICON_SIZE = 12;
const DELETE_HIT_SLOP = { top: 10, right: 10, bottom: 10, left: 10 };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type VideoAttachmentAreaProps = {
  isPremium: boolean;
  videoUri: string | null;
  onAdd: () => void;
  onRemove: () => void;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VideoAttachmentArea({
  isPremium,
  videoUri,
  onAdd,
  onRemove,
  isDisabled,
}: VideoAttachmentAreaProps) {
  const handlePressSubscription = useCallback(() => {
    router.push(ROUTE_SETTINGS_SUBSCRIPTION);
  }, []);

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>動画</Text>
        <View style={styles.lockedArea}>
          <Ionicons
            name="lock-closed-outline"
            size={LOCK_ICON_SIZE}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.lockedText}>
            動画投稿はプレミアムプランでご利用いただけます
          </Text>
          <Pressable
            onPress={handlePressSubscription}
            accessibilityRole="link"
            accessibilityLabel="プレミアムプランを見る"
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>プレミアムプランを見る</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>動画（最大1本）</Text>
      {videoUri === null ? (
        <Pressable
          style={[styles.addVideoButton, isDisabled && styles.disabledCell]}
          onPress={onAdd}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel="動画を追加"
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.addVideoButtonText}>+ 動画を追加</Text>
        </Pressable>
      ) : (
        <View style={styles.videoThumbCell}>
          <Image
            source={{ uri: videoUri }}
            style={styles.videoThumb}
            contentFit="cover"
            transition={durationFast}
            accessibilityLabel="添付動画のサムネイル"
          />
          <Pressable
            style={styles.deleteButton}
            onPress={onRemove}
            disabled={isDisabled}
            hitSlop={DELETE_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="動画を削除"
          >
            <Ionicons
              name="close"
              size={DELETE_ICON_SIZE}
              color={colorActionPrimaryText}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing3,
    paddingVertical: spacing3,
    gap: spacing3,
  },
  sectionLabel: {
    ...textXs,
    color: colorTextTertiary,
  },
  lockedArea: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    padding: spacing4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing3,
  },
  lockedText: {
    ...textSm,
    color: colorTextSecondary,
    flex: 1,
  },
  linkButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing3,
  },
  linkText: {
    ...textSm,
    color: colorTextLink,
    fontWeight: '600',
  },
  addVideoButton: {
    height: VIDEO_ADD_BUTTON_HEIGHT,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing3,
  },
  addVideoButtonText: {
    ...textSm,
    color: colorTextSecondary,
  },
  disabledCell: {
    opacity: 0.5,
  },
  videoThumbCell: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: radiusMd,
  },
  deleteButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: DELETE_BUTTON_SIZE,
    height: DELETE_BUTTON_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
