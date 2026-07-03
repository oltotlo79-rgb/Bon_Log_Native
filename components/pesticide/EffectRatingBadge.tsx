/**
 * @module components/pesticide/EffectRatingBadge
 * 病害虫の効果評価バッジ（◎/○/△/×/—）。
 * Web 版 components/pesticide/EffectRatingBadge.tsx を RN に移植した共通部品。
 * 病害虫詳細・農薬製品詳細の両画面から使用する。
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { components } from '@/lib/api/generated/schema.d.ts';
import {
  colorSurfaceMuted,
  colorBorderLight,
  colorTextTertiary,
  colorCategoryGreenBg,
  colorCategoryGreenText,
  colorCategoryBlueBg,
  colorCategoryBlueDarkText,
  colorCategoryAmberBg,
  colorCategoryAmberText,
  colorCategoryRedBg,
  colorCategoryRedText,
  colorEfficacyExcellentBorder,
  colorEfficacyGoodBorder,
  colorEfficacyFairBorder,
  colorEfficacyPoorBorder,
  spacing2,
  radiusSm,
  textXs,
} from '@/lib/constants/design-tokens';

type EffectRating = components['schemas']['EffectRating'];

const EFFECT_RATING_CONFIG: Record<EffectRating, { mark: string; bg: string; text: string; border: string }> = {
  excellent: { mark: '◎', bg: colorCategoryGreenBg, text: colorCategoryGreenText, border: colorEfficacyExcellentBorder },
  good:      { mark: '○', bg: colorCategoryBlueBg, text: colorCategoryBlueDarkText, border: colorEfficacyGoodBorder },
  fair:      { mark: '△', bg: colorCategoryAmberBg, text: colorCategoryAmberText, border: colorEfficacyFairBorder },
  poor:      { mark: '×', bg: colorCategoryRedBg, text: colorCategoryRedText, border: colorEfficacyPoorBorder },
  none:      { mark: '—', bg: colorSurfaceMuted, text: colorTextTertiary, border: colorBorderLight },
};

type EffectRatingBadgeProps = {
  rating: EffectRating | null;
  label: string;
};

export const EffectRatingBadge = memo(function EffectRatingBadge({ rating, label }: EffectRatingBadgeProps) {
  if (rating === null) return null;
  const config = EFFECT_RATING_CONFIG[rating];
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.mark, { backgroundColor: config.bg, borderColor: config.border }]}>
        <Text style={[styles.markText, { color: config.text }]}>{config.mark}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  label: {
    ...textXs,
    color: colorTextTertiary,
  },
  mark: {
    width: 24,
    height: 24,
    borderRadius: radiusSm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
