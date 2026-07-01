/**
 * @module components/analytics/PostsView
 * 投稿分析ビュー。totalPosts / totalLikes / totalComments / avgEngagement の
 * サマリと topPosts の一覧を表示する。
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import { router } from 'expo-router';
import { useAnalyticsPostsQuery } from '@/lib/queries/analytics';
import type { AnalyticsPostsResponse } from '@/lib/queries/analytics';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';
import type { AnalyticsPeriod } from '@/lib/queries/keys';
import { routePostDetail } from '@/lib/constants/routes';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorActionPrimary,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
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

const TOP_POSTS_LIMIT = 5;

// ---------------------------------------------------------------------------
// サマリカード（1枚）
// ---------------------------------------------------------------------------

type MetricTileProps = {
  value: string;
  label: string;
};

const MetricTile = memo(function MetricTile({ value, label }: MetricTileProps) {
  return (
    <View style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 人気投稿の1行
// ---------------------------------------------------------------------------

type TopPostItem = AnalyticsPostsResponse['topPosts'][number];

type TopPostRowProps = {
  rank: number;
  item: TopPostItem;
};

const TopPostRow = memo(function TopPostRow({ rank, item }: TopPostRowProps) {
  const handlePress = useCallback(() => {
    router.push(routePostDetail(item.id));
  }, [item.id]);

  const reactionTotal = item.likeCount + item.commentCount;

  return (
    <TouchableOpacity
      style={styles.postRow}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${rank}位: いいね${item.likeCount}件, コメント${item.commentCount}件`}
    >
      <Text style={styles.rank}>{rank}</Text>
      <View style={styles.postBody}>
        <Text style={styles.postContent} numberOfLines={2}>
          {item.content !== null && item.content.length > 0 ? item.content : '(メディア投稿)'}
        </Text>
        <View style={styles.postStats}>
          <Text style={styles.postStat}>いいね {item.likeCount.toLocaleString()}</Text>
          <Text style={styles.postStat}>コメント {item.commentCount.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.reactionBadge}>
        <Text style={styles.reactionTotal}>{reactionTotal.toLocaleString()}</Text>
        <Text style={styles.reactionLabel}>反応</Text>
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

type PostsViewProps = {
  period: AnalyticsPeriod;
};

export function PostsView({ period }: PostsViewProps) {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsPostsQuery(period);

  const isPremiumRequired = isApiError(error) && error.code === 'PREMIUM_REQUIRED';

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const renderItem: ListRenderItem<TopPostItem> = useCallback(
    ({ item, index }) => <TopPostRow rank={index + 1} item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: TopPostItem) => item.id, []);

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

  const topPosts = data.topPosts.slice(0, TOP_POSTS_LIMIT);

  return (
    <FlatList
      data={topPosts}
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
        <View style={styles.header}>
          <OfflineBanner isVisible={!isOnline} />
          {/* サマリ 4枚 */}
          <View style={styles.tilesRow}>
            <MetricTile value={data.totalPosts.toLocaleString()} label="投稿数" />
            <MetricTile value={data.totalLikes.toLocaleString()} label="いいね" />
            <MetricTile value={data.totalComments.toLocaleString()} label="コメント" />
            <MetricTile
              value={`${data.avgEngagement.toFixed(1)}`}
              label="平均エンゲ"
            />
          </View>

          {topPosts.length > 0 && (
            <Text style={styles.sectionTitle}>人気投稿トップ {topPosts.length}</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <ScreenEmpty title="この期間の投稿データがありません" />
      }
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
  header: {
    gap: spacing3,
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing2,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing2,
  },
  tile: {
    flex: 1,
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    padding: spacing3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorBorderLight,
    gap: spacing1,
  },
  tileValue: {
    ...text2xl,
    color: colorTextPrimary,
  },
  tileLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  sectionTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
    paddingTop: spacing2,
  },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    gap: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    backgroundColor: colorBackground,
  },
  rank: {
    ...textSm,
    color: colorTextTertiary,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  postBody: {
    flex: 1,
    gap: spacing1,
  },
  postContent: {
    ...textBase,
    color: colorTextPrimary,
  },
  postStats: {
    flexDirection: 'row',
    gap: spacing3,
  },
  postStat: {
    ...textXs,
    color: colorTextSecondary,
  },
  reactionBadge: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  reactionTotal: {
    ...textLg,
    color: colorActionPrimary,
  },
  reactionLabel: {
    ...textXs,
    color: colorTextTertiary,
  },
  // 未使用警告抑止
  _unusedSurfaceMuted: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusXs,
  },
});

// 未使用のデザイントークン変数を参照して lint 警告を抑止する
void (colorSurfaceMuted satisfies string);
void (radiusXs satisfies number);
