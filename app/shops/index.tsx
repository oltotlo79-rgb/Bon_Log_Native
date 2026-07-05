/**
 * @module app/shops/index
 * 盆栽園マップ一覧画面。
 * キーワード検索 / ジャンルフィルタ / ソートバー + FAB で新規登録。
 * Web 版 ShopsPage に寄せた構造（バナー / 検索フォーム / ソート / 一覧）。
 * 仕様: docs/design/shops.md §2
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShopsListQuery, useGenresQuery, useShopMapPinsQuery } from '@/lib/queries/shops';
import type { ShopListResponse } from '@/lib/queries/shops';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ShopCard } from '@/components/shops/ShopCard';
import { PrefecturePickerModal } from '@/components/shops/PrefecturePickerModal';
import { RegionPickerModal } from '@/components/shops/RegionPickerModal';
import { BonsaiMapView, type ShopMapItem } from '@/components/shops/BonsaiMapView';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { type PrefectureName } from '@/lib/constants/prefectures';
import { type RegionName } from '@/lib/constants/regions';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorBorderLight,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  radiusSm,
  radiusLg,
  shadowWashi,
  textBase,
  textLg,
  textSm,
  textXs,
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
const BANNER_HEIGHT = 96;
const SEARCH_ICON_SIZE = 16;
const CLEAR_ICON_SIZE = 16;
const BACK_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const PREFECTURE_ICON_SIZE = 14;
const PREFECTURE_CLEAR_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };
const REGION_ICON_SIZE = 14;
const REGION_CLEAR_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

// バナー画像はモバイル用を使用（map-header-mobile.webp: cfw ui/ からコピー済み）
const BANNER_SOURCE = require('@/assets/images/map-header-mobile.webp');

type SortOption = {
  label: string;
  value: ShopsListParams['sortBy'];
};

// Web 版（ShopSearchForm）の並び順と一致させる: 北から順 → 新着順 → 評価順 → 名前順
const SORT_OPTIONS: SortOption[] = [
  { label: '北から順', value: 'location' },
  { label: '新着順', value: 'newest' },
  { label: '評価順', value: 'rating' },
  { label: '名前順', value: 'name' },
];

// Web 版のデフォルトソート（getShops の既定値・ShopSearchForm の initialSort）と一致させる
const DEFAULT_SORT_BY: ShopsListParams['sortBy'] = 'location';

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

  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState<string | undefined>(undefined);
  const [genreId, setGenreId] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<ShopsListParams['sortBy']>(DEFAULT_SORT_BY);
  const [prefecture, setPrefecture] = useState<PrefectureName | undefined>(undefined);
  const [region, setRegion] = useState<RegionName | undefined>(undefined);
  const [isPrefectureModalVisible, setIsPrefectureModalVisible] = useState(false);
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);

  const searchInputRef = useRef<TextInput>(null);

  // 地方を選択したときは都道府県をリセットする（Web 版の動作に準拠）。
  // サーバー仕様上 prefecture が優先されるため、地方で絞った後に都道府県で更に絞るのではなく
  // 地方 ↔ 都道府県を排他的に切り替える方が UX 上自然なため。
  const handleSelectRegion = useCallback(
    (newRegion: RegionName | undefined) => {
      setRegion(newRegion);
      setPrefecture(undefined);
    },
    []
  );

  // 都道府県を選択したときは地方をリセットする。
  // 両方指定時はサーバー側で prefecture が優先されるが、UI 上は排他として表示する。
  const handleSelectPrefecture = useCallback(
    (newPrefecture: PrefectureName | undefined) => {
      setPrefecture(newPrefecture);
      if (newPrefecture !== undefined) {
        setRegion(undefined);
      }
    },
    []
  );

  const { data: genreData } = useGenresQuery('shop');
  const genres = genreData?.items ?? [];

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useShopsListQuery({ search: committedSearch, genreId, sortBy, prefecture, region });

  const allItems: ShopListItem[] = data?.pages.flatMap((page) => page.items) ?? [];

  const {
    data: mapPinsData,
    isLoading: isMapPinsLoading,
    isError: isMapPinsError,
    refetch: refetchMapPins,
  } = useShopMapPinsQuery();

  const mapItems: ShopMapItem[] = mapPinsData?.items ?? [];

  const handleSearch = useCallback(() => {
    const trimmed = search.trim();
    setCommittedSearch(trimmed.length > 0 ? trimmed : undefined);
    searchInputRef.current?.blur();
  }, [search]);

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setCommittedSearch(undefined);
  }, []);

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
      <View style={styles.listItemWrapper}>
        <ShopCard
          id={item.id}
          name={item.name}
          address={item.address}
          phone={item.phone}
          businessHours={item.businessHours}
          closedDays={item.closedDays}
          genres={item.genres.map((g) => g.name)}
          averageRating={item.averageRating}
          reviewCount={item.reviewCount}
          onPress={() => router.push(routeShopDetail(item.id))}
        />
      </View>
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

  const hasActiveFilter =
    (committedSearch !== undefined && committedSearch.length > 0) ||
    genreId !== undefined ||
    prefecture !== undefined ||
    region !== undefined ||
    sortBy !== DEFAULT_SORT_BY;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShopsHeader />
        <BannerImage />
        <SearchForm
          search={search}
          onChangeSearch={setSearch}
          onSubmitSearch={handleSearch}
          onClearSearch={handleClearSearch}
          searchInputRef={searchInputRef}
        />
        <SortAndFilterBar
          sortBy={sortBy}
          onSelectSort={setSortBy}
          genres={genres}
          selectedGenreId={genreId}
          onSelectGenre={setGenreId}
          selectedPrefecture={prefecture}
          onOpenPrefecturePicker={() => setIsPrefectureModalVisible(true)}
          onClearPrefecture={() => setPrefecture(undefined)}
          selectedRegion={region}
          onOpenRegionPicker={() => setIsRegionModalVisible(true)}
          onClearRegion={() => setRegion(undefined)}
        />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShopsHeader />
        <BannerImage />
        <SearchForm
          search={search}
          onChangeSearch={setSearch}
          onSubmitSearch={handleSearch}
          onClearSearch={handleClearSearch}
          searchInputRef={searchInputRef}
        />
        <SortAndFilterBar
          sortBy={sortBy}
          onSelectSort={setSortBy}
          genres={genres}
          selectedGenreId={genreId}
          onSelectGenre={setGenreId}
          selectedPrefecture={prefecture}
          onOpenPrefecturePicker={() => setIsPrefectureModalVisible(true)}
          onClearPrefecture={() => setPrefecture(undefined)}
          selectedRegion={region}
          onOpenRegionPicker={() => setIsRegionModalVisible(true)}
          onClearRegion={() => setRegion(undefined)}
        />
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
      <BannerImage />
      <SearchForm
        search={search}
        onChangeSearch={setSearch}
        onSubmitSearch={handleSearch}
        onClearSearch={handleClearSearch}
        searchInputRef={searchInputRef}
      />
      <SortAndFilterBar
        sortBy={sortBy}
        onSelectSort={setSortBy}
        genres={genres}
        selectedGenreId={genreId}
        onSelectGenre={setGenreId}
        selectedPrefecture={prefecture}
        onOpenPrefecturePicker={() => setIsPrefectureModalVisible(true)}
        onClearPrefecture={() => setPrefecture(undefined)}
        selectedRegion={region}
        onOpenRegionPicker={() => setIsRegionModalVisible(true)}
        onClearRegion={() => setRegion(undefined)}
        hasActiveFilter={hasActiveFilter}
        onReset={() => {
          setSearch('');
          setCommittedSearch(undefined);
          setGenreId(undefined);
          setPrefecture(undefined);
          setRegion(undefined);
          setSortBy(DEFAULT_SORT_BY);
        }}
      />
      <PrefecturePickerModal
        visible={isPrefectureModalVisible}
        selectedPrefecture={prefecture}
        onSelect={handleSelectPrefecture}
        onClose={() => setIsPrefectureModalVisible(false)}
      />
      <RegionPickerModal
        visible={isRegionModalVisible}
        selectedRegion={region}
        onSelect={handleSelectRegion}
        onClose={() => setIsRegionModalVisible(false)}
      />

      {/*
        地図をリストの外に固定配置すると下の盆栽園カードのスクロール領域が狭くなるため、
        FlatList の ListHeaderComponent に含めて画面全体を一体でスクロールする構成にする。
        地図自体は全幅表示を保つため contentContainerStyle には横paddingを持たせない。
      */}
      <FlatList
        style={styles.list}
        data={allItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <>
            <BonsaiMapView
              shops={mapItems}
              isOnline={isOnline}
              isMapLoading={isMapPinsLoading}
              isMapError={isMapPinsError}
              onRetryMapData={() => void refetchMapPins()}
            />
            {allItems.length > 0 && (
              <Text style={styles.resultCount}>盆栽園一覧 {allItems.length}件</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <ScreenEmpty
            iconName="map-outline"
            title="盆栽園が登録されていません"
            description={
              hasActiveFilter
                ? '条件を変えて再検索してみましょう。'
                : '右下のボタンから盆栽園を登録してみましょう。'
            }
          />
        }
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

      {/* FAB */}
      {isLoggedIn && (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + spacing4 }]}
          onPress={() => router.push({ pathname: '/shops/new' })}
          accessibilityRole="button"
          accessibilityLabel="盆栽園を登録する"
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
        hitSlop={BACK_HIT_SLOP}
      >
        <Text style={styles.backButtonText}>‹ 戻る</Text>
      </Pressable>
      <Text style={styles.headerTitle}>盆栽園マップ</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// バナー
// ---------------------------------------------------------------------------

function BannerImage() {
  return (
    <Image
      source={BANNER_SOURCE}
      style={styles.banner}
      contentFit="cover"
      accessibilityLabel=""
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

// ---------------------------------------------------------------------------
// 検索フォーム（Web 版の上部検索バーに対応）
// ---------------------------------------------------------------------------

type SearchFormProps = {
  search: string;
  onChangeSearch: (text: string) => void;
  onSubmitSearch: () => void;
  onClearSearch: () => void;
  searchInputRef: React.RefObject<TextInput | null>;
};

function SearchForm({
  search,
  onChangeSearch,
  onSubmitSearch,
  onClearSearch,
  searchInputRef,
}: SearchFormProps) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons
          name="search-outline"
          size={SEARCH_ICON_SIZE}
          color={colorTextTertiary}
          style={styles.searchIcon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          value={search}
          onChangeText={onChangeSearch}
          onSubmitEditing={onSubmitSearch}
          placeholder="名前または住所で検索..."
          placeholderTextColor={colorTextTertiary}
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityLabel="盆栽園を名前または住所で検索"
        />
        {search.length > 0 && (
          <Pressable
            onPress={onClearSearch}
            hitSlop={CHIP_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="検索をクリア"
          >
            <Ionicons
              name="close-circle"
              size={CLEAR_ICON_SIZE}
              color={colorTextTertiary}
            />
          </Pressable>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
        onPress={onSubmitSearch}
        accessibilityRole="button"
        accessibilityLabel="検索する"
      >
        <Text style={styles.searchButtonText}>検索</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ソート + ジャンルフィルタバー（Web 版の flex-wrap フィルタ行に対応）
// ---------------------------------------------------------------------------

type Genre = { id: string; name: string };

type SortAndFilterBarProps = {
  sortBy: ShopsListParams['sortBy'];
  onSelectSort: (value: ShopsListParams['sortBy']) => void;
  genres: Genre[];
  selectedGenreId: string | undefined;
  onSelectGenre: (id: string | undefined) => void;
  selectedPrefecture: PrefectureName | undefined;
  onOpenPrefecturePicker: () => void;
  onClearPrefecture: () => void;
  selectedRegion: RegionName | undefined;
  onOpenRegionPicker: () => void;
  onClearRegion: () => void;
  hasActiveFilter?: boolean;
  onReset?: () => void;
};

function SortAndFilterBar({
  sortBy,
  onSelectSort,
  genres,
  selectedGenreId,
  onSelectGenre,
  selectedPrefecture,
  onOpenPrefecturePicker,
  onClearPrefecture,
  selectedRegion,
  onOpenRegionPicker,
  onClearRegion,
  hasActiveFilter = false,
  onReset,
}: SortAndFilterBarProps) {
  return (
    <View style={styles.filterBarOuter}>
      {/* 地方ブロックフィルタ行 */}
      <View style={styles.prefectureRow}>
        <Pressable
          style={({ pressed }) => [
            styles.prefectureButton,
            selectedRegion !== undefined && styles.prefectureButtonActive,
            pressed && styles.prefectureButtonPressed,
          ]}
          onPress={onOpenRegionPicker}
          accessibilityRole="button"
          accessibilityLabel={`地方フィルタ: ${selectedRegion ?? 'すべて'}`}
          hitSlop={CHIP_HIT_SLOP}
        >
          <Ionicons
            name="map-outline"
            size={REGION_ICON_SIZE}
            color={
              selectedRegion !== undefined ? colorActionPrimaryText : colorTextSecondary
            }
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text
            style={[
              styles.prefectureButtonText,
              selectedRegion !== undefined && styles.prefectureButtonTextActive,
            ]}
          >
            {selectedRegion !== undefined ? selectedRegion : '地方: すべて'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={REGION_ICON_SIZE}
            color={
              selectedRegion !== undefined ? colorActionPrimaryText : colorTextTertiary
            }
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        {selectedRegion !== undefined && (
          <Pressable
            style={styles.prefectureClearButton}
            onPress={onClearRegion}
            hitSlop={REGION_CLEAR_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="地方フィルタをクリア"
          >
            <Ionicons
              name="close-circle"
              size={REGION_ICON_SIZE}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.prefectureClearText}>クリア</Text>
          </Pressable>
        )}
      </View>

      {/* 都道府県フィルタ行（地方の下に置き、都道府県が優先されることをレイアウト上も示す） */}
      <View style={styles.prefectureRow}>
        <Pressable
          style={({ pressed }) => [
            styles.prefectureButton,
            selectedPrefecture !== undefined && styles.prefectureButtonActive,
            pressed && styles.prefectureButtonPressed,
          ]}
          onPress={onOpenPrefecturePicker}
          accessibilityRole="button"
          accessibilityLabel={`都道府県フィルタ: ${selectedPrefecture ?? 'すべて'}`}
          hitSlop={CHIP_HIT_SLOP}
        >
          <Ionicons
            name="location-outline"
            size={PREFECTURE_ICON_SIZE}
            color={
              selectedPrefecture !== undefined ? colorActionPrimaryText : colorTextSecondary
            }
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text
            style={[
              styles.prefectureButtonText,
              selectedPrefecture !== undefined && styles.prefectureButtonTextActive,
            ]}
          >
            {selectedPrefecture !== undefined ? selectedPrefecture : '都道府県: すべて'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={PREFECTURE_ICON_SIZE}
            color={
              selectedPrefecture !== undefined ? colorActionPrimaryText : colorTextTertiary
            }
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        {/* 都道府県が選択中のときだけクリアボタンを表示 */}
        {selectedPrefecture !== undefined && (
          <Pressable
            style={styles.prefectureClearButton}
            onPress={onClearPrefecture}
            hitSlop={PREFECTURE_CLEAR_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="都道府県フィルタをクリア"
          >
            <Ionicons
              name="close-circle"
              size={PREFECTURE_ICON_SIZE}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.prefectureClearText}>クリア</Text>
          </Pressable>
        )}
      </View>

      {/* ソート + ジャンルチップ行（横スクロール） */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarContent}
        >
          {/* ソートチップ */}
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

          {/* セパレーター */}
          <View style={styles.separator} />

          {/* ジャンルフィルタチップ（すべて + 各ジャンル） */}
          <Pressable
            style={[styles.chip, selectedGenreId === undefined && styles.chipSelected]}
            onPress={() => onSelectGenre(undefined)}
            hitSlop={CHIP_HIT_SLOP}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedGenreId === undefined }}
            accessibilityLabel="すべてのジャンル"
          >
            <Text style={[styles.chipText, selectedGenreId === undefined && styles.chipTextSelected]}>
              すべて
            </Text>
          </Pressable>

          {genres.map((g) => {
            const isSelected = selectedGenreId === g.id;
            return (
              <Pressable
                key={g.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => onSelectGenre(g.id)}
                hitSlop={CHIP_HIT_SLOP}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${g.name}で絞り込む`}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {g.name}
                </Text>
              </Pressable>
            );
          })}

          {/* リセットボタン（フィルタが有効な時のみ表示） */}
          {hasActiveFilter && onReset !== undefined && (
            <Pressable
              style={styles.resetButton}
              onPress={onReset}
              hitSlop={CHIP_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="絞り込みをリセット"
            >
              <Text style={styles.resetText}>リセット</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
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

  // ヘッダー
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

  // バナー
  banner: {
    width: '100%',
    height: BANNER_HEIGHT,
  },

  // 検索フォーム
  searchContainer: {
    flexDirection: 'row',
    gap: spacing2,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusLg,
    paddingHorizontal: spacing3,
    gap: spacing2,
    minHeight: 44,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    ...textBase,
    color: colorTextPrimary,
    // Android と iOS でパディングが異なるため Platform で統一
    paddingVertical: Platform.OS === 'android' ? spacing1 : spacing2,
  },
  searchButton: {
    backgroundColor: colorActionPrimary,
    borderRadius: radiusLg,
    paddingHorizontal: spacing4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    minHeight: 44,
  },
  searchButtonPressed: {
    opacity: 0.8,
  },
  searchButtonText: {
    ...textSm,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },

  // フィルタバー（都道府県行 + チップ行をまとめる外側コンテナ）
  filterBarOuter: {
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },

  // 都道府県フィルタ行
  prefectureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingTop: spacing2,
    paddingBottom: spacing1,
    gap: spacing2,
  },
  prefectureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    backgroundColor: colorActionSecondary,
    borderRadius: radiusSm,
    paddingHorizontal: spacing3,
    minHeight: 36,
    paddingVertical: spacing1,
  },
  prefectureButtonActive: {
    backgroundColor: colorActionPrimary,
  },
  prefectureButtonPressed: {
    opacity: 0.75,
  },
  prefectureButtonText: {
    ...textXs,
    color: colorTextSecondary,
  },
  prefectureButtonTextActive: {
    color: colorActionPrimaryText,
  },
  prefectureClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    minHeight: 36,
    paddingHorizontal: spacing2,
  },
  prefectureClearText: {
    ...textXs,
    color: colorTextTertiary,
  },

  // ソート+ジャンルチップ横スクロール行
  filterBar: {
    height: 48,
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
  separator: {
    width: 1,
    height: CHIP_HEIGHT,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing1,
  },
  resetButton: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetText: {
    ...textSm,
    color: colorTextSecondary,
  },

  // リスト
  // 地図は ListHeaderComponent 内で全幅表示するため、横paddingはコンテンツ側（各要素）で個別に持つ
  list: {
    flex: 1,
  },
  resultCount: {
    ...textSm,
    color: colorTextTertiary,
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
    paddingBottom: spacing2,
  },
  listItemWrapper: {
    paddingHorizontal: spacing4,
  },
  listContent: {
    flexGrow: 1,
  },
  footer: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },

  // FAB
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
