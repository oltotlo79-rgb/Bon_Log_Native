/**
 * @module components/search/RecentSearchesPanel
 * 検索バーフォーカス時・未入力時に表示する「最近の検索」履歴パネル。
 * cfw の components/search/SearchBar.tsx のドロップダウン（isFocused && !query）に相当する。
 * 履歴データは hooks/use-recent-searches 経由（表示に徹し、永続化ロジックは持たない）。
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorSurface,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  textSm,
  textBase,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const HISTORY_ICON_SIZE = 18;
const REMOVE_ICON_SIZE = 16;
const REMOVE_BUTTON_SIZE = 44;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type RecentSearchesPanelProps = {
  searches: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecentSearchesPanel({
  searches,
  onSelect,
  onRemove,
  onClearAll,
}: RecentSearchesPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>最近の検索</Text>
        <Pressable
          style={styles.clearAllButton}
          onPress={onClearAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="検索履歴をすべて削除"
        >
          <Text style={styles.clearAllText}>すべて削除</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {searches.map((query) => (
          <View key={query} style={styles.row}>
            <Pressable
              style={styles.selectButton}
              onPress={() => onSelect(query)}
              accessibilityRole="button"
              accessibilityLabel={`${query}で検索`}
            >
              <Ionicons
                name="time-outline"
                size={HISTORY_ICON_SIZE}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.queryText} numberOfLines={1}>
                {query}
              </Text>
            </Pressable>
            <Pressable
              style={styles.removeButton}
              onPress={() => onRemove(query)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${query}の履歴を削除`}
            >
              <Ionicons
                name="close"
                size={REMOVE_ICON_SIZE}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSurface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing4,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  headerLabel: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  clearAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing2,
  },
  clearAllText: {
    ...textSm,
    color: colorActionPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  selectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    minHeight: 44,
    paddingHorizontal: spacing4,
  },
  queryText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  removeButton: {
    width: REMOVE_BUTTON_SIZE,
    height: REMOVE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing2,
  },
});
