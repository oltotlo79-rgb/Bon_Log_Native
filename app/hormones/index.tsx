/**
 * @module app/hormones/index
 * 植物ホルモン一覧画面。
 * 仕様: docs/design/browse-screens.md §4
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormonesQuery } from '@/lib/queries/hormones';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { CatalogListItem } from '@/components/browse/CatalogListItem';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
import { colorBackground, spacing6 } from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type HormoneItem = components['schemas']['HormoneItem'];

// ---------------------------------------------------------------------------
// HormoneCell
// ---------------------------------------------------------------------------

type HormoneCellProps = { item: HormoneItem };

const HormoneCell = memo(function HormoneCell({ item }: HormoneCellProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/hormones/[slug]/index', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <CatalogListItem
      title={item.name}
      subtitle={item.nameEn ?? undefined}
      categoryLabel={item.category}
      onPress={handlePress}
      accessibilityLabel={`${item.name}${item.nameEn !== null ? `（${item.nameEn}）` : ''}の詳細を見る`}
    />
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormonesScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useHormonesQuery();

  const renderItem = useCallback(({ item }: { item: HormoneItem }) => <HormoneCell item={item} />, []);
  const keyExtractor = useCallback((item: HormoneItem) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: '植物ホルモン', headerShown: true }} />

      <OfflineBanner isVisible={!isOnline} />

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError ? (
        <ScreenError
          title="植物ホルモン情報を読み込めませんでした。"
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : !data || data.length === 0 ? (
        <ScreenEmpty title="ホルモン情報はありません" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing6 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
});
