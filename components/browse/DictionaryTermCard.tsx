/**
 * @module components/browse/DictionaryTermCard
 * 盆栽用語辞典の用語カード。Web 版 TermCard（app/(main)/dictionary/TermList.tsx）のレイアウトを踏襲。
 * よみがな・用語名・カテゴリバッジ（色分け）を表示し、タップで詳細へ遷移する。
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  colorTextPrimary,
  colorTextSecondary,
  colorSurface,
  colorBorder,
  spacing2,
  spacing3,
  spacing4,
  radiusLg,
  radiusFull,
  textXs,
  textBase,
  textMd,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// カテゴリカラーマップ（Web 版 CATEGORY_COLORS を RN トークンへ変換）
// ---------------------------------------------------------------------------

type CategoryColors = {
  bg: string;
  text: string;
};

const CATEGORY_COLOR_MAP: Readonly<Record<string, CategoryColors>> = {
  '樹形': { bg: '#d1fae5', text: '#065f46' },
  '技術・作業': { bg: '#dbeafe', text: '#1e40af' },
  '管理・育成': { bg: '#dcfce7', text: '#166534' },
  '道具・用品': { bg: '#ffedd5', text: '#9a3412' },
  '盆器・鉢': { bg: '#fef3c7', text: '#92400e' },
  '用土・肥料': { bg: '#fef9c3', text: '#854d0e' },
  '展示・鑑賞': { bg: '#ede9fe', text: '#5b21b6' },
} as const;

const CATEGORY_COLOR_FALLBACK: CategoryColors = { bg: '#f5f5f4', text: '#57534e' };

const CARD_MIN_HEIGHT = 80;
const DESCRIPTION_LINES = 2;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type DictionaryTermCardProps = {
  term: string;
  reading: string;
  category: string;
  /** 説明文（一覧レスポンスには含まれないため省略可） */
  description?: string;
  onPress: () => void;
  accessibilityLabel: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DictionaryTermCard = memo(function DictionaryTermCard({
  term,
  reading,
  category,
  description,
  onPress,
  accessibilityLabel,
}: DictionaryTermCardProps) {
  const colors = CATEGORY_COLOR_MAP[category] ?? CATEGORY_COLOR_FALLBACK;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.header}>
        <View style={styles.termBlock}>
          <Text style={styles.reading} numberOfLines={1}>
            {reading}
          </Text>
          <Text style={styles.term} numberOfLines={1}>
            {term}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{category}</Text>
        </View>
      </View>

      {description !== undefined && description.length > 0 && (
        <Text style={styles.description} numberOfLines={DESCRIPTION_LINES}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: CARD_MIN_HEIGHT,
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    ...shadowWashi,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing2,
  },
  termBlock: {
    flex: 1,
    minWidth: 0,
  },
  reading: {
    ...textXs,
    color: colorTextSecondary,
    marginBottom: spacing2,
    lineHeight: 14,
  },
  term: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
    lineHeight: 22,
  },
  badge: {
    flexShrink: 0,
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeText: {
    ...textXs,
    fontWeight: '500',
    lineHeight: 16,
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    marginTop: spacing3,
    lineHeight: 20,
  },
});
