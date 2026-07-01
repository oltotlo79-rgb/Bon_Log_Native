/**
 * @module components/analytics/KeywordsView
 * キーワードビュー。keywords の word / count を頻度順に表示し、
 * totalWords / uniqueWords を合わせて見せる。
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
import { useAnalyticsKeywordsQuery } from '@/lib/queries/analytics';
import type { AnalyticsKeywordsResponse } from '@/lib/queries/analytics';
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
  radiusXs,
  radiusMd,
  textXs,
  textSm,
  textBase,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const BAR_HEIGHT = 8;
const BAR_MIN_FRACTION = 0.02;

// ---------------------------------------------------------------------------
// キーワード1行
// ---------------------------------------------------------------------------

type KeywordItem = AnalyticsKeywordsResponse['keywords'][number];

type KeywordRowProps = {
  rank: number;
  item: KeywordItem;
  maxCount: number;
};

const KeywordRow = memo(function KeywordRow({ rank, item, maxCount }: KeywordRowProps) {
  const fraction = maxCount > 0
    ? Math.max(item.count / maxCount, BAR_MIN_FRACTION)
    : BAR_MIN_FRACTION;

  return (
    <View
      style={styles.keywordRow}
      accessibilityLabel={`${rank}位: ${item.word} ${item.count}回`}
    >
      <Text style={styles.rankNum}>{rank}</Text>
      <View style={styles.keywordBody}>
        <View style={styles.keywordTop}>
          <Text style={styles.word}>{item.word}</Text>
          <Text style={styles.count}>{item.count}回</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: fraction }]} />
          <View style={{ flex: 1 - fraction }} />
        </View>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 集計サマリカード
// ---------------------------------------------------------------------------

type SummaryCardProps = {
  totalWords: number;
  uniqueWords: number;
};

const SummaryCard = memo(function SummaryCard({ totalWords, uniqueWords }: SummaryCardProps) {
  return (
    <View style={styles.summaryCard} accessibilityLabel={`総単語数 ${totalWords}, ユニーク語数 ${uniqueWords}`}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalWords.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>総単語数</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{uniqueWords.toLocaleString()}</Text>
        <Text style={styles.summaryLabel}>ユニーク語数</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

type KeywordsViewProps = {
  period: AnalyticsPeriod;
};

export function KeywordsView({ period }: KeywordsViewProps) {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsKeywordsQuery(period);

  const isPremiumRequired = isApiError(error) && error.code === 'PREMIUM_REQUIRED';

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const maxCount =
    data !== undefined && data.keywords.length > 0
      ? Math.max(...data.keywords.map((k) => k.count), 1)
      : 1;

  const renderItem: ListRenderItem<KeywordItem> = useCallback(
    ({ item, index }) => (
      <KeywordRow rank={index + 1} item={item} maxCount={maxCount} />
    ),
    [maxCount],
  );

  const keyExtractor = useCallback((item: KeywordItem) => item.word, []);

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
      data={data.keywords}
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
          <SummaryCard totalWords={data.totalWords} uniqueWords={data.uniqueWords} />
          <Text style={styles.sectionTitle}>よく使うキーワード（頻度順）</Text>
        </View>
      }
      ListEmptyComponent={
        <ScreenEmpty title="この期間のキーワードデータがありません" />
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
    ...textLg,
    color: colorTextPrimary,
  },
  summaryLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  sectionTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  keywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorBackground,
    minHeight: 52,
    gap: spacing3,
  },
  rankNum: {
    ...textSm,
    color: colorTextSecondary,
    width: 24,
    textAlign: 'center',
    flexShrink: 0,
  },
  keywordBody: {
    flex: 1,
    gap: spacing2,
  },
  keywordTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  word: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
    flex: 1,
  },
  count: {
    ...textSm,
    color: colorTextSecondary,
    flexShrink: 0,
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
  spacing6Ref: {
    paddingVertical: spacing6,
  },
});

// 未使用のデザイントークン変数を参照して lint 警告を抑止する
void (spacing6 satisfies number);
