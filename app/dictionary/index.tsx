/**
 * @module app/dictionary/index
 * 盆栽用語辞典一覧画面。検索・50音/カテゴリフィルタ・無限スクロールを提供する。
 * 仕様: docs/design/browse-screens.md §2
 */

import React, { useState, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDictionaryListQuery } from '@/lib/queries/dictionary';
import type { DictionaryListResponse } from '@/lib/queries/dictionary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { CatalogListItem } from '@/components/browse/CatalogListItem';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  ERR_DICTIONARY_LOAD_FAILED,
} from '@/lib/constants/errors';
import {
  colorSurfaceWashi,
  colorSurface,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorTextPrimary,
  colorTextSecondary,
  colorBorder,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  textSm,
  textMd,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 400;
const FILTER_CHIP_HEIGHT = 34;

const KANA_ROWS = ['ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'] as const;

// カテゴリは API から取得するが、辞典カテゴリは静的なためここで定義する
const DICT_CATEGORIES = [
  { key: '', label: 'すべて' },
  { key: 'tree_management', label: '樹木管理' },
  { key: 'tools', label: '道具' },
  { key: 'disease_pest', label: '病害虫' },
  { key: 'soil_pot', label: '土・鉢' },
  { key: 'style', label: '樹形' },
  { key: 'exhibition', label: '展示' },
  { key: 'other', label: 'その他' },
] as const;

type FilterMode = 'category' | 'kana';

// ---------------------------------------------------------------------------
// DictionaryCell
// ---------------------------------------------------------------------------

type DictionaryItem = DictionaryListResponse['items'][number];

type DictionaryCellProps = {
  item: DictionaryItem;
};

const DictionaryCell = memo(function DictionaryCell({ item }: DictionaryCellProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/dictionary/[slug]/index', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <CatalogListItem
      title={item.term}
      subtitle={item.reading}
      categoryLabel={item.category}
      onPress={handlePress}
      accessibilityLabel={`${item.term}（${item.reading}）`}
    />
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DictionaryScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const [filterMode, setFilterMode] = useState<FilterMode>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedKana, setSelectedKana] = useState('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useDictionaryListQuery({
    search: debouncedSearch || undefined,
    category: filterMode === 'category' ? selectedCategory || undefined : undefined,
    row: filterMode === 'kana' ? selectedKana || undefined : undefined,
  });

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, DEBOUNCE_MS);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: DictionaryItem }) => <DictionaryCell item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: DictionaryItem) => item.id, []);

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: '盆栽用語辞典', headerShown: true }} />

      <OfflineBanner isVisible={!isOnline} />

      {/* 検索バー */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="用語を検索..."
          placeholderTextColor={colorTextSecondary}
          value={searchText}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="用語を検索"
        />
      </View>

      {/* フィルタバー */}
      <View style={styles.filterBarContainer}>
        {/* カテゴリ / 五十音 切替タブ */}
        <View style={styles.filterTabRow}>
          {(['category', 'kana'] as const).map((mode) => {
            const isActive = filterMode === mode;
            const label = mode === 'category' ? 'カテゴリ' : '五十音';
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setFilterMode(mode)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={label}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* チップ行 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {filterMode === 'category'
            ? DICT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedCategory(cat.key)}
                    hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={cat.label}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : KANA_ROWS.map((kana) => {
                const isSelected = selectedKana === kana;
                return (
                  <TouchableOpacity
                    key={kana}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedKana(isSelected ? '' : kana)}
                    hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={kana}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {kana}
                    </Text>
                  </TouchableOpacity>
                );
              })}
        </ScrollView>
      </View>

      <View style={styles.separator} />

      {/* コンテンツ */}
      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError ? (
        <ScreenError
          title="用語を読み込めませんでした。"
          description={ERR_DICTIONARY_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <ScreenEmpty
          title={
            debouncedSearch.length > 0
              ? `「${debouncedSearch}」に一致する用語はありません`
              : '用語がありません'
          }
          description={debouncedSearch.length > 0 ? '別のキーワードでお試しください' : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooter}
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
    backgroundColor: '#ffffff',
  },
  searchBarContainer: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurfaceWashi,
  },
  searchInput: {
    height: 40,
    backgroundColor: colorSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorBorder,
    paddingHorizontal: spacing3,
    ...textMd,
    color: colorTextPrimary,
  },
  filterBarContainer: {
    backgroundColor: colorSurfaceWashi,
    paddingBottom: spacing2,
  },
  filterTabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing4,
    gap: spacing2,
    marginBottom: spacing2,
  },
  filterTab: {
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    borderRadius: radiusFull,
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  filterTabActive: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  filterTabText: {
    ...textSm,
    color: colorTextPrimary,
  },
  filterTabTextActive: {
    color: colorActionPrimaryText,
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing4,
    gap: spacing2,
  },
  chip: {
    height: FILTER_CHIP_HEIGHT,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    backgroundColor: colorSurface,
    borderRadius: radiusFull,
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  chipSelected: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  chipText: {
    ...textSm,
    color: colorTextPrimary,
  },
  chipTextSelected: {
    color: colorActionPrimaryText,
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
  },
  listFooter: {
    padding: spacing4,
    alignItems: 'center',
  },
});
