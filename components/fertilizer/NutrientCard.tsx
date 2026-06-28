/**
 * @module components/fertilizer/NutrientCard
 * 栄養素を Web 版 NutrientCard に倣いカード形式で表示する。
 * カテゴリバッジの色は NUTRIENT_CATEGORY_CONFIG に集約。
 */

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  colorBorder,
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorSurfaceMuted,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  textMd,
  textSm,
  textXs,
  shadowWashi,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// カテゴリバッジ設定（Web の NUTRIENT_CATEGORY_BADGE に対応）
// ---------------------------------------------------------------------------

type NutrientCategory = 'primary' | 'secondary' | 'trace';

type BadgeConfig = {
  label: string;
  bg: string;
  text: string;
};

const NUTRIENT_CATEGORY_CONFIG: Record<NutrientCategory, BadgeConfig> = {
  primary:   { label: '三大要素', bg: '#d1fae5', text: '#065f46' },
  secondary: { label: '二次要素', bg: '#e0f2fe', text: '#0369a1' },
  trace:     { label: '微量要素', bg: '#fef3c7', text: '#92400e' },
};

const FALLBACK_BADGE: BadgeConfig = { label: 'その他', bg: colorSurfaceMuted, text: colorTextSecondary };

function getNutrientBadge(category: string): BadgeConfig {
  if (category === 'primary' || category === 'secondary' || category === 'trace') {
    return NUTRIENT_CATEGORY_CONFIG[category];
  }
  return FALLBACK_BADGE;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type NutrientCardProps = {
  symbol: string;
  name: string;
  category: string;
  bonsaiRole: string | null;
  slug: string;
  onPress: (slug: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NutrientCard = memo(function NutrientCard({
  symbol,
  name,
  category,
  bonsaiRole,
  slug,
  onPress,
}: NutrientCardProps) {
  const handlePress = useCallback(() => onPress(slug), [onPress, slug]);
  const badge = getNutrientBadge(category);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${name}（${symbol}）の詳細を見る`}
    >
      <View style={styles.inner}>
        <Text style={styles.symbol}>{symbol}</Text>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>
          {bonsaiRole !== null && bonsaiRole.length > 0 && (
            <Text style={styles.role} numberOfLines={2}>
              {bonsaiRole}
            </Text>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing4,
    gap: spacing3,
  },
  symbol: {
    fontSize: 24,
    fontFamily: fontFamilySerifBold,
    lineHeight: 32,
    color: colorActionPrimary,
  },
  info: {
    flex: 1,
    gap: spacing2,
  },
  nameRow: {
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
    borderRadius: 9999,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  badgeText: {
    ...textXs,
    fontFamily: fontFamilySerifBold,
  },
  role: {
    ...textSm,
    color: colorTextSecondary,
  },
});
