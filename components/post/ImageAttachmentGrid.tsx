/**
 * @module components/post/ImageAttachmentGrid
 * 投稿コンポーザの画像選択グリッド（追加 / サムネイル / 削除）。
 * 仕様: docs/design/post-composer.md §8
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  colorActionPrimary,
  colorActionPrimaryText,
  colorSurfaceMuted,
  colorTextSecondary,
  colorBorderLight,
  spacing2,
  spacing3,
  radiusMd,
  radiusFull,
  durationFast,
  textXs,
  colorTextTertiary,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const THUMBNAIL_SIZE = 80;
const DELETE_BUTTON_SIZE = 24;
const DELETE_ICON_SIZE = 12;
const ADD_BUTTON_ICON_SIZE = 24;
const DELETE_HIT_SLOP = { top: 10, right: 10, bottom: 10, left: 10 };

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type AttachedImage = {
  uri: string;
  localId: string;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ImageAttachmentGridProps = {
  images: AttachedImage[];
  onAdd: () => void;
  onRemove: (localId: string) => void;
  maxCount: number;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageAttachmentGrid({
  images,
  onAdd,
  onRemove,
  maxCount,
  isDisabled,
}: ImageAttachmentGridProps) {
  const canAddMore = images.length < maxCount;

  const handlePressRemove = useCallback(
    (localId: string) => {
      onRemove(localId);
    },
    [onRemove]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>
        画像（最大{maxCount}枚）
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 「+ 追加」ボタン — 上限に達したら非表示 */}
        {canAddMore && (
          <Pressable
            style={[styles.addButton, isDisabled && styles.cellDisabled]}
            onPress={onAdd}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel="画像を追加"
          >
            <Ionicons
              name="add"
              size={ADD_BUTTON_ICON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        )}

        {/* 添付済み画像サムネイル */}
        {images.map((img, index) => (
          <View
            key={img.localId}
            style={styles.thumbCell}
            accessibilityLabel={`添付画像${index + 1}枚目`}
          >
            <Image
              source={{ uri: img.uri }}
              style={styles.thumb}
              contentFit="cover"
              transition={durationFast}
              recyclingKey={img.localId}
              accessibilityLabel={`添付画像${index + 1}`}
            />
            {/* 削除ボタン */}
            <Pressable
              style={styles.deleteButton}
              onPress={() => handlePressRemove(img.localId)}
              disabled={isDisabled}
              hitSlop={DELETE_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="この画像を削除"
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
        ))}
      </ScrollView>
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
    gap: spacing2,
  },
  sectionLabel: {
    ...textXs,
    color: colorTextTertiary,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing2,
    paddingRight: spacing3,
  },
  addButton: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDisabled: {
    opacity: 0.5,
  },
  thumbCell: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    position: 'relative',
  },
  thumb: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
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
