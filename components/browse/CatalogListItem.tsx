/**
 * @module components/browse/CatalogListItem
 * カタログ系一覧の共通行コンポーネント。
 * 名称・補足テキスト・カテゴリタグ・右端シェブロンを表示し、タップで詳細へ遷移する。
 * 仕様: docs/design/browse-screens.md §C-1
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorSurfaceMuted,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  radiusSm,
  textMd,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHEVRON_SIZE = 16;
const CELL_MIN_HEIGHT = 60;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CatalogListItemProps = {
  /** 主テキスト（用語名・ホルモン名・病害虫名など）*/
  title: string;
  /** 補助テキスト（読み・英名・概要など）*/
  subtitle?: string;
  /** カテゴリタグ（任意）*/
  categoryLabel?: string;
  /** 左端プレフィックステキスト（栄養素シンボルなど・任意）*/
  prefix?: string;
  /** タップ時コールバック */
  onPress: () => void;
  accessibilityLabel: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CatalogListItem = memo(function CatalogListItem({
  title,
  subtitle,
  categoryLabel,
  prefix,
  onPress,
  accessibilityLabel,
}: CatalogListItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {prefix !== undefined && prefix.length > 0 && (
        <View style={styles.prefixContainer}>
          <Text style={styles.prefix}>{prefix}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle !== undefined && subtitle.length > 0 && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {categoryLabel !== undefined && categoryLabel.length > 0 && (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={CHEVRON_SIZE}
        color={colorTextTertiary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: CELL_MIN_HEIGHT,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  prefixContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: spacing3,
  },
  prefix: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    color: colorTextPrimary,
  },
  content: {
    flex: 1,
    gap: spacing2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  title: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  subtitle: {
    ...textSm,
    color: colorTextSecondary,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  categoryText: {
    ...textXs,
    color: colorTextSecondary,
  },
});
