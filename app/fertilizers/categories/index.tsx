/**
 * @module app/fertilizers/categories/index
 * 肥料カテゴリ比較画面。Web 版 /fertilizers/categories の再現。
 * 施肥トップのナビカード「肥料カテゴリ比較」からアクセスする独立画面。
 */

import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFertilizerCategoriesQuery } from '@/lib/queries/fertilizers';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { CategoryComparisonCard } from '@/components/fertilizer/CategoryComparisonCard';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import { colorBackground, spacing3, spacing4, spacing8 } from '@/lib/constants/design-tokens';

type FertilizerCategoryItem = components['schemas']['FertilizerCategoryItem'];

const ITEM_SEPARATOR_HEIGHT = spacing3;

function ItemSeparator() {
  return <View style={{ height: ITEM_SEPARATOR_HEIGHT }} />;
}

export default function FertilizerCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useFertilizerCategoriesQuery();

  const renderItem = useCallback(({ item }: { item: FertilizerCategoryItem }) => (
    <CategoryComparisonCard
      name={item.name}
      description={item.description}
      merit={item.merit}
      demerit={item.demerit}
      bonsaiUsage={item.bonsaiUsage}
    />
  ), []);

  const keyExtractor = useCallback((item: FertilizerCategoryItem) => item.code, []);

  if (isLoading) return <ScreenLoading variant="spinner" />;

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ title: '肥料カテゴリ比較', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="肥料カテゴリを読み込めませんでした。"
          description={ERR_FERTILIZERS_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  if (data === undefined || data.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: '肥料カテゴリ比較', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenEmpty title="データがありません" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '肥料カテゴリ比較', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <FlatList<FertilizerCategoryItem>
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        ListFooterComponent={
          <View style={styles.footer}>
            <FertilizerDisclaimer />
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
  },
  footer: {
    marginTop: spacing4,
  },
});
