/**
 * @module app/pesticides/ingredients/index
 * 農薬有効成分（原体）一覧画面。
 * Web 版 /pesticides/ingredients に準拠。検索フォーム + 1カラムリスト。
 * 仕様: docs/design/pesticides-web-parity.md §4-5
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
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePesticideIngredientsQuery } from '@/lib/queries/pesticides';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
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
  colorTextLink,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusSm,
  radiusMd,
  shadowWashi,
  textBase,
  textMd,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type IngredientItem = components['schemas']['IngredientItem'];

// ---------------------------------------------------------------------------
// リストアイテムコンポーネント
// ---------------------------------------------------------------------------

type IngredientCellProps = {
  item: IngredientItem;
};

const IngredientCell = memo(function IngredientCell({ item }: IngredientCellProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/pesticides/ingredients/[slug]', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}の詳細を見る`}
    >
      <View style={styles.cellMain}>
        <Text style={styles.cellName} numberOfLines={1}>{item.name}</Text>
        {item.nameEn !== null && (
          <Text style={styles.cellNameEn} numberOfLines={1}>{item.nameEn}</Text>
        )}
      </View>
      <View style={styles.cellMeta}>
        {item.fracCode !== null && (
          <View style={styles.codeTag}>
            <Text style={styles.codeTagText}>FRAC: {item.fracCode}</Text>
          </View>
        )}
        {item.iracCode !== null && (
          <View style={styles.codeTag}>
            <Text style={styles.codeTagText}>IRAC: {item.iracCode}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function IngredientsIndexScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePesticideIngredientsQuery({
    search: submittedSearch.length > 0 ? submittedSearch : undefined,
  });

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    setSubmittedSearch(searchInput);
  }, [searchInput]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: IngredientItem }) => <IngredientCell item={item} />,
    []
  );

  const keyExtractor = useCallback((item: IngredientItem) => item.id, []);

  const ListFooter = useCallback(() =>
    isFetchingNextPage ? (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    ) : null,
  [isFetchingNextPage]);

  const ListHeader = (
    <View style={styles.listHeader}>
      <PesticideDisclaimer />
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="原体名・FRAC/IRACコードで検索..."
          placeholderTextColor={colorTextSecondary}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          accessibilityLabel="有効成分名またはFRAC/IRACコードで検索"
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
    </View>
  );

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '有効成分（原体）一覧', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '有効成分（原体）一覧', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="有効成分を読み込めませんでした。"
          description={ERR_PESTICIDES_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '有効成分（原体）一覧', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <ScreenEmpty
            title="該当する有効成分が見つかりませんでした"
            iconName="flask-outline"
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

  // リストアイテム
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    marginBottom: spacing3,
    minHeight: 64,
    ...shadowWashi,
  },
  cellMain: {
    flex: 1,
    gap: spacing2,
  },
  cellName: {
    ...textMd,
    color: colorTextLink,
    fontFamily: fontFamilySerifBold,
  },
  cellNameEn: {
    ...textXs,
    color: colorTextSecondary,
  },
  cellMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
    flexShrink: 0,
    alignItems: 'center',
  },
  codeTag: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  codeTagText: {
    ...textXs,
    color: colorTextSecondary,
  },
});
