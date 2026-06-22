/**
 * @module app/shops/index
 * 盆栽園マップ一覧画面。sortBy フィルタ + FAB で新規登録。
 * 仕様: docs/design/shops.md §2
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShopsListQuery } from '@/lib/queries/shops';
import type { ShopListResponse } from '@/lib/queries/shops';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ShopCard } from '@/components/shops/ShopCard';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorBorderLight,
  spacing1,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  radiusSm,
  shadowWashi,
  textLg,
  textSm,
} from '@/lib/constants/design-tokens';
import { routeShopDetail } from '@/lib/constants/routes';
import type { ShopsListParams } from '@/lib/queries/keys';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FAB_SIZE = 56;
const FAB_ICON_SIZE = 24;
const CHIP_HEIGHT = 36;
const CHIP_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

type SortOption = {
  label: string;
  value: ShopsListParams['sortBy'];
};

const SORT_OPTIONS: SortOption[] = [
  { label: '評価順', value: 'rating' },
  { label: '名前順', value: 'name' },
  { label: '新着順', value: 'newest' },
  { label: '近い順', value: 'location' },
];

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type ShopListItem = ShopListResponse['items'][number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShopsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data: currentUser } = useCurrentUserQuery();
  const isLoggedIn = currentUser !== undefined;

  const [sortBy, setSortBy] = useState<ShopsListParams['sortBy']>('rating');

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useShopsListQuery({ sortBy });

  const allItems: ShopListItem[] = data?.pages.flatMap((page) => page.items) ?? [];

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ShopListItem }) => (
      <ShopCard
        id={item.id}
        name={item.name}
        address={item.address}
        genres={item.genres.map((g) => g.name)}
        averageRating={item.averageRating}
        reviewCount={item.reviewCount}
        onPress={() => router.push(routeShopDetail(item.id))}
      />
    ),
    []
  );

  const keyExtractor = useCallback((item: ShopListItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShopsHeader />
        <SortBar sortBy={sortBy} onSelectSort={setSortBy} />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShopsHeader />
        <SortBar sortBy={sortBy} onSelectSort={setSortBy} />
        <ScreenError
          title="読み込めませんでした"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />
      <ShopsHeader />
      <SortBar sortBy={sortBy} onSelectSort={setSortBy} />

      {allItems.length === 0 ? (
        <ScreenEmpty
          iconName="map-outline"
          title="盆栽園が登録されていません"
          description="右下のボタンから盆栽園を登録してみましょう。"
        />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + FAB_SIZE + spacing6 * 2 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={handleRefresh}
              tintColor={colorActionPrimary}
            />
          }
          accessibilityRole="list"
        />
      )}

      {/* FAB */}
      {isLoggedIn && (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + spacing4 }]}
          onPress={() => router.push({ pathname: '/shops/new' })}
          accessibilityRole="button"
          accessibilityLabel="店舗を登録する"
        >
          <Ionicons
            name="add"
            size={FAB_ICON_SIZE}
            color={colorActionPrimaryText}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

function ShopsHeader() {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="戻る"
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backButtonText}>‹ 戻る</Text>
      </Pressable>
      <Text style={styles.headerTitle}>盆栽園マップ</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// SortBar
// ---------------------------------------------------------------------------

type SortBarProps = {
  sortBy: ShopsListParams['sortBy'];
  onSelectSort: (value: ShopsListParams['sortBy']) => void;
};

function SortBar({ sortBy, onSelectSort }: SortBarProps) {
  return (
    <View style={styles.sortBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortBarContent}
      >
        {SORT_OPTIONS.map((opt) => {
          const isSelected = sortBy === opt.value;
          return (
            <Pressable
              key={opt.value ?? 'default'}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectSort(opt.value)}
              hitSlop={CHIP_HIT_SLOP}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={opt.label}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 44,
  },
  backButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: colorTextSecondary,
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 60,
  },
  sortBar: {
    height: 44,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    justifyContent: 'center',
  },
  sortBarContent: {
    paddingHorizontal: spacing4,
    gap: spacing1,
    alignItems: 'center',
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorActionSecondary,
    borderRadius: radiusSm,
  },
  chipSelected: {
    backgroundColor: colorActionPrimary,
  },
  chipText: {
    ...textSm,
    color: colorActionSecondaryText,
  },
  chipTextSelected: {
    color: colorActionPrimaryText,
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
  },
  footer: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing4,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowWashi,
  },
});
