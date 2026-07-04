/**
 * @module app/fertilizers/tree-species/[slug]/index
 * 樹種別施肥スケジュール詳細画面。Web版 /fertilizers/schedules/[slug] に準拠。
 * 季節サマリー・年間タイムライン・NPK列付きカレンダー・月別グリッドを表示する。
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.5
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFertilizationScheduleQuery } from '@/lib/queries/fertilizers';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import { getTreeBadge } from '@/components/fertilizer/TreeSpeciesCard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorActionPrimary,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  colorBorderLight,
  colorSuccess,
  colorSuccessBg,
  colorWarning,
  colorWarningBg,
  colorInfo,
  colorInfoBg,
  colorCategoryGreenBg,
  colorCategoryGreenText,
  colorCategoryBlueBg,
  colorCategoryBlueText,
  colorCategoryAmberBg,
  colorCategoryAmberText,
  colorNutrientNitrogenLowBg,
  colorNutrientPhosphorusHighBg,
  colorNutrientPhosphorusLowBg,
  colorCategoryRoseBg,
  colorCategoryGreenPaleBg,
  colorSeasonSummerBg,
  colorCategoryAmberPaleBg,
  colorSeasonWinterBg,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  textXs,
  textSm,
  textBase,
  textLg,
  textXl,
  radiusMd,
  radiusSm,
  radiusFull,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 施肥アクション定義
// ---------------------------------------------------------------------------

type FertilizerAction = 'none' | 'light' | 'moderate' | 'heavy';

const ACTION_LABEL: Record<FertilizerAction, string> = {
  none: 'なし',
  light: '控えめ',
  moderate: '通常',
  heavy: 'たっぷり',
};

const ACTION_BADGE_BG: Record<FertilizerAction, string> = {
  none: colorSurfaceMuted,
  light: colorCategoryAmberBg,
  moderate: colorCategoryBlueBg,
  heavy: colorCategoryGreenBg,
};

const ACTION_BADGE_TEXT: Record<FertilizerAction, string> = {
  none: colorTextTertiary,
  light: colorCategoryAmberText,
  moderate: colorCategoryBlueText,
  heavy: colorCategoryGreenText,
};

// タイムラインバーの背景色（Web の ACTION_BAR_COLOR に対応）
const ACTION_BAR_BG: Record<FertilizerAction, string> = {
  none: colorSurfaceMuted,
  light: colorWarningBg,
  moderate: colorInfoBg,
  heavy: colorSuccessBg,
};

// アクション文字列を FertilizerAction に変換するガード
function toFertilizerAction(value: string): FertilizerAction {
  if (value === 'light' || value === 'moderate' || value === 'heavy') {
    return value;
  }
  return 'none';
}

// ---------------------------------------------------------------------------
// 栄養素レベル定義
// ---------------------------------------------------------------------------

type NutrientLevel = 'high' | 'balanced' | 'low' | 'none';

const NUTRIENT_LEVEL_LABEL: Record<NutrientLevel, string> = {
  high: '多め',
  balanced: '通常',
  low: '控えめ',
  none: '不要',
};

// N の色（emerald 系）
const N_BAR_BG: Record<NutrientLevel, string> = {
  high: colorSuccess,
  balanced: colorSuccessBg,
  low: colorNutrientNitrogenLowBg,
  none: colorSurfaceMuted,
};

// P の色（rose 系）
const P_BAR_BG: Record<NutrientLevel, string> = {
  high: colorNutrientPhosphorusHighBg,
  balanced: colorCategoryRoseBg,
  low: colorNutrientPhosphorusLowBg,
  none: colorSurfaceMuted,
};

// K の色（sky 系）
const K_BAR_BG: Record<NutrientLevel, string> = {
  high: colorInfo,
  balanced: colorInfoBg,
  low: colorCategoryBlueBg,
  none: colorSurfaceMuted,
};

function toNutrientLevel(value: string | null): NutrientLevel {
  if (value === 'high' || value === 'balanced' || value === 'low') {
    return value;
  }
  return 'none';
}

// ---------------------------------------------------------------------------
// 季節定義
// ---------------------------------------------------------------------------

const SEASONS = [
  { label: '春', months: [3, 4, 5] },
  { label: '夏', months: [6, 7, 8] },
  { label: '秋', months: [9, 10, 11] },
  { label: '冬', months: [12, 1, 2] },
] as const;

// ---------------------------------------------------------------------------
// 月データ型
// ---------------------------------------------------------------------------

type FertilizationMonth = {
  month: number;
  action: string;
  nitrogenLevel: string | null;
  phosphorusLevel: string | null;
  potassiumLevel: string | null;
  recommendedType: string | null;
  description: string | null;
  cautionNote: string | null;
};

// ---------------------------------------------------------------------------
// 季節ごとの支配的アクション計算（Web の computeSeasonSummary に対応）
// ---------------------------------------------------------------------------

function isMonthInSeason(months: readonly number[], month: number): boolean {
  return months.includes(month);
}

function computeSeasonSummary(months: FertilizationMonth[]) {
  return SEASONS.map((season) => {
    const seasonMonths = months.filter((m) => isMonthInSeason(season.months, m.month));
    const counts = new Map<FertilizerAction, number>();
    for (const m of seasonMonths) {
      const action = toFertilizerAction(m.action);
      counts.set(action, (counts.get(action) ?? 0) + 1);
    }

    let dominant: FertilizerAction = 'none';
    let dominantCount = 0;
    for (const [action, count] of counts) {
      if (count > dominantCount) {
        dominant = action;
        dominantCount = count;
      }
    }

    return { label: season.label, dominantAction: dominant };
  });
}

// ---------------------------------------------------------------------------
// SeasonSummaryGrid — 仕様 §4.5.2
// ---------------------------------------------------------------------------

type SeasonSummaryGridProps = {
  months: FertilizationMonth[];
};

const SeasonSummaryGrid = memo(function SeasonSummaryGrid({ months }: SeasonSummaryGridProps) {
  const summary = computeSeasonSummary(months);

  return (
    <View style={summaryStyles.container} accessibilityLabel="季節ごとの施肥傾向">
      {summary.map((season) => {
        const bg = ACTION_BADGE_BG[season.dominantAction];
        const textColor = ACTION_BADGE_TEXT[season.dominantAction];
        return (
          <View key={season.label} style={summaryStyles.cell} accessibilityRole="text">
            <Text style={summaryStyles.seasonLabel}>{season.label}</Text>
            <View style={[summaryStyles.badge, { backgroundColor: bg }]}>
              <Text style={[summaryStyles.badgeText, { color: textColor }]}>
                {ACTION_LABEL[season.dominantAction]}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

const summaryStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing3,
  },
  cell: {
    flex: 1,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing3,
    alignItems: 'center',
    gap: spacing2,
    minHeight: 64,
    justifyContent: 'center',
  },
  seasonLabel: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: spacing2,
    paddingVertical: 3,
    borderRadius: radiusSm,
  },
  badgeText: {
    ...textXs,
    fontWeight: '500',
  },
});

// ---------------------------------------------------------------------------
// FertilizationTimeline — Web の FertilizationTimeline.tsx RN 版
// 12ヶ月を横軸に並べたバー表示。View の幅比率で描く。
// ---------------------------------------------------------------------------

type FertilizationTimelineProps = {
  months: FertilizationMonth[];
};

const FertilizationTimeline = memo(function FertilizationTimeline({
  months,
}: FertilizationTimelineProps) {
  const { width } = useWindowDimensions();
  // padding分を引いた実効幅
  const innerWidth = width - spacing4 * 2 - spacing4 * 2;
  // N/P/Kラベル幅
  const labelWidth = 16;
  const barWidth = innerWidth - labelWidth - spacing2;
  const cellWidth = barWidth / 12;

  const sortedPlans = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return (
      months.find((m) => m.month === month) ?? {
        month,
        action: 'none',
        nitrogenLevel: null,
        phosphorusLevel: null,
        potassiumLevel: null,
        recommendedType: null,
        description: null,
        cautionNote: null,
      }
    );
  });

  const nutrients: { key: 'nitrogenLevel' | 'phosphorusLevel' | 'potassiumLevel'; label: string; barBg: Record<NutrientLevel, string> }[] = [
    { key: 'nitrogenLevel', label: 'N', barBg: N_BAR_BG },
    { key: 'phosphorusLevel', label: 'P', barBg: P_BAR_BG },
    { key: 'potassiumLevel', label: 'K', barBg: K_BAR_BG },
  ];

  return (
    <View accessibilityLabel="年間施肥タイムライン">
      {/* 季節ヘッダー */}
      <View style={timelineStyles.seasonHeader}>
        <View style={{ width: labelWidth + spacing2 }} />
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {SEASONS.map((season) => (
            <View
              key={season.label}
              style={[timelineStyles.seasonCell, { width: cellWidth * season.months.length }]}
            >
              <Text style={timelineStyles.seasonText}>{season.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* アクションバー */}
      <View style={timelineStyles.row}>
        <View style={{ width: labelWidth + spacing2 }} />
        <View style={timelineStyles.barRow}>
          {sortedPlans.map((plan) => {
            const action = toFertilizerAction(plan.action);
            return (
              <View
                key={plan.month}
                style={[
                  timelineStyles.actionCell,
                  { width: cellWidth, backgroundColor: ACTION_BAR_BG[action] },
                ]}
                accessibilityLabel={`${plan.month}月: ${ACTION_LABEL[action]}`}
              />
            );
          })}
        </View>
      </View>

      {/* NPK バー */}
      {nutrients.map((nutrient) => (
        <View key={nutrient.key} style={timelineStyles.row}>
          <Text style={timelineStyles.nutrientLabel}>{nutrient.label}</Text>
          <View style={{ width: spacing2 }} />
          <View style={timelineStyles.barRow}>
            {sortedPlans.map((plan) => {
              const level = toNutrientLevel(plan[nutrient.key]);
              return (
                <View
                  key={plan.month}
                  style={[
                    timelineStyles.nutrientCell,
                    { width: cellWidth, backgroundColor: nutrient.barBg[level] },
                  ]}
                  accessibilityLabel={`${plan.month}月 ${nutrient.label}: ${NUTRIENT_LEVEL_LABEL[level]}`}
                />
              );
            })}
          </View>
        </View>
      ))}

      {/* 月ラベル */}
      <View style={timelineStyles.row}>
        <View style={{ width: labelWidth + spacing2 }} />
        <View style={timelineStyles.barRow}>
          {sortedPlans.map((plan) => (
            <View key={plan.month} style={[timelineStyles.monthLabelCell, { width: cellWidth }]}>
              <Text style={timelineStyles.monthLabelText}>{plan.month}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 凡例 */}
      <View style={timelineStyles.legend}>
        <Text style={timelineStyles.legendTitle}>施肥量:</Text>
        {(Object.entries(ACTION_LABEL) as [FertilizerAction, string][]).map(([action, label]) => (
          <View key={action} style={timelineStyles.legendItem}>
            <View style={[timelineStyles.legendSwatch, { backgroundColor: ACTION_BAR_BG[action] }]} />
            <Text style={timelineStyles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={timelineStyles.legend}>
        <Text style={timelineStyles.legendTitle}>栄養素:</Text>
        {[
          { label: 'N', color: colorSuccess },
          { label: 'P', color: colorNutrientPhosphorusHighBg },
          { label: 'K', color: colorInfo },
        ].map((n) => (
          <View key={n.label} style={timelineStyles.legendItem}>
            <View style={[timelineStyles.legendBarSwatch, { backgroundColor: n.color }]} />
            <Text style={timelineStyles.legendText}>{n.label}</Text>
          </View>
        ))}
        <Text style={timelineStyles.legendNote}>（濃=多め / 淡=控えめ）</Text>
      </View>
    </View>
  );
});

const timelineStyles = StyleSheet.create({
  seasonHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  seasonCell: {
    alignItems: 'center',
  },
  seasonText: {
    ...textXs,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  barRow: {
    flexDirection: 'row',
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  actionCell: {
    height: 28,
  },
  nutrientLabel: {
    ...textXs,
    color: colorTextTertiary,
    width: 16,
    textAlign: 'right',
  },
  nutrientCell: {
    height: 8,
  },
  monthLabelCell: {
    alignItems: 'center',
  },
  monthLabelText: {
    fontSize: 8,
    lineHeight: 12,
    color: colorTextTertiary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
    marginTop: spacing2,
    alignItems: 'center',
  },
  legendTitle: {
    ...textXs,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendBarSwatch: {
    width: 10,
    height: 6,
    borderRadius: 1,
  },
  legendText: {
    ...textXs,
    color: colorTextSecondary,
  },
  legendNote: {
    ...textXs,
    color: colorTextTertiary,
  },
});

// ---------------------------------------------------------------------------
// NutrientLevelBadge — NPK 列のセル表示
// ---------------------------------------------------------------------------

type NutrientLevelBadgeProps = {
  level: string | null;
  nutrient: 'N' | 'P' | 'K';
};

const NutrientLevelBadge = memo(function NutrientLevelBadge({
  level,
  nutrient,
}: NutrientLevelBadgeProps) {
  const nl = toNutrientLevel(level);
  const bgMap: Record<'N' | 'P' | 'K', Record<NutrientLevel, string>> = {
    N: N_BAR_BG,
    P: P_BAR_BG,
    K: K_BAR_BG,
  };
  const bg = bgMap[nutrient][nl];
  const label = nl === 'none' ? '—' : NUTRIENT_LEVEL_LABEL[nl];

  return (
    <View style={[badgeStyles.container, { backgroundColor: bg }]} accessibilityLabel={`${nutrient}: ${label}`}>
      <Text style={badgeStyles.text}>{label}</Text>
    </View>
  );
});

const badgeStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radiusSm,
    minWidth: 36,
    alignItems: 'center',
  },
  text: {
    fontSize: 9,
    lineHeight: 13,
    color: colorTextPrimary,
  },
});

// ---------------------------------------------------------------------------
// MonthlyScheduleGrid
// ---------------------------------------------------------------------------

type MonthlyScheduleGridProps = {
  months: FertilizationMonth[];
  onMonthPress: (month: FertilizationMonth) => void;
  selectedMonth: number | null;
};

function getSeasonBg(month: number): string {
  if (month >= 3 && month <= 5) return colorCategoryGreenPaleBg;
  if (month >= 6 && month <= 8) return colorSeasonSummerBg;
  if (month >= 9 && month <= 11) return colorCategoryAmberPaleBg;
  return colorSeasonWinterBg;
}

function getSeasonHeaderLabel(month: number): string | null {
  switch (month) {
    case 3: return '春（3-5月）';
    case 6: return '夏（6-8月）';
    case 9: return '秋（9-11月）';
    case 12: return '冬（12-2月）';
    default: return null;
  }
}

const MonthlyScheduleGrid = memo(function MonthlyScheduleGrid({
  months,
  onMonthPress,
  selectedMonth,
}: MonthlyScheduleGridProps) {
  const sortedMonths = [...months].sort((a, b) => a.month - b.month);

  return (
    <View accessibilityLabel="月別施肥スケジュール">
      {/* テーブルヘッダー */}
      <View style={gridStyles.tableHeader}>
        <Text style={[gridStyles.headerCell, gridStyles.colMonth]}>月</Text>
        <Text style={[gridStyles.headerCell, gridStyles.colAction]}>施肥</Text>
        <Text style={[gridStyles.headerCell, gridStyles.colNPK]}>N</Text>
        <Text style={[gridStyles.headerCell, gridStyles.colNPK]}>P</Text>
        <Text style={[gridStyles.headerCell, gridStyles.colNPK]}>K</Text>
        <Text style={[gridStyles.headerCell, gridStyles.colNote]}>ポイント</Text>
      </View>

      {/* テーブル行 */}
      {sortedMonths.map((m) => {
        const action = toFertilizerAction(m.action);
        const seasonLabel = getSeasonHeaderLabel(m.month);
        const seasonBg = getSeasonBg(m.month);
        const isSelected = selectedMonth === m.month;

        return (
          <React.Fragment key={m.month}>
            {seasonLabel !== null && (
              <View style={gridStyles.seasonSeparator}>
                <Text style={gridStyles.seasonSeparatorText}>{seasonLabel}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => onMonthPress(m)}
              style={[
                gridStyles.tableRow,
                { backgroundColor: seasonBg },
                isSelected && gridStyles.tableRowSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${m.month}月: 施肥${action !== 'none' ? 'あり' : 'なし'}（${ACTION_LABEL[action]}）`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[gridStyles.cell, gridStyles.colMonth, gridStyles.monthText]}>
                {m.month}月
              </Text>
              <View style={[gridStyles.colAction]}>
                <View style={[gridStyles.actionBadge, { backgroundColor: ACTION_BADGE_BG[action] }]}>
                  <Text style={[gridStyles.actionBadgeText, { color: ACTION_BADGE_TEXT[action] }]}>
                    {ACTION_LABEL[action]}
                  </Text>
                </View>
              </View>
              <View style={gridStyles.colNPK}>
                <NutrientLevelBadge level={m.nitrogenLevel} nutrient="N" />
              </View>
              <View style={gridStyles.colNPK}>
                <NutrientLevelBadge level={m.phosphorusLevel} nutrient="P" />
              </View>
              <View style={gridStyles.colNPK}>
                <NutrientLevelBadge level={m.potassiumLevel} nutrient="K" />
              </View>
              <View style={gridStyles.colNote}>
                {m.description !== null && (
                  <Text style={gridStyles.noteText} numberOfLines={2}>
                    {m.description}
                  </Text>
                )}
                {m.cautionNote !== null && (
                  <View style={gridStyles.cautionRow} accessibilityLabel={`注意: ${m.cautionNote}`}>
                    <Text style={gridStyles.cautionIcon}>⚠</Text>
                    <Text style={gridStyles.cautionText} numberOfLines={2}>
                      {m.cautionNote}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
});

const gridStyles = StyleSheet.create({
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colorSurfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    borderTopLeftRadius: radiusSm,
    borderTopRightRadius: radiusSm,
    paddingVertical: spacing2,
    paddingHorizontal: spacing2,
  },
  headerCell: {
    ...textXs,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingVertical: spacing2,
    paddingHorizontal: spacing2,
    alignItems: 'center',
    minHeight: 44,
  },
  tableRowSelected: {
    borderLeftWidth: 3,
    borderLeftColor: colorActionPrimary,
  },
  cell: {
    ...textXs,
    color: colorTextPrimary,
  },
  colMonth: {
    width: 28,
  },
  colAction: {
    width: 44,
    alignItems: 'flex-start',
  },
  colNPK: {
    width: 42,
    alignItems: 'center',
  },
  colNote: {
    flex: 1,
    paddingLeft: spacing2,
  },
  monthText: {
    fontWeight: '700',
  },
  actionBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radiusSm,
  },
  actionBadgeText: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },
  noteText: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
  cautionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 3,
    marginTop: 3,
  },
  cautionIcon: {
    ...textXs,
    color: colorWarning,
  },
  cautionText: {
    ...textXs,
    color: colorWarning,
    lineHeight: 16,
    flex: 1,
  },
  seasonSeparator: {
    backgroundColor: colorSurfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingVertical: spacing2,
    paddingHorizontal: spacing2,
  },
  seasonSeparatorText: {
    ...textXs,
    color: colorTextTertiary,
    fontWeight: '600',
  },
});

// ---------------------------------------------------------------------------
// 月詳細パネル
// ---------------------------------------------------------------------------

type MonthDetailPanelProps = {
  monthData: FertilizationMonth;
};

const MonthDetailPanel = memo(function MonthDetailPanel({ monthData }: MonthDetailPanelProps) {
  const action = toFertilizerAction(monthData.action);
  return (
    <View style={detailStyles.container} accessibilityRole="text">
      <Text style={detailStyles.title} accessibilityRole="header">
        {monthData.month}月の詳細
      </Text>
      <View style={detailStyles.actionRow}>
        <Text style={detailStyles.label}>施肥量</Text>
        <View style={[detailStyles.badge, { backgroundColor: ACTION_BADGE_BG[action] }]}>
          <Text style={[detailStyles.badgeText, { color: ACTION_BADGE_TEXT[action] }]}>
            {ACTION_LABEL[action]}
          </Text>
        </View>
      </View>
      {monthData.recommendedType !== null && (
        <Text style={detailStyles.item}>推奨肥料: {monthData.recommendedType}</Text>
      )}
      {monthData.description !== null && (
        <Text style={detailStyles.item}>{monthData.description}</Text>
      )}
      {monthData.cautionNote !== null && (
        <View style={detailStyles.cautionRow} accessibilityLabel={`注意: ${monthData.cautionNote}`}>
          <Text style={detailStyles.cautionIcon}>⚠</Text>
          <Text style={detailStyles.cautionText}>{monthData.cautionNote}</Text>
        </View>
      )}
    </View>
  );
});

const detailStyles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing4,
    gap: spacing2,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
  },
  label: {
    ...textSm,
    color: colorTextSecondary,
  },
  badge: {
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusSm,
  },
  badgeText: {
    ...textXs,
    fontWeight: '500',
  },
  item: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
  },
  cautionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing2,
  },
  cautionIcon: {
    ...textBase,
    color: colorWarning,
  },
  cautionText: {
    ...textBase,
    color: colorWarning,
    lineHeight: 22,
    flex: 1,
  },
});

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
  const fallbackName =
    typeof rawName === 'string' && rawName.length > 0 ? rawName : slug;

  const { data, isLoading, isError, refetch } = useFertilizationScheduleQuery(slug ?? '');
  // サーバー応答の treeSpeciesName が権威ある表記。取得前はルートパラメータか slug をフォールバックとする。
  const treeSpeciesName = data?.treeSpeciesName ?? fallbackName;

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const handleMonthPress = useCallback((month: FertilizationMonth) => {
    setSelectedMonth((prev) => (prev === month.month ? null : month.month));
  }, []);

  const selectedMonthData =
    selectedMonth !== null
      ? data?.months.find((m) => m.month === selectedMonth)
      : undefined;

  const categoryBadge = data !== undefined ? getTreeBadge(data.category) : null;

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
          {/* 見出し：樹種名 + カテゴリバッジ + 英名副題 */}
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.treeName} accessibilityRole="header">
                {treeSpeciesName}
              </Text>
              {categoryBadge !== null && (
                <View style={[styles.categoryBadge, { backgroundColor: categoryBadge.bg }]}>
                  <Text style={[styles.categoryBadgeText, { color: categoryBadge.text }]}>
                    {categoryBadge.label}
                  </Text>
                </View>
              )}
            </View>
            {data.nameEn !== null && (
              <Text style={styles.nameEn}>{data.nameEn}</Text>
            )}
          </View>

          {/* 概要 */}
          {data.description !== null && (
            <View style={styles.textSection}>
              <Text style={styles.textSectionTitle} accessibilityRole="header">
                概要
              </Text>
              <Text style={styles.textSectionBody}>{data.description}</Text>
            </View>
          )}

          {/* 施肥方針 */}
          {data.fertilizingPolicy !== null && (
            <View style={styles.textSection}>
              <Text style={styles.textSectionTitle} accessibilityRole="header">
                施肥方針
              </Text>
              <Text style={styles.textSectionBody}>{data.fertilizingPolicy}</Text>
            </View>
          )}

          {/* 代表的な樹種 */}
          {data.examples !== null && (
            <View style={styles.textSection}>
              <Text style={styles.textSectionTitle} accessibilityRole="header">
                代表的な樹種
              </Text>
              <Text style={styles.textSectionBody}>{data.examples}</Text>
            </View>
          )}

          {/* 季節サマリー */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              季節ごとの施肥傾向
            </Text>
            <SeasonSummaryGrid months={data.months} />
          </View>

          {/* 年間施肥タイムライン */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              年間施肥タイムライン
            </Text>
            <View style={styles.timelineCard}>
              <FertilizationTimeline months={data.months} />
            </View>
          </View>

          {/* 月別施肥カレンダー */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              月別施肥カレンダー
            </Text>
            <View style={styles.calendarCard}>
              {/* 凡例 */}
              <View style={styles.calendarLegend}>
                <Text style={styles.calendarLegendTitle}>凡例:</Text>
                {[
                  { color: colorSuccessBg, label: 'たっぷり' },
                  { color: colorInfoBg, label: '通常' },
                  { color: colorWarningBg, label: '控えめ' },
                  { color: colorSurfaceMuted, label: '不要' },
                ].map((item) => (
                  <View key={item.label} style={styles.calendarLegendItem}>
                    <View style={[styles.calendarLegendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.calendarLegendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <MonthlyScheduleGrid
                months={data.months}
                onMonthPress={handleMonthPress}
                selectedMonth={selectedMonth}
              />
            </View>
          </View>

          {/* 選択月の詳細 */}
          {selectedMonthData !== undefined && (
            <View style={styles.section}>
              <MonthDetailPanel monthData={selectedMonthData} />
            </View>
          )}

          <FertilizerDisclaimer />
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
    gap: spacing6,
  },
  section: {
    gap: spacing3,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  headerBlock: {
    gap: spacing2,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing2,
  },
  treeName: {
    ...textXl,
    color: colorTextPrimary,
  },
  categoryBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    ...textXs,
    fontWeight: '600',
  },
  nameEn: {
    ...textSm,
    color: colorTextSecondary,
  },
  textSection: {
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusMd,
    padding: spacing4,
    backgroundColor: colorSurface,
    gap: spacing2,
  },
  textSectionTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  textSectionBody: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  timelineCard: {
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusMd,
    padding: spacing4,
    backgroundColor: colorSurface,
  },
  calendarCard: {
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusMd,
    overflow: 'hidden',
    backgroundColor: colorBackground,
  },
  calendarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
    padding: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    alignItems: 'center',
  },
  calendarLegendTitle: {
    ...textXs,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  calendarLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  calendarLegendText: {
    ...textXs,
    color: colorTextSecondary,
  },
});
