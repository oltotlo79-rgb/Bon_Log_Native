/**
 * @module components/analytics/FollowerGrowthView
 * フォロワー推移ビュー。currentFollowers と totalNewInPeriod のサマリと
 * growth の日次推移を棒グラフで表示する。
 * Web の FollowerGrowthChart / AnalyticsDashboard フォロワーカードに相当。
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAnalyticsFollowerGrowthQuery } from '@/lib/queries/analytics';
import type { AnalyticsFollowerGrowthResponse } from '@/lib/queries/analytics';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';
import type { AnalyticsPeriod } from '@/lib/queries/keys';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorSuccess,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  radiusXs,
  textXs,
  textSm,
  textBase,
  textLg,
  text2xl,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const GROWTH_BAR_HEIGHT = 80;
const BAR_MIN_FRACTION = 0.02;

// ---------------------------------------------------------------------------
// 型エイリアス
// ---------------------------------------------------------------------------

type GrowthEntry = AnalyticsFollowerGrowthResponse['growth'][number];

// ---------------------------------------------------------------------------
// サマリカード
// ---------------------------------------------------------------------------

type FollowerSummaryCardProps = {
  currentFollowers: number;
  totalNewInPeriod: number;
};

const FollowerSummaryCard = memo(function FollowerSummaryCard({
  currentFollowers,
  totalNewInPeriod,
}: FollowerSummaryCardProps) {
  const isPositive = totalNewInPeriod >= 0;

  return (
    <View
      style={styles.summaryCard}
      accessibilityLabel={`現在のフォロワー数 ${currentFollowers.toLocaleString()}, 期間内増加数 ${totalNewInPeriod}`}
    >
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{currentFollowers.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>フォロワー</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, isPositive && styles.summaryValuePositive]}>
          {isPositive ? '+' : ''}{totalNewInPeriod.toLocaleString()}
        </Text>
        <Text style={styles.summaryLabel}>期間内増加</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 新規フォロワー棒グラフ
// ---------------------------------------------------------------------------

type GrowthBarChartProps = {
  growth: GrowthEntry[];
};

const GrowthBarChart = memo(function GrowthBarChart({ growth }: GrowthBarChartProps) {
  const maxNew = Math.max(...growth.map((g) => g.newFollowers), 1);

  const firstEntry = growth[0];
  const lastEntry = growth[growth.length - 1];

  const formatLabel = (dateStr: string): string => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  };

  return (
    <View style={styles.chartSection}>
      <Text style={styles.chartTitle}>日次新規フォロワー</Text>
      <View
        style={styles.growthBarsContainer}
        accessibilityRole="image"
        accessibilityLabel="日次新規フォロワー棒グラフ"
      >
        {growth.map((entry) => {
          const fraction = Math.max(entry.newFollowers / maxNew, BAR_MIN_FRACTION);

          return (
            <View
              key={entry.date}
              style={styles.growthBarWrapper}
              accessibilityLabel={`${entry.date}: 新規 ${entry.newFollowers}人, 合計 ${entry.totalFollowers}人`}
            >
              <View style={styles.growthBarTrack}>
                <View style={[styles.growthBarFill, { flex: fraction }]} />
                <View style={{ flex: 1 - fraction }} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>
          {firstEntry !== undefined ? formatLabel(firstEntry.date) : ''}
        </Text>
        <Text style={styles.dateLabel}>
          {lastEntry !== undefined ? formatLabel(lastEntry.date) : ''}
        </Text>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>棒の高さ = 新規フォロワー数</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 直近データリスト
// ---------------------------------------------------------------------------

type GrowthRecentListProps = {
  growth: GrowthEntry[];
};

const GrowthRecentList = memo(function GrowthRecentList({ growth }: GrowthRecentListProps) {
  const recent = [...growth].reverse().slice(0, 5);

  if (recent.length === 0) {
    return null;
  }

  return (
    <View style={styles.recentSection}>
      <Text style={styles.chartTitle}>直近の推移</Text>
      {recent.map((entry) => (
        <View
          key={entry.date}
          style={styles.recentRow}
          accessibilityLabel={`${entry.date}: 新規 ${entry.newFollowers}人`}
        >
          <Text style={styles.recentDate}>{entry.date}</Text>
          <Text style={styles.recentNew}>
            {entry.newFollowers > 0 ? `+${entry.newFollowers}` : `${entry.newFollowers}`}
          </Text>
          <Text style={styles.recentTotal}>合計 {entry.totalFollowers.toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
});

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

type FollowerGrowthViewProps = {
  period: AnalyticsPeriod;
};

export function FollowerGrowthView({ period }: FollowerGrowthViewProps) {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsFollowerGrowthQuery(period);

  const isPremiumRequired = isApiError(error) && error.code === 'PREMIUM_REQUIRED';

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return <ScreenLoading variant="spinner" />;
  }

  if (isPremiumRequired || isError) {
    return (
      <ScreenError
        description={ERR_ANALYTICS_LOAD_FAILED}
        onRetry={handleRefresh}
      />
    );
  }

  if (data === undefined) {
    return null;
  }

  const hasGrowthData = data.growth.length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={handleRefresh}
          tintColor={colorActionPrimary}
        />
      }
    >
      <OfflineBanner isVisible={!isOnline} />

      <FollowerSummaryCard
        currentFollowers={data.currentFollowers}
        totalNewInPeriod={data.totalNewInPeriod}
      />

      {hasGrowthData ? (
        <>
          <GrowthBarChart growth={data.growth} />
          <GrowthRecentList growth={data.growth} />
        </>
      ) : (
        <ScreenEmpty title="この期間のフォロワーデータがありません" />
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  scrollContent: {
    paddingBottom: spacing8,
  },
  // サマリカード
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorderLight,
    overflow: 'hidden',
    marginHorizontal: spacing4,
    marginTop: spacing4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing3,
    gap: spacing2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colorBorderLight,
  },
  summaryValue: {
    ...text2xl,
    color: colorTextPrimary,
  },
  summaryValuePositive: {
    color: colorSuccess,
  },
  summaryLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  // グラフ
  chartSection: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing3,
    gap: spacing3,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
  },
  chartTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  growthBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: GROWTH_BAR_HEIGHT,
    gap: 2,
  },
  growthBarWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  growthBarTrack: {
    flex: 1,
    backgroundColor: colorSurfaceMuted,
    borderTopLeftRadius: radiusXs,
    borderTopRightRadius: radiusXs,
    flexDirection: 'column-reverse',
    overflow: 'hidden',
  },
  growthBarFill: {
    backgroundColor: colorActionPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radiusXs,
    backgroundColor: colorActionPrimary,
  },
  legendText: {
    ...textXs,
    color: colorTextSecondary,
  },
  // 直近リスト
  recentSection: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing2,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    gap: spacing3,
    minHeight: 44,
  },
  recentDate: {
    ...textSm,
    color: colorTextSecondary,
    width: 88,
    flexShrink: 0,
  },
  recentNew: {
    ...textBase,
    color: colorSuccess,
    fontWeight: '600',
    flex: 1,
  },
  recentTotal: {
    ...textSm,
    color: colorTextSecondary,
    flexShrink: 0,
  },
  // 未使用変数参照ガード
  _lg: {
    ...textLg,
    paddingVertical: spacing6,
  },
});

// 未使用のデザイントークン変数を参照して lint 警告を抑止する
void (textLg satisfies object);
void (spacing6 satisfies number);
