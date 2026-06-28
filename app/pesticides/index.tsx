/**
 * @module app/pesticides/index
 * 農薬・病害虫図鑑トップ画面。病害虫・農薬製品・農薬成分の3タブ無限スクロール。
 * 仕様: docs/design/browse-screens.md §5
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  usePesticideDiseasePestsQuery,
  usePesticideProductsQuery,
  usePesticideIngredientsQuery,
} from '@/lib/queries/pesticides';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { CatalogTabs } from '@/components/browse/CatalogTabs';
import { CatalogListItem } from '@/components/browse/CatalogListItem';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import { resolveApiImageUrl } from '@/lib/utils/resolve-api-image-url';
import {
  colorBackground,
  colorActionPrimary,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorBorder,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusSm,
  radiusMd,
  shadowWashi,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type DiseasePestItem = components['schemas']['DiseasePestItem'];
type PesticideItem = components['schemas']['PesticideItem'];
type IngredientItem = components['schemas']['IngredientItem'];
type DiseasePestCategory = components['schemas']['DiseasePestCategory'];

// ---------------------------------------------------------------------------
// タブ定義
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'disease-pests', label: '病害虫' },
  { key: 'products', label: '農薬製品' },
  { key: 'ingredients', label: '農薬成分' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ---------------------------------------------------------------------------
// カテゴリバッジ定義（Web版の CATEGORY_BADGE を RN カラーで移植）
// ---------------------------------------------------------------------------

const CATEGORY_BADGE: Record<DiseasePestCategory, { label: string; bg: string; text: string }> = {
  disease:           { label: '病害', bg: '#fee2e2', text: '#b91c1c' },
  pest:              { label: '害虫', bg: '#fef3c7', text: '#b45309' },
  beneficial_insect: { label: '益虫', bg: '#d1fae5', text: '#065f46' },
};

// カテゴリ絵文字（画像がない場合のプレースホルダー）
const CATEGORY_EMOJI: Record<DiseasePestCategory, string> = {
  disease:           '🦠',
  pest:              '🐛',
  beneficial_insect: '🐝',
};

// ---------------------------------------------------------------------------
// 病害虫カードコンポーネント（Web版 DiseasePestList の2カラムカードに合わせる）
// ---------------------------------------------------------------------------

const CARD_IMAGE_SIZE = 64;
const CARD_COLUMNS = 2;
const CARD_GAP = spacing3;

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
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.categoryBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
        {item.description !== null && (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const ProductCell = memo(function ProductCell({ item }: { item: PesticideItem }) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/pesticides/products/[slug]', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <CatalogListItem
      title={item.name}
      subtitle={item.description ?? undefined}
      categoryLabel={item.pesticideType}
      onPress={handlePress}
      accessibilityLabel={`${item.name}の詳細を見る`}
    />
  );
});

const IngredientCell = memo(function IngredientCell({ item }: { item: IngredientItem }) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/pesticides/ingredients/[slug]', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <CatalogListItem
      title={item.name}
      subtitle={item.nameEn ?? undefined}
      onPress={handlePress}
      accessibilityLabel={`${item.name}の詳細を見る`}
    />
  );
});

// ---------------------------------------------------------------------------
// タブコンテンツ
// ---------------------------------------------------------------------------

function DiseasePestsTab({ isActive }: { isActive: boolean }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePesticideDiseasePestsQuery();

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  // 2カラムグリッド。左右padding + カラム間gapを引いてカード幅を算出
  const cardWidth = Math.floor(
    (windowWidth - spacing4 * 2 - CARD_GAP * (CARD_COLUMNS - 1)) / CARD_COLUMNS
  );

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="図鑑を読み込めませんでした。"
        description={ERR_PESTICIDES_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (items.length === 0) return <ScreenEmpty title="データがありません" />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={CARD_COLUMNS}
      columnWrapperStyle={styles.gridRow}
      renderItem={({ item }) => <DiseasePestCard item={item} cardWidth={cardWidth} />}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={ListFooter}
      contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + spacing6 }]}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
      }
    />
  );
}

function ProductsTab({ isActive }: { isActive: boolean }) {
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePesticideProductsQuery();

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="図鑑を読み込めませんでした。"
        description={ERR_PESTICIDES_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (items.length === 0) return <ScreenEmpty title="データがありません" />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCell item={item} />}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={ListFooter}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing6 }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
      }
    />
  );
}

function IngredientsTab({ isActive }: { isActive: boolean }) {
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePesticideIngredientsQuery();

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="図鑑を読み込めませんでした。"
        description={ERR_PESTICIDES_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (items.length === 0) return <ScreenEmpty title="データがありません" />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <IngredientCell item={item} />}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={ListFooter}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing6 }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
      }
    />
  );
}

// ---------------------------------------------------------------------------
// ヘッダーバナー（Web版 page.tsx の aspect-[21/9] 画像ブロックに対応）
// ---------------------------------------------------------------------------

// ライトモード専用バナー。将来のダークモード対応で header-pesticide-dark.webp を追加する
const BANNER_LIGHT = require('@/assets/images/pesticides/header-pesticide.webp') as number;

const PesticidesBanner = memo(function PesticidesBanner() {
  return (
    <View style={styles.banner}>
      <Image
        source={BANNER_LIGHT}
        style={styles.bannerImage}
        contentFit="cover"
        accessibilityLabel="農薬・病害虫図鑑"
      />
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PesticidesScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<TabKey>('disease-pests');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: '農薬・病害虫図鑑', headerShown: true }} />

      <OfflineBanner isVisible={!isOnline} />

      <PesticidesBanner />

      <CatalogTabs
        tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
      />

      <View style={styles.content}>
        <DiseasePestsTab isActive={activeTab === 'disease-pests'} />
        <ProductsTab isActive={activeTab === 'products'} />
        <IngredientsTab isActive={activeTab === 'ingredients'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  content: {
    flex: 1,
  },
  listFooter: {
    padding: spacing4,
    alignItems: 'center',
  },

  // ヘッダーバナー（Web版 aspect-[21/9] 相当）
  banner: {
    width: '100%',
    aspectRatio: 21 / 9,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },

  // 2カラムグリッド
  gridContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: CARD_GAP,
  },
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // 病害虫カード（Web版 DiseasePestList のグリッドカードに合わせた）
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
    height: CARD_IMAGE_SIZE,
    backgroundColor: colorSurfaceMuted,
  },
  cardImage: {
    width: '100%',
    height: CARD_IMAGE_SIZE,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: CARD_IMAGE_SIZE,
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing2,
  },
  cardName: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
    flex: 1,
  },
  categoryBadge: {
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    flexShrink: 0,
  },
  categoryBadgeText: {
    ...textXs,
    fontWeight: '600',
  },
  cardDesc: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
});
