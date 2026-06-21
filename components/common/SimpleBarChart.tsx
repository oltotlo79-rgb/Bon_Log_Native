/**
 * @module components/common/SimpleBarChart
 * View ベースの簡易棒グラフコンポーネント。外部チャートライブラリ不使用。
 * ホルモン季節変動・analytics フォロワー推移・エンゲージメント推移で共用する。
 * 仕様: docs/design/browse-screens.md §7.6
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import {
  colorActionPrimary,
  colorSurfaceMuted,
  colorTextSecondary,
  spacing2,
  spacing4,
  radiusXs,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHART_HEIGHT = 80;
const BAR_MIN_HEIGHT = 2;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type BarData = {
  /** バーのラベル（月名・日付など）*/
  label: string;
  /** バーの値（0 以上）*/
  value: number;
  /** アクセシビリティ用ラベル */
  accessibilityLabel: string;
};

type SimpleBarChartProps = {
  data: BarData[];
  /** グラフ全体のアクセシビリティラベル */
  accessibilityLabel?: string;
  /**
   * バーの色を値に応じた透明度で変化させるか（ホルモン季節変動で使用）。
   * false の場合は全バー同一色。
   */
  useOpacityScale?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SimpleBarChart = memo(function SimpleBarChart({
  data,
  accessibilityLabel = 'バーグラフ',
  useOpacityScale = false,
}: SimpleBarChartProps) {
  const { width } = useWindowDimensions();

  if (data.length === 0) {
    return null;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  // 横パディング分を除いた描画幅
  const chartWidth = width - spacing4 * 2;
  const barWidth = Math.max(chartWidth / data.length - spacing2, 4);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      <View style={styles.barsRow}>
        {data.map((item) => {
          const barHeight = Math.max((item.value / maxValue) * CHART_HEIGHT, BAR_MIN_HEIGHT);
          const opacity = useOpacityScale
            ? Math.max(0.2, item.value / maxValue)
            : 1;

          return (
            <View
              key={item.label}
              style={[styles.barWrapper, { width: barWidth }]}
              accessibilityLabel={item.accessibilityLabel}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    width: barWidth,
                    opacity,
                  },
                ]}
              />
              <Text style={styles.label}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// ホルモン季節変動専用ラッパー（バー高さ固定 60pt）
// ---------------------------------------------------------------------------

const HORMONE_CHART_HEIGHT = 60;

type HormoneSeasonalLevel = {
  month: number;
  level: string;
};

const LEVEL_VALUE: Record<string, number> = {
  high: 10,
  moderate: 6,
  low: 3,
  minimal: 1,
};

type HormoneSeasonalChartProps = {
  seasonalLevels: HormoneSeasonalLevel[];
};

export const HormoneSeasonalChart = memo(function HormoneSeasonalChart({
  seasonalLevels,
}: HormoneSeasonalChartProps) {
  const { width } = useWindowDimensions();

  if (seasonalLevels.length === 0) {
    return null;
  }

  const sortedLevels = [...seasonalLevels].sort((a, b) => a.month - b.month);
  const maxLevel = 10;
  const chartWidth = width - spacing4 * 2;
  const barWidth = Math.max(chartWidth / 12 - spacing2, 4);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="季節的変動グラフ"
      style={styles.container}
    >
      <View style={[styles.barsRow, { height: HORMONE_CHART_HEIGHT + 20 }]}>
        {sortedLevels.map((item) => {
          const levelValue = LEVEL_VALUE[item.level] ?? 0;
          const barHeight = Math.max((levelValue / maxLevel) * HORMONE_CHART_HEIGHT, BAR_MIN_HEIGHT);
          const opacity = Math.max(0.2, levelValue / maxLevel);

          return (
            <View
              key={item.month}
              style={[styles.barWrapper, { width: barWidth }]}
              accessibilityLabel={`${item.month}月: レベル ${item.level}`}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    width: barWidth,
                    opacity,
                  },
                ]}
              />
              <Text style={styles.label}>{item.month}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing2,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 20,
    gap: spacing2,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    height: '100%',
  },
  bar: {
    backgroundColor: colorActionPrimary,
    borderTopLeftRadius: radiusXs,
    borderTopRightRadius: radiusXs,
    minHeight: BAR_MIN_HEIGHT,
  },
  emptyBar: {
    backgroundColor: colorSurfaceMuted,
    borderTopLeftRadius: radiusXs,
    borderTopRightRadius: radiusXs,
    height: BAR_MIN_HEIGHT,
  },
  label: {
    ...textXs,
    color: colorTextSecondary,
    textAlign: 'center',
  },
});
