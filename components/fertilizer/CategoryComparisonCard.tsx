/**
 * @module components/fertilizer/CategoryComparisonCard
 * 肥料カテゴリをメリット・デメリット・盆栽での使い方のパネルつきカードで表示する。
 * Web 版 CategoryComparisonTable の 1 カードに対応。
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBorder,
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorCategoryGreenText,
  colorCategoryRoseText,
  colorCategoryBlueDarkText,
  spacing3,
  spacing4,
  radiusMd,
  textBase,
  textSm,
  shadowWashi,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// カテゴリ画像マッピング
// ---------------------------------------------------------------------------

// Metro bundler は require() をビルド時に number 型 ID に解決する。
// 変数に代入することで number 推論を確定させてから Map に格納する。
const IMG_ORGANIC: number = require('@/assets/images/fertilizers/category-organic.webp');
const IMG_CHEMICAL: number = require('@/assets/images/fertilizers/category-chemical.webp');
const IMG_LIQUID: number = require('@/assets/images/fertilizers/category-liquid.webp');

const CATEGORY_IMAGE_MAP: Record<string, number> = {
  'category-organic': IMG_ORGANIC,
  'category-chemical': IMG_CHEMICAL,
  'category-liquid': IMG_LIQUID,
};

function getCategoryImage(name: string): number | undefined {
  if (name.includes('有機')) return CATEGORY_IMAGE_MAP['category-organic'];
  if (name.includes('化成')) return CATEGORY_IMAGE_MAP['category-chemical'];
  if (name.includes('液') || name.includes('水肥')) return CATEGORY_IMAGE_MAP['category-liquid'];
  return undefined;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CategoryComparisonCardProps = {
  name: string;
  description: string | null;
  merit: string | null;
  demerit: string | null;
  bonsaiUsage: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CategoryComparisonCard = memo(function CategoryComparisonCard({
  name,
  description,
  merit,
  demerit,
  bonsaiUsage,
}: CategoryComparisonCardProps) {
  const imgSource = getCategoryImage(name);
  const hasPanel = merit !== null || demerit !== null || bonsaiUsage !== null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {imgSource !== undefined && (
          <Image
            source={imgSource}
            style={styles.categoryImage}
            contentFit="cover"
            accessibilityLabel={name}
          />
        )}
        <View style={styles.headerText}>
          <Text style={styles.name}>{name}</Text>
          {description !== null && description.length > 0 && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
      </View>

      {hasPanel && (
        <View style={styles.panels}>
          {merit !== null && merit.length > 0 && (
            <View style={[styles.panel, styles.meritPanel]}>
              <View style={styles.panelTitleRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={[styles.panelTitle, { color: colorCategoryGreenText }]}>メリット</Text>
              </View>
              <Text style={styles.panelBody}>{merit}</Text>
            </View>
          )}
          {demerit !== null && demerit.length > 0 && (
            <View style={[styles.panel, styles.demeritPanel]}>
              <View style={styles.panelTitleRow}>
                <Ionicons name="close-circle" size={16} color="#e11d48" accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={[styles.panelTitle, { color: colorCategoryRoseText }]}>デメリット</Text>
              </View>
              <Text style={styles.panelBody}>{demerit}</Text>
            </View>
          )}
          {bonsaiUsage !== null && bonsaiUsage.length > 0 && (
            <View style={[styles.panel, styles.usagePanel]}>
              <View style={styles.panelTitleRow}>
                <Ionicons name="bulb" size={16} color="#0284c7" accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={[styles.panelTitle, { color: colorCategoryBlueDarkText }]}>盆栽での使い方</Text>
              </View>
              <Text style={styles.panelBody}>{bonsaiUsage}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    overflow: 'hidden',
    ...shadowWashi,
  },
  header: {
    flexDirection: 'row',
    gap: spacing4,
    padding: spacing4,
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: radiusMd,
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: spacing3,
  },
  name: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  panels: {
    borderTopWidth: 1,
    borderTopColor: colorBorder,
  },
  panel: {
    padding: spacing4,
    gap: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorder,
  },
  meritPanel: {
    backgroundColor: 'rgba(209, 250, 229, 0.4)',
  },
  demeritPanel: {
    backgroundColor: 'rgba(255, 228, 230, 0.4)',
  },
  usagePanel: {
    backgroundColor: 'rgba(224, 242, 254, 0.4)',
    borderBottomWidth: 0,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
  },
  panelTitle: {
    ...textSm,
    fontFamily: fontFamilySerifBold,
  },
  panelBody: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
});
