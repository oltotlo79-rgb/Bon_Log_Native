/**
 * @module components/shops/ShopCard
 * 盆栽園一覧の各行に表示するカード。
 * 仕様: docs/design/shops.md §2.3
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorWarning,
  spacing3,
  spacing4,
  radiusLg,
  radiusMd,
  shadowWashi,
  textMd,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const THUMBNAIL_SIZE = 80;
const STORE_ICON_SIZE = 32;
const CHEVRON_SIZE = 16;
const STAR_SIZE = 12;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type ShopCardProps = {
  id: string;
  name: string;
  address: string;
  genres: string[];
  averageRating: number | null;
  reviewCount: number;
  onPress: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ShopCardInner({
  name,
  address,
  genres,
  averageRating,
  reviewCount,
  onPress,
}: ShopCardProps) {
  const genreLabel = genres.slice(0, 2).join(' / ');
  const shortAddress = address.length > 20 ? address.slice(0, 20) + '...' : address;
  const ratingDisplay = averageRating !== null ? averageRating.toFixed(1) : '-';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}の詳細を見る。評価 ${ratingDisplay} 点。レビュー ${reviewCount} 件。`}
    >
      {/* サムネイル（placeholder のみ: ShopItem に thumbnailUrl フィールドがない） */}
      <View style={styles.thumbnail}>
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons
            name="storefront-outline"
            size={STORE_ICON_SIZE}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      </View>

      {/* 情報エリア */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {genreLabel.length > 0 && (
          <Text style={styles.genre} numberOfLines={1}>{genreLabel}</Text>
        )}
        <View style={styles.ratingRow}>
          <Text style={styles.star} accessibilityElementsHidden importantForAccessibility="no">★</Text>
          <Text style={styles.rating}>{ratingDisplay}</Text>
          <Text style={styles.reviewCount}>({reviewCount}件)</Text>
        </View>
        {shortAddress !== undefined && (
          <Text style={styles.address} numberOfLines={1}>{shortAddress}</Text>
        )}
      </View>

      {/* 右端シェブロン */}
      <Ionicons
        name="chevron-forward"
        size={CHEVRON_SIZE}
        color={colorTextTertiary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

export const ShopCard = React.memo(ShopCardInner);

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
  genre: {
    ...textXs,
    color: colorTextTertiary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    fontSize: STAR_SIZE,
    color: colorWarning,
  },
  rating: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  reviewCount: {
    ...textXs,
    color: colorTextSecondary,
  },
  address: {
    ...textSm,
    color: colorTextSecondary,
  },
});
