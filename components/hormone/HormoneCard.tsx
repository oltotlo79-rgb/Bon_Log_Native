/**
 * @module components/hormone/HormoneCard
 * Web 版 HormoneCard（components/hormone/HormoneCard.tsx）のレイアウトを RN に移植。
 * 名前・英名・カテゴリバッジ・説明文・化学式を表示し、タップで詳細へ遷移する。
 * スラッグに対応する画像がある五大ホルモン（auxin / gibberellin / cytokinin /
 * abscisic-acid / ethylene）はサムネイル画像付きで表示する。
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import {
  colorTextPrimary,
  colorTextSecondary,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  spacing2,
  spacing3,
  spacing4,
  radiusLg,
  radiusMd,
  radiusFull,
  textXs,
  textSm,
  textMd,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 画像マップ（Metro bundler は require() の動的呼び出しを解決できないため
// スラッグ → 画像の対応を静的に宣言する）
// ---------------------------------------------------------------------------

const HORMONE_IMAGE_MAP: Readonly<Record<string, number>> = {
  auxin: require('@/assets/images/hormones/hormone-auxin.webp') as number,
  gibberellin: require('@/assets/images/hormones/hormone-gibberellin.webp') as number,
  cytokinin: require('@/assets/images/hormones/hormone-cytokinin.webp') as number,
  'abscisic-acid': require('@/assets/images/hormones/hormone-abscisic.webp') as number,
  ethylene: require('@/assets/images/hormones/hormone-ethylene.webp') as number,
} as const;

// ---------------------------------------------------------------------------
// カテゴリバッジ色（Web 版 HormoneCategoryBadge に倣い major / secondary で区別）
// ---------------------------------------------------------------------------

type BadgeColors = { bg: string; text: string };

const CATEGORY_BADGE_COLORS: Readonly<Record<string, BadgeColors>> = {
  major: { bg: '#dcfce7', text: '#166534' },
  secondary: { bg: '#dbeafe', text: '#1e40af' },
} as const;

const CATEGORY_BADGE_FALLBACK: BadgeColors = { bg: '#f5f5f4', text: '#57534e' };

const CATEGORY_LABEL_MAP: Readonly<Record<string, string>> = {
  major: '五大ホルモン',
  secondary: '二次ホルモン',
} as const;

// ---------------------------------------------------------------------------
// サムネイル寸法
// ---------------------------------------------------------------------------

const THUMB_SIZE = 72;
const DESCRIPTION_MAX_LINES = 2;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type HormoneCardProps = {
  name: string;
  nameEn: string | null;
  slug: string;
  category: string;
  description: string | null;
  chemicalFormula: string | null;
  onPress: () => void;
  accessibilityLabel: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const HormoneCard = memo(function HormoneCard({
  name,
  nameEn,
  slug,
  category,
  description,
  chemicalFormula,
  onPress,
  accessibilityLabel,
}: HormoneCardProps) {
  const thumbSource = HORMONE_IMAGE_MAP[slug];
  const badgeColors = CATEGORY_BADGE_COLORS[category] ?? CATEGORY_BADGE_FALLBACK;
  const categoryLabel = CATEGORY_LABEL_MAP[category] ?? category;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.row}>
        {thumbSource !== undefined && (
          <Image
            source={thumbSource}
            style={styles.thumbnail}
            contentFit="cover"
            accessibilityLabel={name}
          />
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
              <Text style={[styles.badgeText, { color: badgeColors.text }]}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          {nameEn !== null && nameEn.length > 0 && (
            <Text style={styles.nameEn} numberOfLines={1}>
              {nameEn}
            </Text>
          )}

          {chemicalFormula !== null && chemicalFormula.length > 0 && (
            <Text style={styles.formula} numberOfLines={1}>
              {chemicalFormula}
            </Text>
          )}
        </View>
      </View>

      {description !== null && description.length > 0 && (
        <Text style={styles.description} numberOfLines={DESCRIPTION_MAX_LINES}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    ...shadowWashi,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing3,
  },
  thumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: spacing2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  name: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  badge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeText: {
    ...textXs,
    fontWeight: '500',
    lineHeight: 16,
  },
  nameEn: {
    ...textSm,
    color: colorTextSecondary,
  },
  formula: {
    ...textXs,
    color: colorTextSecondary,
    backgroundColor: colorSurfaceMuted,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusMd,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
    marginTop: spacing3,
    lineHeight: 20,
  },
});
