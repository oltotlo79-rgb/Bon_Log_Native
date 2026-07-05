/**
 * @module components/analytics/LikesView
 * いいね分析ビュー。totalLikes のサマリ、時間帯別（24h）と曜日別（7d）の棒グラフで
 * peakHour と peakWeekday を強調表示する。Web の BestTimeCard に相当するモバイル版。
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAnalyticsLikesQuery } from '@/lib/queries/analytics';
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
  colorSurfaceKinoko,
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
  textLg,
  text2xl,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const HOUR_BAR_HEIGHT = 48;
const WEEKDAY_BAR_HEIGHT = 64;
const BAR_MIN_FRACTION = 0.04;

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

// ---------------------------------------------------------------------------
// いいねサマリカード
// ---------------------------------------------------------------------------

type LikesSummaryCardProps = {
  totalLikes: number;
  peakHour: number;
  peakWeekday: number;
  hourlyData: number[];
  weekdayData: number[];
};

const LikesSummaryCard = memo(function LikesSummaryCard({
  totalLikes,
  peakHour,
  peakWeekday,
  hourlyData,
  weekdayData,
}: LikesSummaryCardProps) {
  const totalByHour = hourlyData.reduce((a, b) => a + b, 0);
  const peakRangeStart = (peakHour - 1 + 24) % 24;
  const peakRangeEnd = (peakHour + 1) % 24;
  const peakRangeLikes =
    (hourlyData[peakRangeStart] ?? 0) +
    (hourlyData[peakHour] ?? 0) +
    (hourlyData[peakRangeEnd] ?? 0);
  const peakRangePercent =
    totalByHour > 0 ? Math.round((peakRangeLikes / totalByHour) * 100) : 0;
  const peakWeekdayLikes = weekdayData[peakWeekday] ?? 0;
  const peakWeekdayPercent =
    totalByHour > 0 ? Math.round((peakWeekdayLikes / totalByHour) * 100) : 0;

  return (
    <View style={styles.summarySection}>
      <View
        style={styles.totalCard}
        accessibilityLabel={`総いいね数 ${totalLikes.toLocaleString()}`}
      >
        <Text style={styles.totalValue}>{totalLikes.toLocaleString()}</Text>
        <Text style={styles.totalLabel}>総いいね数</Text>
      </View>

      <View style={styles.peakRow}>
        <View
          style={styles.peakCard}
          accessibilityLabel={`ベスト時間帯 ${peakHour}時〜${(peakHour + 1) % 24}時 全体の${peakRangePercent}%`}
        >
          <Text style={styles.peakTitle}>ベスト投稿時間</Text>
          <Text style={styles.peakValue}>
            {peakHour}:00 – {(peakHour + 1) % 24}:00
          </Text>
          <Text style={styles.peakSub}>
            {peakRangeStart}時〜{(peakRangeEnd + 1) % 24}時に全体の{peakRangePercent}%
          </Text>
        </View>

        <View
          style={styles.peakCard}
          accessibilityLabel={`ベスト曜日 ${WEEKDAY_LABELS[peakWeekday] ?? ''}曜日 全体の${peakWeekdayPercent}%`}
        >
          <Text style={styles.peakTitle}>ベスト曜日</Text>
          <Text style={styles.peakValue}>
            {WEEKDAY_LABELS[peakWeekday] ?? ''}曜日
          </Text>
          <Text style={styles.peakSub}>
            {peakWeekdayLikes.toLocaleString()}いいね（{peakWeekdayPercent}%）
          </Text>
        </View>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 時間帯棒グラフ（24 本）
// ---------------------------------------------------------------------------

type HourlyBarChartProps = {
  hourlyData: number[];
  peakHour: number;
};

const HourlyBarChart = memo(function HourlyBarChart({
  hourlyData,
  peakHour,
}: HourlyBarChartProps) {
  const maxValue = Math.max(...hourlyData, 1);

  return (
    <View style={styles.chartSection}>
      <Text style={styles.chartTitle}>時間帯別いいね（0〜23時）</Text>
      <View
        style={styles.hourlyBarsContainer}
        accessibilityRole="image"
        accessibilityLabel="時間帯別いいね棒グラフ"
      >
        {hourlyData.map((count, hour) => {
          const fraction = Math.max(count / maxValue, BAR_MIN_FRACTION);
          const isPeak = hour === peakHour;

          return (
            <View
              key={hour}
              style={styles.hourlyBarWrapper}
              accessibilityLabel={`${hour}時: ${count}いいね${isPeak ? '（ピーク）' : ''}`}
            >
              <View style={[styles.hourlyBarTrack]}>
                <View
                  style={[
                    styles.hourlyBarFill,
                    { flex: fraction },
                    isPeak && styles.hourlyBarFillPeak,
                  ]}
                />
                <View style={{ flex: 1 - fraction }} />
              </View>
              {/* 6時間おきにラベルを表示 */}
              {hour % 6 === 0 && (
                <Text style={styles.hourLabel}>{hour}</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>ピーク時間帯</Text>
        <View style={[styles.legendDot, styles.legendDotNormal]} />
        <Text style={styles.legendText}>その他</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 曜日棒グラフ（7本）
// ---------------------------------------------------------------------------

type WeekdayBarChartProps = {
  weekdayData: number[];
  peakWeekday: number;
};

const WeekdayBarChart = memo(function WeekdayBarChart({
  weekdayData,
  peakWeekday,
}: WeekdayBarChartProps) {
  const maxValue = Math.max(...weekdayData, 1);

  return (
    <View style={styles.chartSection}>
      <Text style={styles.chartTitle}>曜日別いいね</Text>
      <View
        style={styles.weekdayBarsContainer}
        accessibilityRole="image"
        accessibilityLabel="曜日別いいね棒グラフ"
      >
        {weekdayData.map((count, dayIndex) => {
          const fraction = Math.max(count / maxValue, BAR_MIN_FRACTION);
          const isPeak = dayIndex === peakWeekday;
          const dayLabel = WEEKDAY_LABELS[dayIndex] ?? '';

          return (
            <View
              key={dayIndex}
              style={styles.weekdayBarWrapper}
              accessibilityLabel={`${dayLabel}曜日: ${count}いいね${isPeak ? '（ピーク）' : ''}`}
            >
              <View style={styles.weekdayBarTrack}>
                <View
                  style={[
                    styles.weekdayBarFill,
                    { flex: fraction },
                    isPeak && styles.weekdayBarFillPeak,
                  ]}
                />
                <View style={{ flex: 1 - fraction }} />
              </View>
              <Text
                style={[
                  styles.weekdayLabel,
                  isPeak && styles.weekdayLabelPeak,
                ]}
              >
                {dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

type LikesViewProps = {
  period: AnalyticsPeriod;
};

export function LikesView({ period }: LikesViewProps) {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsLikesQuery(period);

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

  const hasData = data.totalLikes > 0;

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
        <>
          <LikesSummaryCard
            totalLikes={data.totalLikes}
            peakHour={data.peakHour}
            peakWeekday={data.peakWeekday}
            hourlyData={data.hourlyData}
            weekdayData={data.weekdayData}
          />
          <HourlyBarChart
            hourlyData={data.hourlyData}
            peakHour={data.peakHour}
          />
          <WeekdayBarChart
            weekdayData={data.weekdayData}
            peakWeekday={data.peakWeekday}
          />
        </>
      ) : (
        <ScreenEmpty title="この期間のいいねデータがありません" />
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
  // サマリ
  summarySection: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing3,
    gap: spacing3,
  },
  totalCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorderLight,
    paddingVertical: spacing3,
    alignItems: 'center',
    gap: spacing2,
  },
  totalValue: {
    ...text2xl,
    color: colorTextPrimary,
  },
  totalLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  peakRow: {
    flexDirection: 'row',
    gap: spacing3,
  },
  peakCard: {
    flex: 1,
    backgroundColor: colorSurfaceKinoko,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorderLight,
    padding: spacing3,
    gap: spacing2,
  },
  peakTitle: {
    ...textXs,
    color: colorTextSecondary,
  },
  peakValue: {
    ...textLg,
    color: colorTextPrimary,
  },
  peakSub: {
    ...textXs,
    color: colorTextSecondary,
  },
  // グラフ共通
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
  legendDotNormal: {
    opacity: 0.35,
    marginLeft: spacing3,
  },
  legendText: {
    ...textXs,
    color: colorTextSecondary,
  },
  // 時間帯グラフ（横並び24本・縦方向の棒）
  hourlyBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: HOUR_BAR_HEIGHT + spacing6,
    gap: 2,
  },
  hourlyBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    height: '100%',
  },
  hourlyBarTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: colorSurfaceMuted,
    borderTopLeftRadius: radiusXs,
    borderTopRightRadius: radiusXs,
    flexDirection: 'column-reverse',
    overflow: 'hidden',
  },
  hourlyBarFill: {
    backgroundColor: colorActionPrimary,
    opacity: 0.35,
  },
  hourlyBarFillPeak: {
    opacity: 1,
  },
  hourLabel: {
    ...textXs,
    color: colorTextSecondary,
    fontSize: 8,
  },
  // 曜日グラフ（横並び7本・縦方向の棒）
  weekdayBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: WEEKDAY_BAR_HEIGHT + spacing6,
    gap: spacing2,
  },
  weekdayBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing2,
    height: '100%',
  },
  weekdayBarTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: colorSurfaceMuted,
    borderTopLeftRadius: radiusXs,
    borderTopRightRadius: radiusXs,
    flexDirection: 'column-reverse',
    overflow: 'hidden',
  },
  weekdayBarFill: {
    backgroundColor: colorActionPrimary,
    opacity: 0.35,
  },
  weekdayBarFillPeak: {
    opacity: 1,
  },
  weekdayLabel: {
    ...textSm,
    color: colorTextSecondary,
  },
  weekdayLabelPeak: {
    color: colorTextPrimary,
    fontWeight: '600',
  },
});
