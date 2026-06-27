/**
 * @module app/fertilizers/tree-species/[slug]/index
 * 樹種別施肥スケジュール画面。月別グリッド（View ベース）で施肥タイミングを表示する。
 * 仕様: docs/design/browse-screens.md §3.5
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFertilizationScheduleQuery } from '@/lib/queries/fertilizers';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorActionPrimary,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  textXs,
  textSm,
  textBase,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 施肥アクションの日本語ラベルとレベルマッピング
// ---------------------------------------------------------------------------

const ACTION_LABEL: Record<string, string> = {
  none: 'なし',
  light: '少し',
  moderate: '標準',
  heavy: '多め',
};

const ACTION_HAS_FERTILIZER = (action: string): boolean => action !== 'none';

// ---------------------------------------------------------------------------
// MonthlyScheduleGrid
// ---------------------------------------------------------------------------

type FertilizationMonth = {
  month: number;
  action: string;
  nitrogenLevel: string | null;
  phosphorusLevel: string | null;
  potassiumLevel: string | null;
  recommendedType: string | null;
  description: string | null;
};

type MonthlyScheduleGridProps = {
  months: FertilizationMonth[];
  onMonthPress: (month: FertilizationMonth) => void;
  selectedMonth: number | null;
};

function MonthlyScheduleGrid({ months, onMonthPress, selectedMonth }: MonthlyScheduleGridProps) {
  const { width } = useWindowDimensions();
  const cellWidth = Math.floor((width - spacing4 * 2) / 6);

  const sortedMonths = [...months].sort((a, b) => a.month - b.month);

  return (
    <View
      style={styles.grid}
      accessibilityLabel="月別施肥スケジュール"
    >
      {sortedMonths.map((m) => {
        const hasFertilizer = ACTION_HAS_FERTILIZER(m.action);
        const isSelected = selectedMonth === m.month;
        return (
          <TouchableOpacity
            key={m.month}
            style={[styles.monthCell, { width: cellWidth }]}
            onPress={() => onMonthPress(m)}
            accessibilityRole="button"
            accessibilityLabel={`${m.month}月: 施肥${hasFertilizer ? 'あり' : 'なし'}（${ACTION_LABEL[m.action] ?? m.action}）`}
          >
            <Text style={styles.monthLabel}>{m.month}月</Text>
            <View
              style={[
                styles.monthIndicator,
                hasFertilizer ? styles.monthIndicatorActive : styles.monthIndicatorInactive,
                isSelected && styles.monthIndicatorSelected,
              ]}
            />
            <Text
              style={[
                styles.actionLabel,
                hasFertilizer ? styles.actionLabelActive : styles.actionLabelInactive,
              ]}
            >
              {ACTION_LABEL[m.action] ?? m.action}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TreeSpeciesScheduleScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const rawName = params['name'];
  const treeSpeciesName = typeof rawName === 'string' && rawName.length > 0 ? rawName : slug;

  const { data, isLoading, isError, refetch } = useFertilizationScheduleQuery(slug ?? '');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const handleMonthPress = useCallback((month: FertilizationMonth) => {
    setSelectedMonth((prev) => (prev === month.month ? null : month.month));
  }, []);

  const selectedMonthData =
    selectedMonth !== null
      ? data?.months.find((m) => m.month === selectedMonth)
      : undefined;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: `${treeSpeciesName}の施肥スケジュール`,
          headerShown: true,
        }}
      />

      <OfflineBanner isVisible={!isOnline} />

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError || slug === '' ? (
        <ScreenError
          title="施肥情報を読み込めませんでした。"
          description={ERR_FERTILIZERS_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : !data || data.months.length === 0 ? (
        <ScreenEmpty title="スケジュール情報がありません" />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing8 },
          ]}
        >
          <MonthlyScheduleGrid
            months={data.months}
            onMonthPress={handleMonthPress}
            selectedMonth={selectedMonth}
          />

          {/* 凡例 */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colorActionPrimary }]} />
              <Text style={styles.legendText}>施肥あり</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colorSurfaceMuted }]} />
              <Text style={styles.legendText}>施肥なし</Text>
            </View>
          </View>

          {/* 選択月の詳細 */}
          {selectedMonthData !== undefined && (
            <View style={styles.monthDetail}>
              <Text style={styles.monthDetailTitle} accessibilityRole="header">
                {selectedMonthData.month}月の詳細
              </Text>
              {selectedMonthData.recommendedType !== null && (
                <Text style={styles.monthDetailItem}>
                  推奨肥料: {selectedMonthData.recommendedType}
                </Text>
              )}
              {selectedMonthData.description !== null && (
                <Text style={styles.monthDetailItem}>{selectedMonthData.description}</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing4,
  },
  monthCell: {
    alignItems: 'center',
    paddingVertical: spacing3,
    minHeight: 70,
    gap: spacing2,
  },
  monthLabel: {
    ...textXs,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  monthIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  monthIndicatorActive: {
    backgroundColor: colorActionPrimary,
  },
  monthIndicatorInactive: {
    backgroundColor: colorSurfaceMuted,
  },
  monthIndicatorSelected: {
    borderWidth: 2,
    borderColor: colorTextPrimary,
  },
  actionLabel: {
    ...textXs,
    textAlign: 'center',
  },
  actionLabelActive: {
    color: colorTextPrimary,
  },
  actionLabelInactive: {
    color: colorTextTertiary,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing6,
    marginBottom: spacing4,
    paddingHorizontal: spacing3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...textSm,
    color: colorTextSecondary,
  },
  monthDetail: {
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing4,
    gap: spacing2,
  },
  monthDetailTitle: {
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  monthDetailItem: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
  },
});
