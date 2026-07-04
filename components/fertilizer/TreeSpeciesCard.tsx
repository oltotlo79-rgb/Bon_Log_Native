/**
 * @module components/fertilizer/TreeSpeciesCard
 * 樹種を Web 版 TreeSpeciesCard に倣いカード形式で表示する。
 * カテゴリバッジの色は TREE_CATEGORY_CONFIG に集約。
 */

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  colorBorder,
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorSurfaceMuted,
  colorCategoryGreenBg,
  colorCategoryGreenText,
  colorCategoryBlueBg,
  colorCategoryBlueText,
  colorCategoryRoseBg,
  colorCategoryRoseText,
  colorCategoryOrangeBg,
  colorCategoryOrangeText,
  colorCategoryLimeBg,
  colorCategoryLimeText,
  colorCategoryTealBg,
  colorCategoryTealText,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  radiusFull,
  textMd,
  textSm,
  textXs,
  shadowWashi,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// カテゴリバッジ設定（Web の TREE_CATEGORY_BADGE に対応）
// ---------------------------------------------------------------------------

export type TreeCategory = 'conifer' | 'deciduous' | 'flowering' | 'fruiting' | 'grass' | 'evergreen';

export type TreeBadgeConfig = {
  label: string;
  bg: string;
  text: string;
};

export const TREE_CATEGORY_CONFIG: Record<TreeCategory, TreeBadgeConfig> = {
  conifer:   { label: '松柏類',     bg: colorCategoryGreenBg,  text: colorCategoryGreenText },
  deciduous: { label: '雑木類',     bg: colorCategoryBlueBg,   text: colorCategoryBlueText },
  flowering: { label: '花物',       bg: colorCategoryRoseBg,   text: colorCategoryRoseText },
  fruiting:  { label: '実物',       bg: colorCategoryOrangeBg, text: colorCategoryOrangeText },
  grass:     { label: '草物',       bg: colorCategoryLimeBg,   text: colorCategoryLimeText },
  evergreen: { label: '常緑広葉樹', bg: colorCategoryTealBg,   text: colorCategoryTealText },
};

export const TREE_CATEGORY_FALLBACK_BADGE: TreeBadgeConfig = {
  label: 'その他',
  bg: colorSurfaceMuted,
  text: colorTextSecondary,
};

/** カテゴリ文字列を Web と同じ配色バッジ設定へ変換する（未知の値はその他扱い） */
export function getTreeBadge(category: string): TreeBadgeConfig {
  if (
    category === 'conifer' || category === 'deciduous' || category === 'flowering' ||
    category === 'fruiting' || category === 'grass' || category === 'evergreen'
  ) {
    return TREE_CATEGORY_CONFIG[category];
  }
  return TREE_CATEGORY_FALLBACK_BADGE;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type TreeSpeciesCardProps = {
  name: string;
  category: string;
  fertilizingPolicy: string | null;
  slug: string;
  onPress: (slug: string, name: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TreeSpeciesCard = memo(function TreeSpeciesCard({
  name,
  category,
  fertilizingPolicy,
  slug,
  onPress,
}: TreeSpeciesCardProps) {
  const handlePress = useCallback(() => onPress(slug, name), [onPress, slug, name]);
  const badge = getTreeBadge(category);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${name}の施肥スケジュールを見る`}
    >
      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
        {fertilizingPolicy !== null && fertilizingPolicy.length > 0 && (
          <Text style={styles.policy} numberOfLines={3}>
            {fertilizingPolicy}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    ...shadowWashi,
  },
  inner: {
    padding: spacing4,
    gap: spacing2,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing2,
  },
  name: {
    ...textMd,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  badge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  badgeText: {
    ...textXs,
    fontFamily: fontFamilySerifBold,
  },
  policy: {
    ...textSm,
    color: colorTextSecondary,
  },
  spacing3: {
    marginTop: spacing3,
  },
});
