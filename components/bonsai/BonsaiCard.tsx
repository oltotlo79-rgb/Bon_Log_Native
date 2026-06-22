/**
 * @module components/bonsai/BonsaiCard
 * 盆栽一覧の各行に表示するカード。
 * 仕様: docs/design/bonsai.md §2.2
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  spacing3,
  spacing4,
  radiusLg,
  radiusMd,
  shadowWashi,
  textMd,
  textSm,
  durationFast,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const THUMBNAIL_SIZE = 80;
const TREE_ICON_SIZE = 32;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type BonsaiCardProps = {
  id: string;
  name: string;
  species?: string | null;
  thumbnailUrl?: string | null;
  recordCount: number;
  updatedAt: string;
  onPress: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function BonsaiCardInner({
  name,
  species,
  thumbnailUrl,
  recordCount,
  updatedAt,
  onPress,
}: BonsaiCardProps) {
  const relativeTime = formatRelativeTime(updatedAt);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}の詳細を見る`}
    >
      {/* サムネイル */}
      <View style={styles.thumbnail}>
        {thumbnailUrl !== undefined && thumbnailUrl !== null ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnailImage}
            contentFit="cover"
            transition={durationFast}
            accessibilityLabel={`${name}のサムネイル`}
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons
              name="leaf-outline"
              size={TREE_ICON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        )}
      </View>

      {/* 情報エリア */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {species !== undefined && species !== null && species.length > 0 && (
          <Text style={styles.species} numberOfLines={1}>{species}</Text>
        )}
        <Text style={styles.meta}>記録 {recordCount} 件</Text>
        <Text style={styles.meta}>最終更新 {relativeTime}</Text>
      </View>
    </Pressable>
  );
}

export const BonsaiCard = React.memo(BonsaiCardInner);

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    marginBottom: spacing3,
    gap: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    ...shadowWashi,
  },
  cardPressed: {
    opacity: 0.85,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radiusMd,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnailImage: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  thumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...textMd,
    fontWeight: '600',
    color: colorTextPrimary,
  },
  species: {
    ...textSm,
    color: colorTextSecondary,
  },
  meta: {
    ...textSm,
    color: colorTextSecondary,
  },
});
