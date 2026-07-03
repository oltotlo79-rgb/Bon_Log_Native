/**
 * @module app/pesticides/columns/index
 * 農薬コラム一覧画面。Web 版 /pesticides/columns に対応。
 * 記事カードにカテゴリバッジと公開日を表示する。無限スクロール対応。
 * 仕様: docs/design/pesticides-web-parity.md §4-9
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
import { usePesticideColumnsQuery } from '@/lib/queries/pesticides';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
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

type PesticideColumnItem = components['schemas']['PesticideColumnItem'];

// ---------------------------------------------------------------------------
// カテゴリラベル対応表（Web版 CATEGORY_LABELS と同一）
// ---------------------------------------------------------------------------

const COLUMN_CATEGORY_LABELS: Record<string, string> = {
  mixing_order: '混用技術',
  temperature: '散布条件',
  general: '一般知識',
  management: '月別管理',
  resistance: '耐性対策',
  formulation: '剤型選択',
  active_ingredient: '原体・コード',
  safety: '安全管理',
  diagnosis: '診断',
  technique: '実践技術',
};

// ---------------------------------------------------------------------------
// コラムカードコンポーネント
// ---------------------------------------------------------------------------

type ColumnCardProps = {
  item: PesticideColumnItem;
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
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
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

export default function ColumnsIndexScreen() {
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
  } = usePesticideColumnsQuery();

  const handlePress = useCallback((slug: string) => {
    router.push({ pathname: '/pesticides/columns/[slug]', params: { slug } });
  }, []);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: PesticideColumnItem }) => (
      <ColumnCard item={item} onPress={handlePress} />
    ),
    [handlePress]
  );

  const extractKey = useCallback((item: PesticideColumnItem) => item.id, []);

  const ListFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <View style={styles.listFooter}>
          <ActivityIndicator size="small" color={colorActionPrimary} />
        </View>
      ) : null,
    [isFetchingNextPage]
  );

  const ListHeader = (
    <View style={styles.listHeader}>
      <PesticideDisclaimer />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'コラム', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'コラム', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_PESTICIDES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'コラム', headerShown: true }} />
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
