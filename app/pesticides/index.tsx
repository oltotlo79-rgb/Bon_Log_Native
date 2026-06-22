/**
 * @module app/pesticides/index
 * 農薬・病害虫図鑑トップ画面。病害虫・農薬製品・農薬成分の3タブ無限スクロール。
 * 仕様: docs/design/browse-screens.md §5
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
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
import {
  colorBackground,
  colorActionPrimary,
  spacing4,
  spacing6,
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

const DiseasePestCell = memo(function DiseasePestCell({ item }: { item: DiseasePestItem }) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/pesticides/disease-pests/[slug]', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <CatalogListItem
      title={item.name}
      subtitle={item.description ?? undefined}
      categoryLabel={item.category}
      onPress={handlePress}
      accessibilityLabel={`${item.name}の詳細を見る`}
    />
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
});
