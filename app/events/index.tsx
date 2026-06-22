/**
 * @module app/events/index
 * イベント一覧画面。地域/都道府県フィルタ + FAB で新規作成。
 * 仕様: docs/design/events.md §2
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
import { useEventsListQuery } from '@/lib/queries/events';
import type { EventItemDetail } from '@/lib/queries/events';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { EventCard } from '@/components/events/EventCard';
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
import { routeEventDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FAB_SIZE = 56;
const FAB_ICON_SIZE = 24;
const CHIP_HEIGHT = 36;
const CHIP_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

type Region = {
  label: string;
  value: string;
};

const REGIONS: Region[] = [
  { label: '全国', value: '' },
  { label: '北海道・東北', value: '北海道・東北' },
  { label: '関東', value: '関東' },
  { label: '中部・北陸', value: '中部・北陸' },
  { label: '近畿', value: '近畿' },
  { label: '中国・四国', value: '中国・四国' },
  { label: '九州・沖縄', value: '九州・沖縄' },
];

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type EventListItem = EventItemDetail;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data: currentUser } = useCurrentUserQuery();
  const isLoggedIn = currentUser !== undefined;

  const [selectedRegion, setSelectedRegion] = useState('');

  const filter = selectedRegion.length > 0 ? { region: selectedRegion } : {};

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useEventsListQuery(filter);

  const allItems: EventListItem[] = data?.pages.flatMap((page) => page.items) ?? [];

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSelectRegion = useCallback((value: string) => {
    setSelectedRegion(value);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: EventListItem }) => (
      <EventCard
        id={item.id}
        title={item.title}
        startDate={item.startDate}
        venue={item.venue}
        prefecture={item.prefecture}
        admissionFee={item.admissionFee}
        hasSales={item.hasSales}
        onPress={() => router.push(routeEventDetail(item.id))}
      />
    ),
    []
  );

  const keyExtractor = useCallback((item: EventListItem) => item.id, []);

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
        <EventsHeader />
        <FilterBar selectedRegion={selectedRegion} onSelectRegion={handleSelectRegion} />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EventsHeader />
        <FilterBar selectedRegion={selectedRegion} onSelectRegion={handleSelectRegion} />
        <ScreenError
          title="読み込めませんでした"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const emptyTitle = selectedRegion.length > 0 ? 'このエリアのイベントはありません' : 'イベントがありません';
  const emptyDescription = selectedRegion.length > 0
    ? '他のエリアを選択するか、全国に切り替えてみてください。'
    : '盆栽関連のイベントはまだ登録されていません。';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />
      <EventsHeader />
      <FilterBar selectedRegion={selectedRegion} onSelectRegion={handleSelectRegion} />

      {allItems.length === 0 ? (
        <ScreenEmpty
          iconName="calendar-outline"
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={selectedRegion.length > 0 ? '全国に切り替える' : undefined}
          onAction={selectedRegion.length > 0 ? () => setSelectedRegion('') : undefined}
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
          onPress={() => router.push({ pathname: '/events/new' })}
          accessibilityRole="button"
          accessibilityLabel="イベントを作成する"
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

function EventsHeader() {
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
      <Text style={styles.headerTitle}>イベント</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

type FilterBarProps = {
  selectedRegion: string;
  onSelectRegion: (value: string) => void;
};

function FilterBar({ selectedRegion, onSelectRegion }: FilterBarProps) {
  return (
    <View style={styles.filterBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBarContent}
      >
        {REGIONS.map((region) => {
          const isSelected = selectedRegion === region.value;
          return (
            <Pressable
              key={region.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectRegion(region.value)}
              hitSlop={CHIP_HIT_SLOP}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={region.label}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {region.label}
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
  filterBar: {
    height: 44,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    justifyContent: 'center',
  },
  filterBarContent: {
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
