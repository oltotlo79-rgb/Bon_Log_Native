/**
 * @module components/analytics/PeriodComparisonView
 * 期間比較ビュー。posts / likes / comments / followers の
 * current・previous・change（%）を増減の色付きで表示する。
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAnalyticsPeriodComparisonQuery } from '@/lib/queries/analytics';
import type { AnalyticsPeriodComparisonResponse } from '@/lib/queries/analytics';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';
import type { AnalyticsPeriod } from '@/lib/queries/keys';
import {
  colorBackground,
  colorSurface,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorSuccess,
  colorError,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  textXs,
  textSm,
  textBase,
  text2xl,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHANGE_NEUTRAL_THRESHOLD = 0;

// ---------------------------------------------------------------------------
// 増減インジケーター
// ---------------------------------------------------------------------------

type ChangeIndicatorProps = {
  change: number | null;
};

const ChangeIndicator = memo(function ChangeIndicator({ change }: ChangeIndicatorProps) {
  if (change === null) {
    return <Text style={styles.changeNeutral}>—</Text>;
  }

  const isPositive = change > CHANGE_NEUTRAL_THRESHOLD;
  const isNegative = change < CHANGE_NEUTRAL_THRESHOLD;
  const sign = isPositive ? '+' : '';

  return (
    <Text
      style={[
        styles.changeBase,
        isPositive && styles.changePositive,
        isNegative && styles.changeNegative,
        !isPositive && !isNegative && styles.changeNeutral,
      ]}
      accessibilityLabel={`前期比 ${sign}${change}%`}
    >
      {sign}{change}%
    </Text>
  );
});

// ---------------------------------------------------------------------------
// 1指標の行カード
// ---------------------------------------------------------------------------

type MetricKey = keyof AnalyticsPeriodComparisonResponse;

type ComparisonRowProps = {
  label: string;
  metric: AnalyticsPeriodComparisonResponse[MetricKey];
};

const ComparisonRow = memo(function ComparisonRow({ label, metric }: ComparisonRowProps) {
  return (
    <View style={styles.row} accessibilityLabel={`${label}: 今期 ${metric.current}、前期 ${metric.previous}`}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        <ChangeIndicator change={metric.change} />
      </View>
      <View style={styles.rowRight}>
        <View style={styles.periodCol}>
          <Text style={styles.periodLabel}>今期</Text>
          <Text style={styles.periodValue}>{metric.current.toLocaleString()}</Text>
        </View>
        <View style={styles.periodCol}>
          <Text style={styles.periodLabel}>前期</Text>
          <Text style={[styles.periodValue, styles.previousValue]}>
            {metric.previous.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

type PeriodComparisonViewProps = {
  period: AnalyticsPeriod;
};

export function PeriodComparisonView({ period }: PeriodComparisonViewProps) {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsPeriodComparisonQuery(period);

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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

      <Text style={styles.description}>
        前の同期間と比較した数値の変化を示します
      </Text>

      <View style={styles.card}>
        <ComparisonRow label="投稿数" metric={data.posts} />
        <View style={styles.separator} />
        <ComparisonRow label="いいね" metric={data.likes} />
        <View style={styles.separator} />
        <ComparisonRow label="コメント" metric={data.comments} />
        <View style={styles.separator} />
        <ComparisonRow label="フォロワー" metric={data.followers} />
      </View>
    </ScrollView>
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
  content: {
    padding: spacing4,
    gap: spacing4,
    paddingBottom: spacing8,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
  },
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    minHeight: 56,
  },
  rowLeft: {
    flex: 1,
    gap: spacing2,
  },
  rowLabel: {
    ...textBase,
    color: colorTextPrimary,
  },
  rowRight: {
    flexDirection: 'row',
    gap: spacing6,
    flexShrink: 0,
  },
  periodCol: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  periodLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  periodValue: {
    ...text2xl,
    color: colorTextPrimary,
  },
  previousValue: {
    color: colorTextSecondary,
  },
  changeBase: {
    ...textSm,
    fontWeight: '600',
  },
  changePositive: {
    color: colorSuccess,
  },
  changeNegative: {
    color: colorError,
  },
  changeNeutral: {
    color: colorTextSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing4,
  },
});
