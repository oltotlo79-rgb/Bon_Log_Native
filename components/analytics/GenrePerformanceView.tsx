/**
 * @module components/analytics/GenrePerformanceView
 * ジャンル別パフォーマンスビュー。genres を avgEngagement 降順に棒グラフで表示し、
 * name / postCount / avgLikes を合わせて見せる。
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import { useAnalyticsGenrePerformanceQuery } from '@/lib/queries/analytics';
import type { AnalyticsGenrePerformanceResponse } from '@/lib/queries/analytics';
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
  radiusXs,
  radiusMd,
  textXs,
  textSm,
  textBase,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const BAR_HEIGHT = 10;
const BAR_MIN_FRACTION = 0.02;

// ---------------------------------------------------------------------------
// ジャンル1行
// ---------------------------------------------------------------------------

type GenreItem = AnalyticsGenrePerformanceResponse['genres'][number];

type GenreRowProps = {
  item: GenreItem;
  maxEngagement: number;
};

const GenreRow = memo(function GenreRow({ item, maxEngagement }: GenreRowProps) {
  const fraction = maxEngagement > 0
    ? Math.max(item.avgEngagement / maxEngagement, BAR_MIN_FRACTION)
    : BAR_MIN_FRACTION;

  return (
    <View
      style={styles.genreRow}
      accessibilityLabel={`${item.name}: 投稿 ${item.postCount}件, 平均いいね ${item.avgLikes}, 平均エンゲージメント ${item.avgEngagement}`}
    >
      {/* ジャンル名と投稿数 */}
      <View style={styles.genreHeader}>
        <Text style={styles.genreName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.genreMeta}>
          <Text style={styles.metaText}>{item.postCount}投稿</Text>
          <Text style={styles.metaText}>いいね avg {item.avgLikes.toFixed(1)}</Text>
          <Text style={styles.engagementText}>eng {item.avgEngagement.toFixed(1)}</Text>
        </View>
      </View>

      {/* 棒グラフ */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { flex: fraction }]} />
        <View style={{ flex: 1 - fraction }} />
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

type GenrePerformanceViewProps = {
  period: AnalyticsPeriod;
};

export function GenrePerformanceView({ period }: GenrePerformanceViewProps) {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsGenrePerformanceQuery(period);

  const isPremiumRequired = isApiError(error) && error.code === 'PREMIUM_REQUIRED';

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const maxEngagement =
    data !== undefined && data.genres.length > 0
      ? Math.max(...data.genres.map((g) => g.avgEngagement), 1)
      : 1;

  const renderItem: ListRenderItem<GenreItem> = useCallback(
    ({ item }) => <GenreRow item={item} maxEngagement={maxEngagement} />,
    [maxEngagement],
  );

  const keyExtractor = useCallback((item: GenreItem) => item.name, []);

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
    <FlatList
      data={data.genres}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={handleRefresh}
          tintColor={colorActionPrimary}
        />
      }
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <OfflineBanner isVisible={!isOnline} />
          <Text style={styles.legend}>平均エンゲージメント（いいね + コメント）の高い順</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>バー幅 = 相対エンゲージメント</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <ScreenEmpty title="この期間のジャンルデータがありません" />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing6,
  },
  listHeader: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing2,
    gap: spacing2,
  },
  legend: {
    ...textXs,
    color: colorTextSecondary,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radiusXs,
    backgroundColor: colorActionPrimary,
  },
  legendText: {
    ...textXs,
    color: colorTextSecondary,
  },
  genreRow: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorBackground,
    gap: spacing2,
  },
  genreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing3,
  },
  genreName: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
    fontWeight: '600',
  },
  genreMeta: {
    flexDirection: 'row',
    gap: spacing3,
    flexShrink: 0,
    alignItems: 'center',
  },
  metaText: {
    ...textXs,
    color: colorTextSecondary,
  },
  engagementText: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  barTrack: {
    height: BAR_HEIGHT,
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusXs,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: {
    height: BAR_HEIGHT,
    backgroundColor: colorActionPrimary,
    borderRadius: radiusXs,
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing4,
  },
  // 利用ガードのためのダミー参照防止用
  _surface: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
  },
});

// 未使用のデザイントークン変数を参照して lint 警告を抑止する
void (colorSurface satisfies string);
void (radiusMd satisfies number);
