/**
 * @module app/pesticides/index
 * 農薬・病害虫セクション ハブ画面。
 * Web 版 /pesticides のナビカード + 免責事項 + 検索フォーム構成を準拠再現する。
 * 仕様: docs/design/pesticides-web-parity.md §4-1
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  usePesticideDiseasePestsQuery,
  usePesticideProductsQuery,
} from '@/lib/queries/pesticides';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { NavCard } from '@/components/common/NavCard';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import { resolveApiImageUrl } from '@/lib/utils/resolve-api-image-url';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusSm,
  radiusMd,
  radiusFull,
  shadowWashi,
  textBase,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type DiseasePestItem = components['schemas']['DiseasePestItem'];
type PesticideItem = components['schemas']['PesticideItem'];
type DiseasePestCategory = components['schemas']['DiseasePestCategory'];
type PesticideType = components['schemas']['PesticideType'];

// ---------------------------------------------------------------------------
// カテゴリ・タイプバッジ定義
// ---------------------------------------------------------------------------

const CATEGORY_BADGE: Record<DiseasePestCategory, { label: string; bg: string; text: string }> = {
  disease:           { label: '病害', bg: '#fee2e2', text: '#b91c1c' },
  pest:              { label: '害虫', bg: '#fef3c7', text: '#b45309' },
  beneficial_insect: { label: '益虫', bg: '#d1fae5', text: '#065f46' },
};

const CATEGORY_EMOJI: Record<DiseasePestCategory, string> = {
  disease:           '🦠',
  pest:              '🐛',
  beneficial_insect: '🐝',
};

const PESTICIDE_TYPE_BADGE: Record<PesticideType, { label: string; bg: string; text: string }> = {
  fungicide:   { label: '殺菌剤', bg: '#e0f2fe', text: '#0369a1' },
  insecticide: { label: '殺虫剤', bg: '#ffedd5', text: '#c2410c' },
  acaricide:   { label: '殺ダニ剤', bg: '#ede9fe', text: '#6d28d9' },
  compound:    { label: '複合剤', bg: '#fdf4ff', text: '#a21caf' },
  other:       { label: 'その他', bg: '#f2f2f2', text: '#484848' },
};

// ---------------------------------------------------------------------------
// タイプフィルタチップ定義
// ---------------------------------------------------------------------------

type DiseasePestCategoryFilter = 'disease' | 'pest' | 'beneficial_insect';
type PesticideTypeFilter = 'fungicide' | 'insecticide' | 'acaricide' | 'compound';
type FilterTag = 'all' | DiseasePestCategoryFilter | PesticideTypeFilter;

type FilterChipDef = { key: FilterTag; label: string };

const FILTER_CHIPS: FilterChipDef[] = [
  { key: 'all', label: '全て' },
  { key: 'pest', label: '害虫' },
  { key: 'disease', label: '病気' },
  { key: 'beneficial_insect', label: '益虫' },
  { key: 'insecticide', label: '殺虫剤' },
  { key: 'fungicide', label: '殺菌剤' },
  { key: 'acaricide', label: '殺ダニ剤' },
  { key: 'compound', label: '複合剤' },
];

const DISEASE_PEST_FILTER_KEYS: readonly DiseasePestCategoryFilter[] = ['disease', 'pest', 'beneficial_insect'] as const;
const PESTICIDE_TYPE_FILTER_KEYS: readonly PesticideTypeFilter[] = ['fungicide', 'insecticide', 'acaricide', 'compound'] as const;

function toDiseasePestCategory(key: FilterTag): DiseasePestCategory | undefined {
  return (DISEASE_PEST_FILTER_KEYS as readonly string[]).includes(key)
    ? (key as DiseasePestCategory)
    : undefined;
}

function toPesticideType(key: FilterTag): PesticideType | undefined {
  return (PESTICIDE_TYPE_FILTER_KEYS as readonly string[]).includes(key)
    ? (key as PesticideType)
    : undefined;
}

// ---------------------------------------------------------------------------
// ハブナビカード定義（今回作成する画面のみ。新API待ちは除外）
// ---------------------------------------------------------------------------

type NavCardIconName =
  | 'bug-outline'
  | 'flask-outline'
  | 'calculator-outline'
  | 'water-outline'
  | 'water-sharp'
  | 'book-outline'
  | 'beaker-outline'
  | 'git-compare-outline';

type NavCardDef = {
  iconName: NavCardIconName;
  label: string;
  description: string;
  route:
    | '/pesticides/disease-pests'
    | '/pesticides/ingredients'
    | '/pesticides/dilution-calculator'
    | '/pesticides/spray-guide'
    | '/pesticides/spreaders'
    | '/pesticides/columns'
    | '/pesticides/formulations'
    | '/pesticides/mixing-checker';
};

const NAV_CARDS: NavCardDef[] = [
  {
    iconName: 'bug-outline',
    label: '病害虫・益虫図鑑',
    description: '病害・害虫・益虫の詳細と効く薬剤を確認',
    route: '/pesticides/disease-pests',
  },
  {
    iconName: 'flask-outline',
    label: '有効成分（原体）一覧',
    description: 'FRAC/IRACコード・耐性リスクを確認',
    route: '/pesticides/ingredients',
  },
  {
    iconName: 'water-sharp',
    label: '展着剤',
    description: '薬液の付着・浸透を助ける展着剤の分類と製品',
    route: '/pesticides/spreaders',
  },
  {
    iconName: 'book-outline',
    label: 'コラム・読みもの',
    description: '混用順序・耐性管理など実践知識',
    route: '/pesticides/columns',
  },
  {
    iconName: 'beaker-outline',
    label: '剤型の違い',
    description: '水和剤・乳剤・粒剤など剤型ごとの特徴',
    route: '/pesticides/formulations',
  },
  {
    iconName: 'git-compare-outline',
    label: '混用チェッカー',
    description: '農薬の混用可否を確認',
    route: '/pesticides/mixing-checker',
  },
  {
    iconName: 'calculator-outline',
    label: '希釈計算ツール',
    description: '希釈倍率から薬剤量を計算',
    route: '/pesticides/dilution-calculator',
  },
  {
    iconName: 'water-outline',
    label: '散布方法ガイド',
    description: '希釈・散布の実践ガイド',
    route: '/pesticides/spray-guide',
  },
];

// ---------------------------------------------------------------------------
// バナー画像
// ---------------------------------------------------------------------------

// ライトモード専用バナー。将来のダークモード対応で header-pesticide-dark.webp を追加する
/* eslint-disable @typescript-eslint/no-require-imports */
const BANNER_IMG = require('@/assets/images/pesticides/header-pesticide.webp') as number;
/* eslint-enable @typescript-eslint/no-require-imports */

// ---------------------------------------------------------------------------
// あいうえお順全一覧の統合アイテム型
// ---------------------------------------------------------------------------

type AllListItem =
  | { type: 'disease_pest'; data: DiseasePestItem; sortKey: string }
  | { type: 'product'; data: PesticideItem; sortKey: string };

// ---------------------------------------------------------------------------
// 病害虫セルコンポーネント
// ---------------------------------------------------------------------------

type DiseasePestCellProps = {
  item: DiseasePestItem;
  onPress: (item: DiseasePestItem) => void;
};

const DiseasePestCell = memo(function DiseasePestCell({ item, onPress }: DiseasePestCellProps) {
  const badge = CATEGORY_BADGE[item.category];
  const emoji = CATEGORY_EMOJI[item.category];
  const thumbnailUri = resolveApiImageUrl(item.imageUrl);

  const handlePress = useCallback(() => { onPress(item); }, [item, onPress]);

  return (
    <TouchableOpacity
      style={styles.gridCell}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}で農薬を絞り込む`}
    >
      <View style={styles.gridCellImage}>
        {thumbnailUri !== null ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.gridThumb}
            contentFit="cover"
            accessibilityLabel={`${item.name}のサムネイル`}
          />
        ) : (
          <Text style={styles.gridEmoji} accessibilityElementsHidden>{emoji}</Text>
        )}
      </View>
      <View style={styles.gridCellBody}>
        <Text style={styles.gridCellName} numberOfLines={2}>{item.name}</Text>
        <View style={[styles.smallBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.smallBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// 農薬製品セルコンポーネント
// ---------------------------------------------------------------------------

type ProductCellProps = {
  item: PesticideItem;
  onPress: (item: PesticideItem) => void;
};

const ProductCell = memo(function ProductCell({ item, onPress }: ProductCellProps) {
  const badge = PESTICIDE_TYPE_BADGE[item.pesticideType];
  const handlePress = useCallback(() => { onPress(item); }, [item, onPress]);

  return (
    <TouchableOpacity
      style={styles.gridCell}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}の詳細を見る`}
    >
      <View style={[styles.gridCellImage, styles.gridCellImageProduct]}>
        <Text style={styles.gridEmoji} accessibilityElementsHidden>🧪</Text>
      </View>
      <View style={styles.gridCellBody}>
        <Text style={styles.gridCellName} numberOfLines={2}>{item.name}</Text>
        <View style={[styles.smallBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.smallBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// 統合リストアイテムのレンダラー
// ---------------------------------------------------------------------------

type AllListCellProps = {
  item: AllListItem;
  onDiseasePestPress: (item: DiseasePestItem) => void;
  onProductPress: (item: PesticideItem) => void;
};

const AllListCell = memo(function AllListCell({
  item,
  onDiseasePestPress,
  onProductPress,
}: AllListCellProps) {
  if (item.type === 'disease_pest') {
    return <DiseasePestCell item={item.data} onPress={onDiseasePestPress} />;
  }
  return <ProductCell item={item.data} onPress={onProductPress} />;
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const CARD_COLUMNS = 2;
const CARD_GAP = spacing3;

export default function PesticidesHubScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { width: windowWidth } = useWindowDimensions();

  const [searchText, setSearchText] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [activeTag, setActiveTag] = useState<FilterTag>('all');
  const [selectedDiseasePestId, setSelectedDiseasePestId] = useState<string | null>(null);

  const diseasePestCategory = toDiseasePestCategory(activeTag);
  const productType = toPesticideType(activeTag);

  const {
    data: diseasePestData,
    isLoading: isDpLoading,
    isError: isDpError,
    fetchNextPage: fetchDpNext,
    hasNextPage: hasDpNext,
    isFetchingNextPage: isFetchingDpNext,
    refetch: refetchDp,
  } = usePesticideDiseasePestsQuery({ category: diseasePestCategory });

  const {
    data: productData,
    isLoading: isProductLoading,
    isError: isProductError,
    fetchNextPage: fetchProductNext,
    hasNextPage: hasProductNext,
    isFetchingNextPage: isFetchingProductNext,
    refetch: refetchProduct,
  } = usePesticideProductsQuery({
    search: submittedSearch.length > 0 ? submittedSearch : undefined,
    type: productType,
    diseasePestId: selectedDiseasePestId ?? undefined,
  });

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    setSubmittedSearch(searchText);
    setActiveTag('all');
    setSelectedDiseasePestId(null);
  }, [searchText]);

  const handleClear = useCallback(() => {
    setSearchText('');
    setSubmittedSearch('');
    setActiveTag('all');
    setSelectedDiseasePestId(null);
  }, []);

  const handleTagChange = useCallback((tag: FilterTag) => {
    setActiveTag(tag);
    setSelectedDiseasePestId(null);
    setSubmittedSearch('');
    setSearchText('');
  }, []);

  const handleDiseasePestPress = useCallback((item: DiseasePestItem) => {
    setSelectedDiseasePestId(item.id);
    setActiveTag('all');
    setSubmittedSearch('');
    setSearchText('');
  }, []);

  const handleProductPress = useCallback((item: PesticideItem) => {
    router.push({ pathname: '/pesticides/products/[slug]', params: { slug: item.slug } });
  }, []);

  const handleRefresh = useCallback(() => {
    void refetchDp();
    void refetchProduct();
  }, [refetchDp, refetchProduct]);

  // あいうえお順全一覧（病害虫 + 製品を混在してかな順ソート）
  const allItems = React.useMemo((): AllListItem[] => {
    const dpItems: AllListItem[] = (diseasePestData?.pages.flatMap((p) => p.items) ?? []).map(
      (dp) => ({ type: 'disease_pest' as const, data: dp, sortKey: dp.nameKana ?? dp.name })
    );
    const prItems: AllListItem[] = (productData?.pages.flatMap((p) => p.items) ?? []).map(
      (pr) => ({ type: 'product' as const, data: pr, sortKey: pr.name })
    );
    const merged = [...dpItems, ...prItems];
    merged.sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'ja'));
    return merged;
  }, [diseasePestData, productData]);

  const showDiseasePestGrid = diseasePestCategory !== undefined;
  const showProductList =
    productType !== undefined ||
    submittedSearch.length > 0 ||
    selectedDiseasePestId !== null;

  const isLoading = isDpLoading || isProductLoading;
  const isError =
    (showDiseasePestGrid && isDpError) || (showProductList && isProductError);

  const dpItems = diseasePestData?.pages.flatMap((p) => p.items) ?? [];
  const prItems = productData?.pages.flatMap((p) => p.items) ?? [];

  const handleDpEndReached = useCallback(() => {
    if (hasDpNext && !isFetchingDpNext) void fetchDpNext();
  }, [hasDpNext, isFetchingDpNext, fetchDpNext]);

  const handleProductEndReached = useCallback(() => {
    if (hasProductNext && !isFetchingProductNext) void fetchProductNext();
  }, [hasProductNext, isFetchingProductNext, fetchProductNext]);

  // ---- 病害虫グリッドのレンダラー ----
  const renderDpItem = useCallback(
    ({ item }: { item: DiseasePestItem }) => (
      <DiseasePestCell item={item} onPress={handleDiseasePestPress} />
    ),
    [handleDiseasePestPress]
  );
  const extractDpKey = useCallback((item: DiseasePestItem) => item.id, []);
  const DpListFooter = useCallback(
    () => (isFetchingDpNext ? <View style={styles.listFooter}><ActivityIndicator size="small" color={colorActionPrimary} /></View> : null),
    [isFetchingDpNext]
  );

  // ---- 農薬製品リストのレンダラー ----
  const renderProductItem = useCallback(
    ({ item }: { item: PesticideItem }) => (
      <ProductCell item={item} onPress={handleProductPress} />
    ),
    [handleProductPress]
  );
  const extractProductKey = useCallback((item: PesticideItem) => item.id, []);
  const ProductListFooter = useCallback(
    () => (isFetchingProductNext ? <View style={styles.listFooter}><ActivityIndicator size="small" color={colorActionPrimary} /></View> : null),
    [isFetchingProductNext]
  );

  // ---- 全一覧のレンダラー ----
  const renderAllItem = useCallback(
    ({ item }: { item: AllListItem }) => (
      <AllListCell
        item={item}
        onDiseasePestPress={handleDiseasePestPress}
        onProductPress={handleProductPress}
      />
    ),
    [handleDiseasePestPress, handleProductPress]
  );
  const extractAllKey = useCallback((item: AllListItem) => `${item.type}-${item.data.id}`, []);

  const showClear = searchText.length > 0 || activeTag !== 'all' || selectedDiseasePestId !== null;
  const listHeadingLabel = selectedDiseasePestId !== null
    ? '対応薬剤'
    : activeTag !== 'all'
    ? `${FILTER_CHIPS.find((c) => c.key === activeTag)?.label ?? ''} の一覧`
    : 'あいうえお順一覧';

  const ListHeader = (
    <View style={styles.headerContainer}>
      {/* バナー画像（21:9比率） */}
      <View style={styles.banner}>
        <Image
          source={BANNER_IMG}
          style={styles.bannerImage}
          contentFit="cover"
          accessibilityLabel="農薬・病害虫"
        />
      </View>

      <View style={styles.headerBody}>
        {/* 説明文 */}
        <Text style={styles.headerDescription}>
          病害虫を選んで効く薬剤を検索、または薬剤名で直接検索できます
        </Text>

        {/* ナビカード */}
        <View style={styles.navCardsSection}>
          {NAV_CARDS.map((card) => (
            <NavCard
              key={card.label}
              iconName={card.iconName}
              label={card.label}
              description={card.description}
              onPress={() => { router.push(card.route); }}
            />
          ))}
        </View>

        {/* 免責事項 */}
        <PesticideDisclaimer />

        {/* 検索フォーム */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="薬剤名・登録番号で検索..."
            placeholderTextColor={colorTextSecondary}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            accessibilityLabel="薬剤名または登録番号で検索"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            accessibilityRole="button"
            accessibilityLabel="検索する"
          >
            <Text style={styles.searchButtonText}>検索</Text>
          </TouchableOpacity>
          {showClear && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              accessibilityRole="button"
              accessibilityLabel="検索フィルタをクリア"
            >
              <Text style={styles.clearButtonText}>クリア</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* タイプフィルタチップ（横スクロール） */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContent}
          style={styles.filterChips}
        >
          {FILTER_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.filterChip,
                activeTag === chip.key && styles.filterChipActive,
              ]}
              onPress={() => { handleTagChange(chip.key); }}
              accessibilityRole="button"
              accessibilityLabel={`${chip.label}でフィルタ`}
              accessibilityState={{ selected: activeTag === chip.key }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeTag === chip.key && styles.filterChipTextActive,
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 一覧見出し */}
        <Text style={styles.listHeading}>{listHeadingLabel}</Text>
      </View>
    </View>
  );

  const emptyComponent = isLoading ? null : (
    <ScreenEmpty title="該当するデータが見つかりませんでした" iconName="search-outline" />
  );

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '農薬・病害虫', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした。"
          description={ERR_PESTICIDES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  // 表示モードに応じて FlatList を切り替える
  if (showDiseasePestGrid) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '農薬・病害虫', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <FlatList
          data={dpItems}
          keyExtractor={extractDpKey}
          renderItem={renderDpItem}
          numColumns={CARD_COLUMNS}
          columnWrapperStyle={[styles.gridRow, { width: windowWidth - spacing4 * 2 }]}
          onEndReached={handleDpEndReached}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={DpListFooter}
          ListEmptyComponent={emptyComponent}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing8 }]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  if (showProductList) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '農薬・病害虫', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <FlatList
          data={prItems}
          keyExtractor={extractProductKey}
          renderItem={renderProductItem}
          numColumns={CARD_COLUMNS}
          columnWrapperStyle={[styles.gridRow, { width: windowWidth - spacing4 * 2 }]}
          onEndReached={handleProductEndReached}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ProductListFooter}
          ListEmptyComponent={emptyComponent}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing8 }]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  // デフォルト: あいうえお順全一覧
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '農薬・病害虫', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <FlatList
        data={allItems}
        keyExtractor={extractAllKey}
        renderItem={renderAllItem}
        numColumns={CARD_COLUMNS}
        columnWrapperStyle={[styles.gridRow, { width: windowWidth - spacing4 * 2 }]}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={emptyComponent}
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
  listFooter: {
    padding: spacing4,
    alignItems: 'center',
  },

  // ヘッダー
  headerContainer: {
    gap: 0,
    marginBottom: spacing4,
  },
  banner: {
    width: '100%',
    aspectRatio: 21 / 9,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  headerBody: {
    paddingTop: spacing4,
    gap: spacing6,
  },
  headerDescription: {
    ...textSm,
    color: colorTextSecondary,
  },

  // ナビカード
  navCardsSection: {
    gap: spacing3,
  },

  // 検索フォーム
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    backgroundColor: colorSurface,
    ...textBase,
    color: colorTextPrimary,
  },
  searchButton: {
    height: 44,
    paddingHorizontal: spacing3,
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  searchButtonText: {
    ...textSm,
    color: colorActionPrimaryText,
    fontFamily: fontFamilySerifBold,
  },
  clearButton: {
    height: 44,
    paddingHorizontal: spacing3,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    ...textSm,
    color: colorTextSecondary,
  },

  // フィルタチップ
  filterChips: {
    marginHorizontal: -spacing4,
  },
  filterChipsContent: {
    paddingHorizontal: spacing4,
    gap: spacing2,
    flexDirection: 'row',
  },
  filterChip: {
    height: 36,
    paddingHorizontal: spacing3,
    borderRadius: radiusFull,
    borderWidth: 1,
    borderColor: colorBorder,
    backgroundColor: colorSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  filterChipText: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },
  filterChipTextActive: {
    color: colorActionPrimaryText,
  },

  // 一覧見出し
  listHeading: {
    ...textSm,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
    paddingBottom: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    marginBottom: spacing3,
  },

  // グリッド共通セル
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  gridCell: {
    flex: 1,
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    overflow: 'hidden',
    minHeight: 44,
    ...shadowWashi,
  },
  gridCellImage: {
    width: '100%',
    height: 56,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellImageProduct: {
    backgroundColor: '#eef4fb',
  },
  gridThumb: {
    width: '100%',
    height: 56,
  },
  gridEmoji: {
    fontSize: 22,
  },
  gridCellBody: {
    padding: spacing2,
    gap: spacing2,
  },
  gridCellName: {
    ...textXs,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    lineHeight: 16,
  },
  smallBadge: {
    alignSelf: 'flex-start',
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  smallBadgeText: {
    fontSize: 9,
    lineHeight: 13,
    fontFamily: fontFamilySerifBold,
  },
});
