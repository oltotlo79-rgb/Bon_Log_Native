/**
 * @module components/shops/ShopCard
 * 盆栽園一覧の各行に表示するカード。
 * Web 版 ShopCard に寄せた構造（店名+評価横並び / アイコン付き情報行 / ジャンルタグ）。
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
  colorActionSecondary,
  colorActionSecondaryText,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  radiusLg,
  radiusMd,
  radiusFull,
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
const INFO_ICON_SIZE = 14;
const CHEVRON_SIZE = 16;

// 星アイコンは Ionicons の star と star-outline を整数部で切り替える
const MAX_STARS = 5;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type ShopCardProps = {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  businessHours?: string | null;
  closedDays?: string | null;
  genres: string[];
  averageRating: number | null;
  reviewCount: number;
  onPress: () => void;
};

// ---------------------------------------------------------------------------
// サブコンポーネント
// ---------------------------------------------------------------------------

type StarRowProps = {
  rating: number | null;
  reviewCount: number;
};

function StarRow({ rating, reviewCount }: StarRowProps) {
  if (rating === null) {
    return (
      <Text style={styles.noRating}>レビューなし</Text>
    );
  }

  return (
    <View style={styles.starRow}>
      {Array.from({ length: MAX_STARS }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < Math.round(rating) ? 'star' : 'star-outline'}
          size={12}
          color={colorWarning}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      <Text style={styles.reviewCountText}>({reviewCount}件)</Text>
    </View>
  );
}

type InfoRowProps = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
};

function InfoRow({ iconName, text }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={iconName}
        size={INFO_ICON_SIZE}
        color={colorTextTertiary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.infoText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ShopCardInner({
  name,
  address,
  phone,
  businessHours,
  closedDays,
  genres,
  averageRating,
  reviewCount,
  onPress,
}: ShopCardProps) {
  const ratingLabel = averageRating !== null ? averageRating.toFixed(1) : 'なし';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}の詳細を見る。評価 ${ratingLabel} 点。レビュー ${reviewCount} 件。`}
    >
      {/* 上段: サムネイル + 情報 */}
      <View style={styles.topRow}>
        {/* サムネイル（APIに画像フィールドなし → placeholder） */}
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
          {/* 店名 + 評価を横並び（Web 版のレイアウトに対応） */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <StarRow rating={averageRating} reviewCount={reviewCount} />
          </View>

          {/* 住所（マップピンアイコン付き） */}
          <InfoRow iconName="location-outline" text={address} />

          {/* 電話（あれば表示） */}
          {phone != null && phone.length > 0 && (
            <InfoRow iconName="call-outline" text={phone} />
          )}

          {/* 営業時間（あれば表示） */}
          {businessHours != null && businessHours.length > 0 && (
            <InfoRow iconName="time-outline" text={businessHours} />
          )}

          {/* 定休日（あれば表示） */}
          {closedDays != null && closedDays.length > 0 && (
            <InfoRow iconName="calendar-outline" text={`定休日: ${closedDays}`} />
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
      </View>

      {/* ジャンルタグ（Web 版の flex-wrap タグ表示に対応） */}
      {genres.length > 0 && (
        <View style={styles.tagsRow}>
          {genres.slice(0, 3).map((genre) => (
            <View key={genre} style={styles.tag}>
              <Text style={styles.tagText}>{genre}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

export const ShopCard = React.memo(ShopCardInner);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    marginBottom: spacing3,
    borderWidth: 1,
    borderColor: colorBorderLight,
    gap: spacing2,
    ...shadowWashi,
  },
  cardPressed: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing3,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radiusMd,
    overflow: 'hidden',
    flexShrink: 0,
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
    gap: spacing1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  name: {
    ...textMd,
    fontWeight: '600',
    color: colorTextPrimary,
    flex: 1,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  ratingText: {
    ...textXs,
    color: colorTextPrimary,
    fontWeight: '600',
    marginLeft: 2,
  },
  reviewCountText: {
    ...textXs,
    color: colorTextSecondary,
  },
  noRating: {
    ...textXs,
    color: colorTextTertiary,
    flexShrink: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
  },
  infoText: {
    ...textSm,
    color: colorTextSecondary,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing1,
  },
  tag: {
    backgroundColor: colorActionSecondary,
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  tagText: {
    ...textXs,
    color: colorActionSecondaryText,
  },
  // 将来の画像フィールド追加時（API 側 thumbnailUrl 追加が前提）に使用する
  thumbnailImage: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
});
