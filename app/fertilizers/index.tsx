/**
 * @module app/fertilizers/index
 * 施肥ガイドトップ画面。栄養素・カテゴリ・樹種の3タブ構成。
 * 仕様: docs/design/browse-screens.md §3
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFertilizerNutrientsQuery,
  useFertilizerCategoriesQuery,
  useFertilizerTreeSpeciesQuery,
} from '@/lib/queries/fertilizers';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { CatalogTabs } from '@/components/browse/CatalogTabs';
import { CatalogListItem } from '@/components/browse/CatalogListItem';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  spacing3,
  spacing4,
  spacing6,
  textMd,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type NutrientItem = components['schemas']['NutrientItem'];
type FertilizerCategoryItem = components['schemas']['FertilizerCategoryItem'];
type TreeSpeciesItem = components['schemas']['TreeSpeciesItem'];

// ---------------------------------------------------------------------------
// タブ定義
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'nutrients', label: '栄養素' },
  { key: 'categories', label: 'カテゴリ' },
  { key: 'tree-species', label: '樹種' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ---------------------------------------------------------------------------
// 栄養素セル
// ---------------------------------------------------------------------------

type NutrientCellProps = { item: NutrientItem };

const NutrientCell = memo(function NutrientCell({ item }: NutrientCellProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/fertilizers/nutrients/[slug]/index', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <CatalogListItem
      prefix={item.symbol}
      title={item.name}
      subtitle={item.description ?? undefined}
      onPress={handlePress}
      accessibilityLabel={`${item.name}（${item.symbol}）の詳細を見る`}
    />
  );
});

// ---------------------------------------------------------------------------
// カテゴリセル（タップ先なし）
// ---------------------------------------------------------------------------

type CategoryCellProps = { item: FertilizerCategoryItem };

const CategoryCell = memo(function CategoryCell({ item }: CategoryCellProps) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryContent}>
        <Text style={styles.categoryName}>{item.name}</Text>
        {item.description !== null && (
          <Text style={styles.categoryDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 樹種セル
// ---------------------------------------------------------------------------

type TreeSpeciesCellProps = { item: TreeSpeciesItem };

const TreeSpeciesCell = memo(function TreeSpeciesCell({ item }: TreeSpeciesCellProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/fertilizers/tree-species/[slug]/index', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <CatalogListItem
      title={item.name}
      subtitle={item.fertilizingPolicy ?? undefined}
      categoryLabel={item.category}
      onPress={handlePress}
      accessibilityLabel={`${item.name}の施肥スケジュールを見る`}
    />
  );
});

// ---------------------------------------------------------------------------
// タブコンテンツ
// ---------------------------------------------------------------------------

function NutrientsTab({ isActive }: { isActive: boolean }) {
  const { data, isLoading, isError, refetch } = useFertilizerNutrientsQuery();
  const insets = useSafeAreaInsets();

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="施肥情報を読み込めませんでした。"
        description={ERR_FERTILIZERS_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!data || data.length === 0) {
    return <ScreenEmpty title="データがありません" />;
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NutrientCell item={item} />}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing6 }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
      }
    />
  );
}

function CategoriesTab({ isActive }: { isActive: boolean }) {
  const { data, isLoading, isError, refetch } = useFertilizerCategoriesQuery();
  const insets = useSafeAreaInsets();

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="施肥情報を読み込めませんでした。"
        description={ERR_FERTILIZERS_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!data || data.length === 0) {
    return <ScreenEmpty title="データがありません" />;
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.code}
      renderItem={({ item }) => <CategoryCell item={item} />}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing6 }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
      }
    />
  );
}

function TreeSpeciesTab({ isActive }: { isActive: boolean }) {
  const { data, isLoading, isError, refetch } = useFertilizerTreeSpeciesQuery();
  const insets = useSafeAreaInsets();

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="施肥情報を読み込めませんでした。"
        description={ERR_FERTILIZERS_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!data || data.length === 0) {
    return <ScreenEmpty title="データがありません" />;
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TreeSpeciesCell item={item} />}
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

export default function FertilizersScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<TabKey>('nutrients');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: '施肥ガイド', headerShown: true }} />

      <OfflineBanner isVisible={!isOnline} />

      <CatalogTabs
        tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
      />

      <View style={styles.content}>
        <NutrientsTab isActive={activeTab === 'nutrients'} />
        <CategoriesTab isActive={activeTab === 'categories'} />
        <TreeSpeciesTab isActive={activeTab === 'tree-species'} />
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  categoryContent: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  categoryDesc: {
    ...textSm,
    color: colorTextSecondary,
  },
});
