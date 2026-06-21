/**
 * @module app/analytics/index
 * 投稿分析ダッシュボード（プレミアム会員限定）。
 * 403 PREMIUM_REQUIRED 受信時はプレミアム誘導 UI を表示する。
 * 仕様: docs/design/browse-screens.md §7
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAnalyticsSummaryQuery, type AnalyticsSummaryResponse } from '@/lib/queries/analytics';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { SimpleBarChart } from '@/components/common/SimpleBarChart';
import { ROUTE_SETTINGS_SUBSCRIPTION } from '@/lib/constants/routes';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';
import type { AnalyticsDays } from '@/lib/queries/keys';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  spacing12,
  radiusFull,
  radiusMd,
  radiusXs,
  textXs,
  textSm,
  textBase,
  textLg,
  text2xl,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: { label: string; value: AnalyticsDays }[] = [
  { label: '7日間', value: '7' },
  { label: '30日間', value: '30' },
  { label: '90日間', value: '90' },
];

const DEFAULT_PERIOD: AnalyticsDays = '30';

const LOCK_ICON_SIZE = 48;

// ---------------------------------------------------------------------------
// 期間切替バー
// ---------------------------------------------------------------------------

type PeriodSelectorProps = {
  selected: AnalyticsDays;
  onSelect: (period: AnalyticsDays) => void;
};

const AnalyticsPeriodSelector = memo(function AnalyticsPeriodSelector({
  selected,
  onSelect,
}: PeriodSelectorProps) {
  return (
    <View style={styles.periodBar}>
      {PERIOD_OPTIONS.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.periodButton, isSelected && styles.periodButtonSelected]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${opt.label}を選択`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.periodButtonText, isSelected && styles.periodButtonTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

// ---------------------------------------------------------------------------
// 数値カード（3列）
// ---------------------------------------------------------------------------

type MetricCardProps = {
  value: number;
  label: string;
};

const MetricCard = memo(function MetricCard({ value, label }: MetricCardProps) {
  return (
    <View
      style={styles.metricCard}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.metricValue}>{value.toLocaleString()}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 分析カードコンテナ
// ---------------------------------------------------------------------------

type AnalyticsCardProps = {
  title: string;
  children: React.ReactNode;
};

function AnalyticsCard({ title, children }: AnalyticsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 人気投稿行
// ---------------------------------------------------------------------------

type TopPost = AnalyticsSummaryResponse['posts']['topPosts'][number];

type TopPostRowProps = {
  rank: number;
  post: TopPost;
};

const TopPostRow = memo(function TopPostRow({ rank, post }: TopPostRowProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/posts/[id]', params: { id: post.id } });
  }, [post.id]);

  return (
    <TouchableOpacity
      style={styles.topPostRow}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${rank}位: いいね${post.likeCount}件`}
    >
      <Text style={styles.topPostRank}>{rank}</Text>
      <View style={styles.topPostTextPreview}>
        <Text style={styles.topPostTextContent} numberOfLines={2}>
          {post.content ?? ''}
        </Text>
      </View>
      <View style={styles.topPostMeta}>
        <Text style={styles.topPostStat}>いいね: {post.likeCount}</Text>
        <Text style={styles.topPostStat}>コメント: {post.commentCount}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// バーグラフデータ変換ヘルパー
// ---------------------------------------------------------------------------

type FollowerGrowthItem = AnalyticsSummaryResponse['followers']['growth'][number];
type EngagementItem = AnalyticsSummaryResponse['engagementTrend'][number];

function buildFollowerChartData(growth: FollowerGrowthItem[], period: AnalyticsDays) {
  return growth.map((item) => ({
    label: formatChartLabel(item.date, period),
    value: item.newFollowers,
    accessibilityLabel: `${item.date}: ${item.newFollowers}人`,
  }));
}

function buildEngagementChartData(trend: EngagementItem[], period: AnalyticsDays) {
  return trend.map((item) => ({
    label: formatChartLabel(item.date, period),
    value: item.engagement,
    accessibilityLabel: `${item.date}: エンゲージメント ${item.engagement}`,
  }));
}

function formatChartLabel(dateStr: string, period: AnalyticsDays): string {
  const d = new Date(dateStr);
  if (period === '7') {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  if (period === '30') {
    return `${d.getMonth() + 1}/${d.getDate()}〜`;
  }
  return `${d.getMonth() + 1}月`;
}

// ---------------------------------------------------------------------------
// 非プレミアムゲート
// ---------------------------------------------------------------------------

function AnalyticsPremiumGate() {
  const handlePress = useCallback(() => {
    router.push(ROUTE_SETTINGS_SUBSCRIPTION);
  }, []);

  return (
    <View style={styles.gateContainer}>
      <Ionicons
        name="lock-closed-outline"
        size={LOCK_ICON_SIZE}
        color={colorTextSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.gateTitle}>この機能はプレミアム会員限定です</Text>
      <Text style={styles.gateDescription}>
        投稿のパフォーマンスを詳しく把握して、盆栽コンテンツをより多くの方に届けましょう。
      </Text>
      <Pressable
        style={({ pressed }) => [styles.gateButton, pressed && styles.gateButtonPressed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="プレミアムプランの詳細を見る"
      >
        <Text style={styles.gateButtonText}>プレミアムプランについて</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ダッシュボード（プレミアム時）
// ---------------------------------------------------------------------------

type DashboardProps = {
  data: AnalyticsSummaryResponse;
  period: AnalyticsDays;
};

function AnalyticsDashboard({ data, period }: DashboardProps) {
  const followerChartData = buildFollowerChartData(data.followers.growth, period);
  const engagementChartData = buildEngagementChartData(data.engagementTrend, period);

  return (
    <ScrollView
      contentContainerStyle={styles.dashboardContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 投稿サマリカード */}
      <AnalyticsCard title="投稿">
        <View style={styles.metricsRow}>
          <MetricCard value={data.posts.total} label="投稿数" />
          <MetricCard value={data.posts.totalLikes} label="いいね" />
          <MetricCard value={data.posts.totalComments} label="コメント" />
        </View>
        <Text style={styles.engagementRate}>
          平均エンゲージメント率: {data.posts.avgEngagement}%
        </Text>

        {data.posts.topPosts.length > 0 && (
          <View style={styles.topPostsSection}>
            <Text style={styles.topPostsLabel}>人気投稿トップ 3</Text>
            {data.posts.topPosts.slice(0, 3).map((post, index) => (
              <TopPostRow key={post.id} rank={index + 1} post={post} />
            ))}
          </View>
        )}
      </AnalyticsCard>

      {/* フォロワーカード */}
      <AnalyticsCard title="フォロワー">
        <View style={styles.followerStats}>
          <View>
            <Text style={styles.followerStatLabel}>現在</Text>
            <Text style={styles.followerStatValue}>{data.followers.current.toLocaleString()}人</Text>
          </View>
          <View>
            <Text style={styles.followerStatLabel}>期間内増加</Text>
            <Text style={styles.followerStatValue}>+{data.followers.newInPeriod.toLocaleString()}人</Text>
          </View>
        </View>
        {followerChartData.length > 0 && (
          <>
            <Text style={styles.chartLabel}>フォロワー推移</Text>
            <SimpleBarChart
              data={followerChartData}
              accessibilityLabel={`${period}日間のフォロワー推移グラフ`}
            />
          </>
        )}
      </AnalyticsCard>

      {/* エンゲージメント推移カード */}
      {engagementChartData.length > 0 && (
        <AnalyticsCard title="エンゲージメント推移">
          <SimpleBarChart
            data={engagementChartData}
            accessibilityLabel={`${period}日間のエンゲージメント推移グラフ`}
          />
        </AnalyticsCard>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AnalyticsScreen() {
  const isOnline = useOnlineStatus();
  const [period, setPeriod] = useState<AnalyticsDays>(DEFAULT_PERIOD);

  const { data, isLoading, isError, error, refetch, isFetching } = useAnalyticsSummaryQuery(period);

  const isPremiumRequired = isApiError(error) && error.code === 'PREMIUM_REQUIRED';

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Ionicons name="chevron-back" size={24} color={colorTextPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          投稿分析
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* 非プレミアム時はゲート表示のみ（期間切替バーも不要） */}
      {isPremiumRequired ? (
        <AnalyticsPremiumGate />
      ) : (
        <>
          {/* 期間切替バー — ローディング中も表示（操作可能にしておく） */}
          <AnalyticsPeriodSelector selected={period} onSelect={setPeriod} />

          {isLoading ? (
            <ScreenLoading variant="spinner" />
          ) : isError ? (
            <View style={styles.errorContainer}>
              <ScreenError
                description={ERR_ANALYTICS_LOAD_FAILED}
                onRetry={handleRefresh}
              />
            </View>
          ) : data !== undefined ? (
            <View style={styles.flex}>
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.dashboardOuter}
                refreshControl={
                  <RefreshControl
                    refreshing={isFetching && !isLoading}
                    onRefresh={handleRefresh}
                    tintColor={colorActionPrimary}
                  />
                }
              >
                <AnalyticsDashboard data={data} period={period} />
              </ScrollView>
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing2,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  // 期間切替
  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    gap: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    backgroundColor: colorSurfaceWashi,
  },
  periodButton: {
    flex: 1,
    height: 36,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonSelected: {
    backgroundColor: colorActionPrimary,
  },
  periodButtonText: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  periodButtonTextSelected: {
    color: colorActionPrimaryText,
  },
  // ダッシュボード
  dashboardOuter: {
    flexGrow: 1,
  },
  dashboardContent: {
    padding: spacing4,
    gap: spacing4,
    paddingBottom: spacing8,
  },
  // カード
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    padding: spacing4,
    gap: spacing3,
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  cardTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  // 数値カード（3列）
  metricsRow: {
    flexDirection: 'row',
    gap: spacing2,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colorBackground,
    borderRadius: radiusMd,
    padding: spacing3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  metricValue: {
    ...text2xl,
    color: colorTextPrimary,
  },
  metricLabel: {
    ...textXs,
    color: colorTextSecondary,
    marginTop: 2,
  },
  engagementRate: {
    ...textSm,
    color: colorTextSecondary,
  },
  // 人気投稿
  topPostsSection: {
    gap: spacing2,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing3,
  },
  topPostsLabel: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  topPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    gap: spacing3,
  },
  topPostRank: {
    ...textSm,
    color: colorTextSecondary,
    width: 20,
    textAlign: 'center',
  },
  topPostTextPreview: {
    width: 44,
    height: 44,
    borderRadius: radiusXs,
    backgroundColor: colorSurfaceMuted,
    justifyContent: 'center',
    paddingHorizontal: spacing1,
  },
  topPostTextContent: {
    ...textXs,
    color: colorTextSecondary,
  },
  topPostMeta: {
    flex: 1,
    gap: 4,
  },
  topPostStat: {
    ...textSm,
    color: colorTextSecondary,
  },
  // フォロワー
  followerStats: {
    flexDirection: 'row',
    gap: spacing6,
  },
  followerStatLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  followerStatValue: {
    ...textLg,
    color: colorTextPrimary,
  },
  chartLabel: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  // プレミアムゲート
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing8,
    gap: spacing4,
  },
  gateTitle: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  gateDescription: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  gateButton: {
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    height: 44,
    paddingHorizontal: spacing6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing2,
  },
  gateButtonPressed: {
    opacity: 0.8,
  },
  gateButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  // エラー
  errorContainer: {
    flex: 1,
  },
});

// 未使用警告回避
void (colorTextTertiary satisfies string);
void (spacing12 satisfies number);
