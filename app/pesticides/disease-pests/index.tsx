/**
 * @module app/pesticides/disease-pests/index
 * 病害虫・益虫図鑑一覧画面。
 * Web 版 /pesticides/diseases-pests に準拠。検索フォーム＋カテゴリフィルタ＋2カラムカードグリッド。
 * 仕様: docs/design/pesticides-web-parity.md §4-2
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePesticideDiseasePestsQuery } from '@/lib/queries/pesticides';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import { resolveApiImageUrl } from '@/lib/utils/resolve-api-image-url';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorActionPrimary,
  colorActionPrimaryText,
  colorTextPrimary,
  colorTextSecondary,
  colorCategoryRedBg,
  colorCategoryRedText,
  colorCategoryPestBg,
  colorCategoryPestText,
  colorCategoryGreenBg,
  colorCategoryGreenText,
  spacing2,
  spacing3,
  spacing4,
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
type DiseasePestCategory = components['schemas']['DiseasePestCategory'];

// ---------------------------------------------------------------------------
// カテゴリ定義
// ---------------------------------------------------------------------------

const CATEGORY_BADGE: Record<DiseasePestCategory, { label: string; bg: string; text: string }> = {
  disease:           { label: '病害', bg: colorCategoryRedBg, text: colorCategoryRedText },
  pest:              { label: '害虫', bg: colorCategoryPestBg, text: colorCategoryPestText },
  beneficial_insect: { label: '益虫', bg: colorCategoryGreenBg, text: colorCategoryGreenText },
};

const CATEGORY_EMOJI: Record<DiseasePestCategory, string> = {
  disease:           '🦠',
  pest:              '🐛',
  beneficial_insect: '🐝',
};

type CategoryFilter = 'all' | DiseasePestCategory;

type CategoryChipDef = { key: CategoryFilter; label: string };

const CATEGORY_CHIPS: CategoryChipDef[] = [
  { key: 'all', label: 'すべて' },
  { key: 'disease', label: '病害' },
  { key: 'pest', label: '害虫' },
  { key: 'beneficial_insect', label: '益虫' },
];

// ---------------------------------------------------------------------------
// 病害虫カードコンポーネント
// ---------------------------------------------------------------------------

const CARD_COLUMNS = 2;
const CARD_GAP = spacing3;
const CARD_IMAGE_HEIGHT = 72;

type DiseasePestCardProps = {
  item: DiseasePestItem;
  cardWidth: number;
};

const DiseasePestCard = memo(function DiseasePestCard({ item, cardWidth }: DiseasePestCardProps) {
  const thumbnailUri = resolveApiImageUrl(item.imageUrl);
  const badge = CATEGORY_BADGE[item.category];
  const emoji = CATEGORY_EMOJI[item.category];

  const handlePress = useCallback(() => {
    router.push({ pathname: '/pesticides/disease-pests/[slug]', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}の詳細を見る`}
    >
      <View style={styles.cardImageWrapper}>
        {thumbnailUri !== null ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.cardImage}
            contentFit="cover"
            accessibilityLabel={`${item.name}のサムネイル`}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardEmoji} accessibilityElementsHidden>{emoji}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.categoryBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        {item.description !== null && (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DiseasePestsIndexScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { width: windowWidth } = useWindowDimensions();

  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [bodySizeInput, setBodySizeInput] = useState('');
  const [submittedBodySize, setSubmittedBodySize] = useState<number | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const category = activeCategory !== 'all' ? activeCategory : undefined;

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePesticideDiseasePestsQuery({
    search: submittedSearch.length > 0 ? submittedSearch : undefined,
    category,
    bodySizeMm: submittedBodySize,
  });

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    setSubmittedSearch(searchInput);
    const parsed = parseFloat(bodySizeInput);
    setSubmittedBodySize(!isNaN(parsed) && parsed > 0 ? parsed : undefined);
  }, [searchInput, bodySizeInput]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  // 2カラムカード幅計算
  const cardWidth = Math.floor(
    (windowWidth - spacing4 * 2 - CARD_GAP * (CARD_COLUMNS - 1)) / CARD_COLUMNS
  );

  const renderItem = useCallback(
    ({ item }: { item: DiseasePestItem }) => (
      <DiseasePestCard item={item} cardWidth={cardWidth} />
    ),
    [cardWidth]
  );

  const keyExtractor = useCallback((item: DiseasePestItem) => item.id, []);

  const ListFooter = useCallback(() =>
    isFetchingNextPage ? (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    ) : null,
  [isFetchingNextPage]);

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* 検索フォーム */}
      <View style={styles.searchBlock}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, styles.searchInputFlex]}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="病害虫名・色で検索..."
            placeholderTextColor={colorTextSecondary}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            accessibilityLabel="病害虫名または色で検索"
          />
          <TextInput
            style={[styles.searchInput, styles.bodySizeInput]}
            value={bodySizeInput}
            onChangeText={setBodySizeInput}
            placeholder="体長mm"
            placeholderTextColor={colorTextSecondary}
            keyboardType="numeric"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            accessibilityLabel="体長をミリメートルで入力"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            accessibilityRole="button"
            accessibilityLabel="検索する"
          >
            <Text style={styles.searchButtonText}>検索</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.bodySizeNote}>
          体長を指定すると、その大きさの範囲に含まれる害虫・益虫のみ表示されます。
        </Text>
      </View>

      {/* カテゴリフィルタ */}
      <View style={styles.categoryChips}>
        {CATEGORY_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.key}
            style={[
              styles.categoryChip,
              activeCategory === chip.key && styles.categoryChipActive,
            ]}
            onPress={() => { setActiveCategory(chip.key); }}
            accessibilityRole="button"
            accessibilityLabel={`${chip.label}でフィルタ`}
            accessibilityState={{ selected: activeCategory === chip.key }}
          >
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === chip.key && styles.categoryChipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 件数 */}
      {!isLoading && (
        <Text style={styles.countText}>{items.length}件{hasNextPage ? '以上' : ''}</Text>
      )}

      {/* 免責事項 */}
      <PesticideDisclaimer />
    </View>
  );

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '病害虫・益虫図鑑', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        {ListHeader}
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '病害虫・益虫図鑑', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="図鑑を読み込めませんでした。"
          description={ERR_PESTICIDES_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '病害虫・益虫図鑑', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={CARD_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <ScreenEmpty
            title="該当するデータが見つかりませんでした"
            iconName="bug-outline"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
        }
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
  listHeader: {
    gap: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing4,
  },

  // 検索フォーム
  searchBlock: {
    gap: spacing2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    backgroundColor: colorSurface,
    ...textBase,
    color: colorTextPrimary,
  },
  searchInputFlex: {
    flex: 1,
  },
  bodySizeInput: {
    width: 80,
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
  bodySizeNote: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },

  // カテゴリフィルタ
  categoryChips: {
    flexDirection: 'row',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  categoryChip: {
    height: 36,
    paddingHorizontal: spacing3,
    borderRadius: radiusFull,
    borderWidth: 1,
    borderColor: colorBorder,
    backgroundColor: colorSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  categoryChipText: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },
  categoryChipTextActive: {
    color: colorActionPrimaryText,
  },

  // 件数テキスト
  countText: {
    ...textXs,
    color: colorTextSecondary,
  },

  // グリッド
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // 病害虫カード
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    overflow: 'hidden',
    ...shadowWashi,
  },
  cardImageWrapper: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colorSurfaceMuted,
  },
  cardImage: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardBody: {
    padding: spacing3,
    gap: spacing2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    ...textXs,
    fontFamily: fontFamilySerifBold,
  },
  cardName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    lineHeight: 18,
  },
  cardDesc: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
});
