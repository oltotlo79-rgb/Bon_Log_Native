/**
 * @module app/events/index
 * イベント一覧画面。カレンダービュー / リストビュー 切り替え。
 * Web 版 events/page.tsx の構成に準拠: RegionFilter + ViewToggleBar + カレンダー or リスト。
 * 仕様: docs/design/events-shopmap-web-parity.md §4.1
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
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
import { EventCalendarNative, type EventCalendarItem } from '@/components/events/EventCalendarNative';
import { EventsViewToggleBar, type EventViewMode } from '@/components/events/EventsViewToggleBar';
import { EventsRegionFilterBar } from '@/components/events/EventsRegionFilterBar';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import type { PrefectureName } from '@/lib/constants/prefectures';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  shadowWashi,
  textLg,
  textMd,
  textSm,
} from '@/lib/constants/design-tokens';
import { routeEventDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FAB_SIZE = 56;
const FAB_ICON_SIZE = 24;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type EventListItem = EventItemDetail;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

// ISO 文字列から YYYY-MM-DD を取り出す（タイムゾーン変換を経由しない）
function getYmd(isoStr: string): string {
  const slice = isoStr.slice(0, 10);
  if (slice.length === 10 && slice[4] === '-' && slice[7] === '-') {
    return slice;
  }
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data: currentUser } = useCurrentUserQuery();
  const isLoggedIn = currentUser !== undefined;

  // ビュー状態
  const [viewMode, setViewMode] = useState<EventViewMode>('calendar');
  const [showPast, setShowPast] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedPrefecture, setSelectedPrefecture] = useState<PrefectureName | undefined>(undefined);

  // カレンダー表示月（1〜12）
  const now = useMemo(() => new Date(), []);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);

  // ---------------------------------------------------------------------------
  // カレンダービュー用クエリ（月フィルタあり・過去含む）
  // ---------------------------------------------------------------------------
  const calendarFilter = useMemo(
    () => ({
      region: selectedRegion.length > 0 ? selectedRegion : undefined,
      prefecture: selectedPrefecture,
      showPast: true as const,
      year: calendarYear,
      month: calendarMonth,
    }),
    [selectedRegion, selectedPrefecture, calendarYear, calendarMonth]
  );

  const {
    data: calendarData,
    isLoading: calendarIsLoading,
    isError: calendarIsError,
    refetch: calendarRefetch,
    fetchNextPage: calendarFetchNextPage,
    hasNextPage: calendarHasNextPage,
    isFetchingNextPage: calendarIsFetchingNextPage,
  } = useEventsListQuery(calendarFilter);

  // 全ページ展開（月単位の全イベント）
  const calendarRawItems: EventItemDetail[] = useMemo(
    () => calendarData?.pages.flatMap((page) => page.items) ?? [],
    [calendarData]
  );

  // カレンダーコンポーネントに渡す形式に変換
  const calendarAllItems: EventCalendarItem[] = useMemo(
    () =>
      calendarRawItems.map((item) => ({
        id: item.id,
        title: item.title,
        startDate: item.startDate,
        endDate: item.endDate,
        prefecture: item.prefecture,
      })),
    [calendarRawItems]
  );

  // 次ページが存在する間は自動取得
  React.useEffect(() => {
    if (calendarHasNextPage && !calendarIsFetchingNextPage && viewMode === 'calendar') {
      void calendarFetchNextPage();
    }
  }, [calendarHasNextPage, calendarIsFetchingNextPage, calendarFetchNextPage, viewMode]);

  // 今後のイベント（取得済みデータからクライアントフィルタ・フル型で保持）
  const todayYmd = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const upcomingEvents = useMemo(
    () =>
      calendarRawItems
        .filter((ev) => getYmd(ev.startDate) >= todayYmd)
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [calendarRawItems, todayYmd]
  );

  // ---------------------------------------------------------------------------
  // リストビュー用クエリ（全期間・無限スクロール）
  // ---------------------------------------------------------------------------
  const listFilter = useMemo(
    () => ({
      region: selectedRegion.length > 0 ? selectedRegion : undefined,
      prefecture: selectedPrefecture,
      showPast: showPast || undefined,
    }),
    [selectedRegion, selectedPrefecture, showPast]
  );

  const {
    data: listData,
    isLoading: listIsLoading,
    isError: listIsError,
    refetch: listRefetch,
    fetchNextPage: listFetchNextPage,
    hasNextPage: listHasNextPage,
    isFetchingNextPage: listIsFetchingNextPage,
    isRefetching: listIsRefetching,
  } = useEventsListQuery(listFilter);

  const listAllItems: EventListItem[] = useMemo(
    () => listData?.pages.flatMap((page) => page.items) ?? [],
    [listData]
  );

  // ---------------------------------------------------------------------------
  // ハンドラ
  // ---------------------------------------------------------------------------

  const handleMonthChange = useCallback((year: number, month: number) => {
    setCalendarYear(year);
    setCalendarMonth(month);
  }, []);

  const handleEventPress = useCallback(
    (eventId: string) => {
      router.push(routeEventDetail(eventId));
    },
    []
  );

  const handleListRefresh = useCallback(() => {
    void listRefetch();
  }, [listRefetch]);

  const handleListLoadMore = useCallback(() => {
    if (listHasNextPage && !listIsFetchingNextPage) {
      void listFetchNextPage();
    }
  }, [listHasNextPage, listIsFetchingNextPage, listFetchNextPage]);

  const handleRegionChange = useCallback((region: string) => {
    setSelectedRegion(region);
  }, []);

  const handlePrefectureChange = useCallback((pref: PrefectureName | undefined) => {
    setSelectedPrefecture(pref);
  }, []);

  const renderListItem = useCallback(
    ({ item }: { item: EventListItem }) => (
      <EventCard
        id={item.id}
        title={item.title}
        startDate={item.startDate}
        endDate={item.endDate}
        venue={item.venue}
        prefecture={item.prefecture}
        city={item.city}
        admissionFee={item.admissionFee}
        hasSales={item.hasSales}
        onPress={() => router.push(routeEventDetail(item.id))}
      />
    ),
    []
  );

  const renderUpcomingItem = useCallback(
    ({ item }: { item: EventItemDetail }) => (
      <EventCard
        id={item.id}
        title={item.title}
        startDate={item.startDate}
        endDate={item.endDate}
        venue={item.venue}
        prefecture={item.prefecture}
        city={item.city}
        admissionFee={item.admissionFee}
        hasSales={item.hasSales}
        onPress={() => router.push(routeEventDetail(item.id))}
      />
    ),
    []
  );

  const keyExtractor = useCallback((item: { id: string }) => item.id, []);

  const renderListFooter = useCallback(() => {
    if (!listIsFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [listIsFetchingNextPage]);

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>イベント一覧</Text>
        <Text style={styles.listHeaderCount}>{listAllItems.length}件</Text>
      </View>
    ),
    [listAllItems.length]
  );

  const hasFilter = selectedRegion.length > 0 || selectedPrefecture !== undefined;

  // ---------------------------------------------------------------------------
  // カレンダービューのエラー / 空状態
  // ---------------------------------------------------------------------------

  const renderCalendarErrorOrEmpty = () => {
    if (calendarIsError) {
      return (
        <ScreenError
          title="読み込めませんでした"
          onRetry={() => void calendarRefetch()}
        />
      );
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // リストビューのエラー状態
  // ---------------------------------------------------------------------------

  if (viewMode === 'list' && listIsError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <OfflineBanner isVisible={!isOnline} />
        <EventsHeader />
        <EventsRegionFilterBar
          selectedRegion={selectedRegion}
          selectedPrefecture={selectedPrefecture}
          onRegionChange={handleRegionChange}
          onPrefectureChange={handlePrefectureChange}
        />
        <EventsViewToggleBar
          viewMode={viewMode}
          showPast={showPast}
          onViewModeChange={setViewMode}
          onShowPastChange={setShowPast}
        />
        <ScreenError
          title="読み込めませんでした"
          onRetry={() => void listRefetch()}
        />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // メインレンダリング
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />
      <EventsHeader />

      <EventsRegionFilterBar
        selectedRegion={selectedRegion}
        selectedPrefecture={selectedPrefecture}
        onRegionChange={handleRegionChange}
        onPrefectureChange={handlePrefectureChange}
      />

      <EventsViewToggleBar
        viewMode={viewMode}
        showPast={showPast}
        onViewModeChange={setViewMode}
        onShowPastChange={setShowPast}
      />

      {/* カレンダービュー */}
      {viewMode === 'calendar' && (
        <FlatList
          data={upcomingEvents}
          keyExtractor={keyExtractor}
          renderItem={renderUpcomingItem}
          contentContainerStyle={[
            styles.calendarScrollContent,
            { paddingBottom: insets.bottom + FAB_SIZE + spacing6 * 2 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => void calendarRefetch()}
              tintColor={colorActionPrimary}
            />
          }
          accessibilityRole="list"
          ListHeaderComponent={
            <>
              {renderCalendarErrorOrEmpty()}

              <EventCalendarNative
                events={calendarAllItems}
                year={calendarYear}
                month={calendarMonth}
                onMonthChange={handleMonthChange}
                onEventPress={handleEventPress}
                isLoading={calendarIsLoading || calendarIsFetchingNextPage}
              />

              {/* 追加ページ取得中インジケータ */}
              {calendarIsFetchingNextPage && (
                <View style={styles.calendarLoadingMore}>
                  <ActivityIndicator size="small" color={colorActionPrimary} />
                </View>
              )}

              {/* 今後のイベント見出し */}
              <View style={styles.upcomingHeader}>
                <Text style={styles.upcomingTitle}>今後のイベント</Text>
                {upcomingEvents.length > 0 && (
                  <Text style={styles.upcomingCount}>{upcomingEvents.length}件</Text>
                )}
              </View>

              {/* 空状態 */}
              {!calendarIsLoading && !calendarIsError && upcomingEvents.length === 0 && (
                <View style={styles.emptyUpcoming}>
                  <Text style={styles.emptyUpcomingText}>
                    今後のイベントはありません
                  </Text>
                </View>
              )}
            </>
          }
        />
      )}

      {/* リストビュー */}
      {viewMode === 'list' && (
        <>
          {listIsLoading ? (
            <View style={styles.listLoadingContainer}>
              <ActivityIndicator size="large" color={colorActionPrimary} />
            </View>
          ) : listAllItems.length === 0 ? (
            <ScreenEmpty
              iconName="calendar-outline"
              title={
                hasFilter
                  ? 'このエリアのイベントはありません'
                  : 'イベントがありません'
              }
              description={
                hasFilter
                  ? '他のエリアを選択するか、全国に切り替えてみてください。'
                  : '盆栽関連のイベントはまだ登録されていません。'
              }
              actionLabel={hasFilter ? '全国に切り替える' : undefined}
              onAction={
                hasFilter
                  ? () => {
                      setSelectedRegion('');
                      setSelectedPrefecture(undefined);
                    }
                  : undefined
              }
            />
          ) : (
            <FlatList
              data={listAllItems}
              keyExtractor={keyExtractor}
              renderItem={renderListItem}
              onEndReached={handleListLoadMore}
              onEndReachedThreshold={0.3}
              ListHeaderComponent={renderListHeader}
              ListFooterComponent={renderListFooter}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + FAB_SIZE + spacing6 * 2 },
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={listIsRefetching && !listIsLoading}
                  onRefresh={handleListRefresh}
                  tintColor={colorActionPrimary}
                />
              }
              accessibilityRole="list"
            />
          )}
        </>
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
// ヘッダー（内部コンポーネント）
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
  calendarScrollContent: {
    paddingTop: spacing4,
    paddingHorizontal: 0,
  },
  calendarLoadingMore: {
    paddingVertical: spacing3,
    alignItems: 'center',
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing2,
    marginTop: spacing4,
    marginBottom: spacing3,
    paddingHorizontal: spacing4,
  },
  upcomingTitle: {
    ...textMd,
    fontWeight: '600',
    color: colorTextPrimary,
  },
  upcomingCount: {
    ...textSm,
    color: colorTextTertiary,
  },
  emptyUpcoming: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
  },
  emptyUpcomingText: {
    ...textSm,
    color: colorTextTertiary,
    textAlign: 'center',
  },
  listLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing2,
    marginBottom: spacing3,
  },
  listHeaderTitle: {
    ...textMd,
    fontWeight: '600',
    color: colorTextPrimary,
  },
  listHeaderCount: {
    ...textSm,
    color: colorTextTertiary,
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
