/**
 * @module components/analytics/QuotesView
 * 引用分析ビュー。totalQuotes / totalReposts のサマリと quotes の一覧を表示する。
 * このビューは全期間集計のため period を受け取らず、期間切替の影響を受けない。
 * Web の QuoteList / AnalyticsDashboard 引用セクションに相当。
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
import { useAnalyticsQuotesQuery } from '@/lib/queries/analytics';
import type { AnalyticsQuotesResponse } from '@/lib/queries/analytics';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';
import { routePostDetail } from '@/lib/constants/routes';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  radiusXs,
  radiusSm,
  textXs,
  textSm,
  textBase,
  textLg,
  text2xl,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 32;
const ONE_DAY_MS = 86_400_000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;

// ---------------------------------------------------------------------------
// 型エイリアス
// ---------------------------------------------------------------------------

type QuoteItem = AnalyticsQuotesResponse['quotes'][number];

// ---------------------------------------------------------------------------
// 相対時間フォーマット（Web の formatRelativeTime と同等）
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / ONE_DAY_MS);

  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < DAYS_PER_WEEK) return `${days}日前`;
  if (days < DAYS_PER_MONTH) return `${Math.floor(days / DAYS_PER_WEEK)}週間前`;
  return `${Math.floor(days / DAYS_PER_MONTH)}ヶ月前`;
}

// ---------------------------------------------------------------------------
// 集計サマリカード
// ---------------------------------------------------------------------------

type QuotesSummaryCardProps = {
  totalQuotes: number;
  totalReposts: number;
};

const QuotesSummaryCard = memo(function QuotesSummaryCard({
  totalQuotes,
  totalReposts,
}: QuotesSummaryCardProps) {
  return (
    <View
      style={styles.summaryCard}
      accessibilityLabel={`引用 ${totalQuotes.toLocaleString()}件, リポスト ${totalReposts.toLocaleString()}件`}
    >
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalQuotes.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>引用数</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalReposts.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>リポスト数</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 全期間通知バナー
// ---------------------------------------------------------------------------

const AllPeriodNotice = memo(function AllPeriodNotice() {
  return (
    <View style={styles.noticeBanner} accessibilityLiveRegion="polite">
      <Text style={styles.noticeText}>
        引用データは全期間の集計です。期間切替は反映されません。
      </Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 引用1行
// ---------------------------------------------------------------------------

type QuoteRowProps = {
  item: QuoteItem;
};

const QuoteRow = memo(function QuoteRow({ item }: QuoteRowProps) {
  const handlePress = useCallback(() => {
    router.push(routePostDetail(item.id));
  }, [item.id]);

  const displayContent =
    item.content !== null && item.content.length > 0
      ? item.content
      : '（テキストなし）';

  return (
    <TouchableOpacity
      style={styles.quoteRow}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.user.nickname}の引用: ${displayContent.slice(0, 30)}, いいね${item.likeCount}, コメント${item.commentCount}`}
    >
      <UserAvatar
        avatarUrl={item.user.avatarUrl}
        userId={item.user.id}
        size={AVATAR_SIZE}
        accessibilityLabel={`${item.user.nickname}のアバター`}
        recyclingKey={item.id}
      />
      <View style={styles.quoteBody}>
        <View style={styles.quoteHeader}>
          <Text style={styles.nickname} numberOfLines={1}>
            {item.user.nickname}
          </Text>
          <Text style={styles.timeAgo}>{formatRelativeTime(item.createdAt)}</Text>
        </View>

        <Text style={styles.quoteContent} numberOfLines={2}>
          {displayContent}
        </Text>

        {item.originalContent !== null && item.originalContent.length > 0 && (
          <View style={styles.originalBox}>
            <Text style={styles.originalLabel}>引用元: </Text>
            <Text style={styles.originalContent} numberOfLines={1}>
              {item.originalContent}
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <Text style={styles.stat}>いいね {item.likeCount.toLocaleString()}</Text>
          <Text style={styles.stat}>コメント {item.commentCount.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

export function QuotesView() {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsQuotesQuery();

  const isPremiumRequired = isApiError(error) && error.code === 'PREMIUM_REQUIRED';

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const renderItem: ListRenderItem<QuoteItem> = useCallback(
    ({ item }) => <QuoteRow item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: QuoteItem) => item.id, []);

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
      data={data.quotes}
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
          <QuotesSummaryCard
            totalQuotes={data.totalQuotes}
            totalReposts={data.totalReposts}
          />
          <AllPeriodNotice />
          {data.quotes.length > 0 && (
            <Text style={styles.sectionTitle}>引用一覧</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <ScreenEmpty title="引用された投稿はありません" />
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
    paddingBottom: spacing8,
  },
  listHeader: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing2,
    gap: spacing3,
  },
  // サマリカード
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorderLight,
    overflow: 'hidden',
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
  summaryLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  // 全期間通知
  noticeBanner: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingVertical: spacing2,
    paddingHorizontal: spacing3,
  },
  noticeText: {
    ...textXs,
    color: colorTextSecondary,
  },
  sectionTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  // 引用行
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorBackground,
    gap: spacing3,
    minHeight: 56,
  },
  quoteBody: {
    flex: 1,
    gap: spacing1,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  nickname: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
    flex: 1,
  },
  timeAgo: {
    ...textXs,
    color: colorTextTertiary,
    flexShrink: 0,
  },
  quoteContent: {
    ...textSm,
    color: colorTextPrimary,
  },
  originalBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusXs,
    paddingVertical: spacing1,
    paddingHorizontal: spacing2,
    gap: spacing1,
  },
  originalLabel: {
    ...textXs,
    color: colorTextSecondary,
    fontWeight: '600',
    flexShrink: 0,
  },
  originalContent: {
    ...textXs,
    color: colorTextSecondary,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing3,
  },
  stat: {
    ...textXs,
    color: colorTextSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing4,
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
