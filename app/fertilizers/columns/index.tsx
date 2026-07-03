/**
 * @module app/fertilizers/columns/index
 * 施肥コラム一覧画面。農薬コラム（/pesticides/columns）と同構成。
 * 無限スクロール対応。カテゴリバッジ付きカードを表示する。
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFertilizerColumnsQuery } from '@/lib/queries/fertilizers';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorActionPrimary,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusSm,
  radiusMd,
  shadowWashi,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

type FertilizerColumnItem = components['schemas']['FertilizerColumnListResponse']['items'][number];

// ---------------------------------------------------------------------------
// カテゴリラベル対応表
// ---------------------------------------------------------------------------

const COLUMN_CATEGORY_LABELS: Record<string, string> = {
  basics:          '基礎知識',
  seasonal:        '季節の施肥',
  technique:       '施肥技術',
  troubleshooting: 'トラブル解決',
  product_guide:   '定番肥料ガイド',
  trouble:         'トラブル事例',
};

// ---------------------------------------------------------------------------
// コラムカード
// ---------------------------------------------------------------------------

type ColumnCardProps = {
  item: FertilizerColumnItem;
  onPress: (slug: string) => void;
};

const ColumnCard = memo(function ColumnCard({ item, onPress }: ColumnCardProps) {
  const handlePress = useCallback(() => { onPress(item.slug); }, [item.slug, onPress]);

  const categoryLabel = COLUMN_CATEGORY_LABELS[item.category] ?? item.category;
  const publishedDate = new Date(item.publishedAt).toLocaleDateString('ja-JP');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}を読む（${categoryLabel}・${publishedDate}）`}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
        </View>
      </View>
      <Text style={styles.publishedDate}>{publishedDate}</Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function FertilizerColumnsIndexScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useFertilizerColumnsQuery();

  const handlePress = useCallback((slug: string) => {
    router.push({ pathname: '/fertilizers/columns/[slug]', params: { slug } });
  }, []);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: FertilizerColumnItem }) => (
      <ColumnCard item={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const extractKey = useCallback((item: FertilizerColumnItem) => item.id, []);

  const ListFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <View style={styles.listFooter}>
          <ActivityIndicator size="small" color={colorActionPrimary} />
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  const ListHeader = (
    <View style={styles.listHeader}>
      <FertilizerDisclaimer />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'コラム・読みもの', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'コラム・読みもの', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_FERTILIZERS_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'コラム・読みもの', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <FlatList
        data={items}
        keyExtractor={extractKey}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <ScreenEmpty
            title="コラム記事はまだ公開されていません"
            iconName="book-outline"
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing8 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  listContent: {
    paddingHorizontal: spacing4,
  },
  listHeader: {
    paddingTop: spacing4,
    paddingBottom: spacing4,
  },
  listFooter: {
    padding: spacing4,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing4,
    marginBottom: spacing3,
    gap: spacing2,
    ...shadowWashi,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  cardTitle: {
    flex: 1,
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    lineHeight: 20,
  },
  categoryBadge: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    flexShrink: 0,
  },
  categoryBadgeText: {
    ...textXs,
    color: colorTextSecondary,
  },
  publishedDate: {
    ...textXs,
    color: colorTextSecondary,
  },
});
