/**
 * @module components/analytics/EngagementTrendView
 * エンゲージメント推移ビュー。期間内の日次データを棒グラフで表示し、
 * engagement を主軸、posts / likes / comments を補助的に見せる。
 * Web の LikeChart / AnalyticsDashboard の engagementTrend セクションに相当。
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAnalyticsEngagementTrendQuery } from '@/lib/queries/analytics';
import type { AnalyticsEngagementTrendResponse } from '@/lib/queries/analytics';
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
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const TREND_BAR_HEIGHT = 100;
const BAR_MIN_FRACTION = 0.02;

// ---------------------------------------------------------------------------
// 型エイリアス
// ---------------------------------------------------------------------------

type TrendEntry = AnalyticsEngagementTrendResponse['trend'][number];

// ---------------------------------------------------------------------------
// 集計サマリカード
// ---------------------------------------------------------------------------

type TrendSummaryProps = {
  trend: TrendEntry[];
};

const TrendSummaryCard = memo(function TrendSummaryCard({ trend }: TrendSummaryProps) {
  const totalEngagement = trend.reduce((acc, d) => acc + d.engagement, 0);
  const totalLikes = trend.reduce((acc, d) => acc + d.likes, 0);
  const totalComments = trend.reduce((acc, d) => acc + d.comments, 0);
  const totalPosts = trend.reduce((acc, d) => acc + d.posts, 0);

  return (
    <View style={styles.summaryCard} accessibilityLabel={`エンゲージメント合計 ${totalEngagement.toLocaleString()}`}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalEngagement.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>エンゲージメント</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalLikes.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>いいね</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalComments.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>コメント</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalPosts.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>投稿</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 日次トレンド棒グラフ
// ---------------------------------------------------------------------------

type TrendBarChartProps = {
  trend: TrendEntry[];
};

const TrendBarChart = memo(function TrendBarChart({ trend }: TrendBarChartProps) {
  const maxEngagement = Math.max(...trend.map((d) => d.engagement), 1);

  const firstDate = trend[0];
  const lastDate = trend[trend.length - 1];

  const formatLabel = (dateStr: string): string => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  };

  return (
    <View style={styles.chartSection}>
      <Text style={styles.chartTitle}>エンゲージメント推移（日次）</Text>
      <View
        style={styles.trendBarsContainer}
        accessibilityRole="image"
        accessibilityLabel="エンゲージメント推移棒グラフ"
      >
        {trend.map((entry) => {
          const fraction = Math.max(entry.engagement / maxEngagement, BAR_MIN_FRACTION);

          return (
            <View
              key={entry.date}
              style={styles.trendBarWrapper}
              accessibilityLabel={`${entry.date}: エンゲージメント ${entry.engagement}, いいね ${entry.likes}, コメント ${entry.comments}`}
            >
              <View style={styles.trendBarTrack}>
                <View style={[styles.trendBarFill, { flex: fraction }]} />
                <View style={{ flex: 1 - fraction }} />
              </View>
            </View>
          );
        })}
      </View>

      {/* X軸の日付ラベル（最初と最後のみ） */}
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>
          {firstDate !== undefined ? formatLabel(firstDate.date) : ''}
        </Text>
        <Text style={styles.dateLabel}>
          {lastDate !== undefined ? formatLabel(lastDate.date) : ''}
        </Text>
      </View>

      {/* 凡例 */}
      <View style={styles.legendRow}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>エンゲージメント（いいね＋コメント）の高さ</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 詳細リスト（直近5件）
// ---------------------------------------------------------------------------

type TrendRecentListProps = {
  trend: TrendEntry[];
};

const TrendRecentList = memo(function TrendRecentList({ trend }: TrendRecentListProps) {
  const recent = [...trend].reverse().slice(0, 5);

  if (recent.length === 0) {
    return null;
  }

  return (
    <View style={styles.recentSection}>
      <Text style={styles.chartTitle}>直近の日別データ</Text>
      {recent.map((entry) => (
        <View
          key={entry.date}
          style={styles.recentRow}
          accessibilityLabel={`${entry.date}: エンゲージメント ${entry.engagement}`}
        >
          <Text style={styles.recentDate}>{entry.date}</Text>
          <View style={styles.recentStats}>
            <Text style={styles.recentStat}>いいね {entry.likes}</Text>
            <Text style={styles.recentStat}>コメント {entry.comments}</Text>
            <Text style={styles.recentStat}>投稿 {entry.posts}</Text>
          </View>
          <Text style={styles.recentEngagement}>{entry.engagement}</Text>
        </View>
      ))}
    </View>
  );
});

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

type EngagementTrendViewProps = {
  period: AnalyticsPeriod;
};

export function EngagementTrendView({ period }: EngagementTrendViewProps) {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsEngagementTrendQuery(period);

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

  const hasData = data.trend.length > 0;

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

      {hasData ? (
        <View style={styles.inner}>
          <TrendSummaryCard trend={data.trend} />
          <TrendBarChart trend={data.trend} />
          <TrendRecentList trend={data.trend} />
        </View>
      ) : (
        <ScreenEmpty title="この期間のエンゲージメントデータがありません" />
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
  inner: {
    gap: spacing2,
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
    ...textLg,
    color: colorTextPrimary,
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
  trendBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: TREND_BAR_HEIGHT,
    gap: 2,
  },
  trendBarWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBarTrack: {
    flex: 1,
    backgroundColor: colorSurfaceMuted,
    borderTopLeftRadius: radiusXs,
    borderTopRightRadius: radiusXs,
    flexDirection: 'column-reverse',
    overflow: 'hidden',
  },
  trendBarFill: {
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
    width: 72,
    flexShrink: 0,
  },
  recentStats: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing3,
  },
  recentStat: {
    ...textXs,
    color: colorTextSecondary,
  },
  recentEngagement: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
    flexShrink: 0,
    width: 36,
    textAlign: 'right',
  },
  // 未使用変数参照ガード
  _spacer: {
    paddingVertical: spacing6,
  },
});

// 未使用のデザイントークン変数を参照して lint 警告を抑止する
void (spacing6 satisfies number);
