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
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusSm,
  radiusMd,
  textMd,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type DiseasePestItem = components['schemas']['DiseasePestItem'];
type PesticideItem = components['schemas']['PesticideItem'];
type IngredientItem = components['schemas']['IngredientItem'];

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
// セルコンポーネント
// ---------------------------------------------------------------------------

const THUMBNAIL_SIZE = 52;
const CHEVRON_SIZE = 16;

const DiseasePestCell = memo(function DiseasePestCell({ item }: { item: DiseasePestItem }) {
  const thumbnailUri = resolveApiImageUrl(item.imageUrl);

  const handlePress = useCallback(() => {
    router.push({ pathname: '/pesticides/disease-pests/[slug]', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <TouchableOpacity
      style={styles.diseasePestRow}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}の詳細を見る`}
    >
      <View style={styles.diseasePestThumbnailWrapper}>
        {thumbnailUri !== null ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.diseasePestThumbnail}
            contentFit="cover"
            accessibilityLabel={`${item.name}のサムネイル`}
          />
        ) : (
          <View style={styles.diseasePestThumbnailPlaceholder} />
        )}
      </View>
      <View style={styles.diseasePestContent}>
        <Text style={styles.diseasePestName} numberOfLines={1}>{item.name}</Text>
        {item.description !== null && (
          <Text style={styles.diseasePestDesc} numberOfLines={1}>{item.description}</Text>
        )}
        <View style={styles.diseasePestChip}>
          <Text style={styles.diseasePestChipText}>{item.category}</Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={CHEVRON_SIZE}
        color={colorTextTertiary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
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
      renderItem={({ item }) => <DiseasePestCell item={item} />}
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
  diseasePestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    gap: spacing3,
  },
  diseasePestThumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radiusMd,
    overflow: 'hidden',
    flexShrink: 0,
  },
  diseasePestThumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  diseasePestThumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    backgroundColor: colorSurfaceMuted,
  },
  diseasePestContent: {
    flex: 1,
    gap: spacing2,
  },
  diseasePestName: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  diseasePestDesc: {
    ...textSm,
    color: colorTextSecondary,
  },
  diseasePestChip: {
    alignSelf: 'flex-start',
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  diseasePestChipText: {
    ...textXs,
    color: colorTextSecondary,
  },
});
