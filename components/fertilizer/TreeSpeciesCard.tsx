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

type TreeCategory = 'conifer' | 'deciduous' | 'flowering' | 'fruiting' | 'grass' | 'evergreen';

type BadgeConfig = {
  label: string;
  bg: string;
  text: string;
};

const TREE_CATEGORY_CONFIG: Record<TreeCategory, BadgeConfig> = {
  conifer:   { label: '松柏類',     bg: '#d1fae5', text: '#065f46' },
  deciduous: { label: '雑木類',     bg: '#e0f2fe', text: '#0369a1' },
  flowering: { label: '花物',       bg: '#ffe4e6', text: '#9f1239' },
  fruiting:  { label: '実物',       bg: '#ffedd5', text: '#9a3412' },
  grass:     { label: '草物',       bg: '#ecfccb', text: '#3f6212' },
  evergreen: { label: '常緑広葉樹', bg: '#ccfbf1', text: '#115e59' },
};

const FALLBACK_BADGE: BadgeConfig = { label: 'その他', bg: colorSurfaceMuted, text: colorTextSecondary };

function getTreeBadge(category: string): BadgeConfig {
  if (
    category === 'conifer' || category === 'deciduous' || category === 'flowering' ||
    category === 'fruiting' || category === 'grass' || category === 'evergreen'
  ) {
    return TREE_CATEGORY_CONFIG[category];
  }
  return FALLBACK_BADGE;
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
