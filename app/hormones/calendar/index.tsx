/**
 * @module app/hormones/calendar/index
 * 年間ホルモン活性カレンダー画面。Web 版 /hormones/calendar の完全再現。
 * simulator データの seasonalLevels を使い、ホルモンごとの月別レベルを
 * 12ヶ月グリッドで表示する。月タップでシミュレーターへ遷移する。
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.18
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormoneSimulatorQuery } from '@/lib/queries/hormones';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { HormoneDisclaimer } from '@/components/hormone/HormoneDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorBorder,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorTextInverse,
  colorLevelHighBg,
  colorLevelModerateBg,
  colorLevelLowBg,
  colorLevelMinimalBg,
  colorLevelMinimalText,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusMd,
  radiusSm,
  textBase,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 活性レベル設定（Web 版 hormone-techniques.ts HORMONE_LEVEL_CONFIG と同値）
// ---------------------------------------------------------------------------

type ActivityLevel = 'high' | 'moderate' | 'low' | 'minimal';

const LEVEL_CONFIG: Record<ActivityLevel, { bg: string; text: string; label: string; numericValue: number }> = {
  high: { bg: colorLevelHighBg, text: colorTextInverse, label: '高', numericValue: 3 },
  moderate: { bg: colorLevelModerateBg, text: colorTextInverse, label: '中', numericValue: 2 },
  low: { bg: colorLevelLowBg, text: colorTextInverse, label: '低', numericValue: 1 },
  minimal: { bg: colorLevelMinimalBg, text: colorLevelMinimalText, label: '微', numericValue: 0 },
};

const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
] as const;

function isActivityLevel(value: string): value is ActivityLevel {
  return value === 'high' || value === 'moderate' || value === 'low' || value === 'minimal';
}

function getLevelConfig(level: string) {
  const key = isActivityLevel(level) ? level : 'minimal';
  return LEVEL_CONFIG[key];
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneCalendarScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useHormoneSimulatorQuery();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const handleMonthPress = useCallback((month: number) => {
    setSelectedMonth((prev) => (prev === month ? null : month));
    router.push({
      pathname: '/hormones/simulator' as never,
      params: { month: String(month) },
    });
  }, []);

  const hormoneRows = useMemo(() => {
    if (data === undefined) return [];

    return data.hormones.map((hormone) => {
      const levelMap = new Map<number, string>();
      for (const sl of data.seasonalLevels) {
        if (sl.hormoneId === hormone.id) {
          levelMap.set(sl.month, sl.level);
        }
      }
      return { hormone, levelMap };
    });
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '年間ホルモン活性カレンダー', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '年間ホルモン活性カレンダー', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  if (hormoneRows.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '年間ホルモン活性カレンダー', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenEmpty title="カレンダーデータがありません" iconName="calendar-outline" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '年間ホルモン活性カレンダー', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HormoneDisclaimer />

        <Text style={styles.subtitle}>
          五大ホルモンの月別活性レベルを一覧で確認できます（関東地方の落葉広葉樹基準）
        </Text>
        <Text style={styles.tapHint}>
          月をタップするとシミュレーターへ移動します
        </Text>

        {/* ヒートマップ グリッド（ホルモン × 12ヶ月） */}
        <View style={styles.calendarCard}>
          {hormoneRows.map(({ hormone, levelMap }) => (
            <View key={hormone.id} style={styles.hormoneRow}>
              <Text style={styles.hormoneLabel} numberOfLines={1}>
                {hormone.name}
              </Text>

              {/* 月別セル 6列 × 2行 */}
              <View style={styles.monthGrid}>
                {MONTH_LABELS.map((label, i) => {
                  const month = i + 1;
                  const level = levelMap.get(month) ?? 'minimal';
                  const conf = getLevelConfig(level);
                  const isHighlighted = selectedMonth === month;

                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.monthCell,
                        { backgroundColor: conf.bg },
                        isHighlighted && styles.monthCellHighlighted,
                      ]}
                      onPress={() => handleMonthPress(month)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`${hormone.name} ${label} 活性レベル: ${conf.label}`}
                      accessibilityState={{ selected: isHighlighted }}
                    >
                      <Text style={[styles.monthCellLabel, { color: conf.text }]}>
                        {conf.label}
                      </Text>
                      <Text style={[styles.monthCellMonth, { color: conf.text }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* 凡例 */}
        <View style={styles.legendRow}>
          <Text style={styles.legendTitle}>凡例:</Text>
          {(Object.entries(LEVEL_CONFIG) as [ActivityLevel, typeof LEVEL_CONFIG[ActivityLevel]][]).map(
            ([key, conf]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: conf.bg }]} />
                <Text style={styles.legendLabel}>{conf.label}</Text>
              </View>
            ),
          )}
        </View>
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
    backgroundColor: colorBackground,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing4,
  },
  subtitle: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  tapHint: {
    ...textXs,
    color: colorTextSecondary,
    marginTop: -spacing3,
  },
  calendarCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    gap: spacing4,
  },
  hormoneRow: {
    gap: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingBottom: spacing4,
  },
  hormoneLabel: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  monthCell: {
    width: '14%',
    minWidth: 40,
    minHeight: 44,
    borderRadius: radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing2,
    flex: 1,
    maxWidth: '16%',
  },
  monthCellHighlighted: {
    borderWidth: 2,
    borderColor: colorTextPrimary,
  },
  monthCellLabel: {
    fontSize: 10,
    fontFamily: fontFamilySerifBold,
    lineHeight: 14,
  },
  monthCellMonth: {
    fontSize: 8,
    lineHeight: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing3,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing3,
  },
  legendTitle: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: spacing2,
  },
  legendLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
});
