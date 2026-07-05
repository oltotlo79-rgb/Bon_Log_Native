/**
 * @module app/dictionary/index
 * 盆栽用語辞典一覧画面。検索・50音/カテゴリフィルタ・SectionList（50音行グルーピング）を提供する。
 * Web 版 TermList のレイアウト・配色に忠実に寄せている。
 */

import React, { useState, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDictionaryListQuery } from '@/lib/queries/dictionary';
import type { DictionaryListResponse } from '@/lib/queries/dictionary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { DictionaryTermCard } from '@/components/browse/DictionaryTermCard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_DICTIONARY_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorSurfaceWashi,
  colorSurfaceKinoko,
  colorSurface,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  radiusMd,
  textSm,
  textMd,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 静的定数
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 400;
const FILTER_CHIP_HEIGHT = 34;
const HEADER_IMAGE_HEIGHT = 96;

// バッジ・セクションヘッダの文字列
const LABEL_ALL = 'すべて';
const LABEL_OTHER_ROW = 'その他';

// 辞典カテゴリ（Web lib/constants/dictionary.ts の DICTIONARY_CATEGORIES に対応）
const DICT_CATEGORIES = [
  { key: '', label: LABEL_ALL },
  { key: '樹形', label: '樹形' },
  { key: '技術・作業', label: '技術・作業' },
  { key: '管理・育成', label: '管理・育成' },
  { key: '道具・用品', label: '道具・用品' },
  { key: '盆器・鉢', label: '盆器・鉢' },
  { key: '用土・肥料', label: '用土・肥料' },
  { key: '展示・鑑賞', label: '展示・鑑賞' },
] as const;

// URL パラメータで受け取ったカテゴリ名がリストに存在するか検証するためのセット
const VALID_CATEGORY_KEYS = new Set<string>(
  DICT_CATEGORIES.filter((c) => c.key !== '').map((c) => c.key)
);

// 五十音行（Web lib/constants/dictionary.ts の KANA_ROWS に対応）
const KANA_ROWS = [
  { label: 'あ行', pattern: /^[あいうえお]/ },
  { label: 'か行', pattern: /^[かきくけこが-ご]/ },
  { label: 'さ行', pattern: /^[さしすせそざ-ぞ]/ },
  { label: 'た行', pattern: /^[たちつてとだ-ど]/ },
  { label: 'な行', pattern: /^[なにぬねの]/ },
  { label: 'は行', pattern: /^[はひふへほば-ぼぱ-ぽ]/ },
  { label: 'ま行', pattern: /^[まみむめも]/ },
  { label: 'や行', pattern: /^[やゆよ]/ },
  { label: 'ら行', pattern: /^[らりるれろ]/ },
  { label: 'わ行', pattern: /^[わをん]/ },
] as const;

const KANA_ROW_LABELS = KANA_ROWS.map((r) => r.label);

type FilterMode = 'category' | 'kana';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type DictionaryItem = DictionaryListResponse['items'][number];

type SectionData = {
  title: string;
  data: DictionaryItem[];
};

// ---------------------------------------------------------------------------
// グルーピング
// ---------------------------------------------------------------------------

function groupByKanaRow(items: DictionaryItem[]): SectionData[] {
  const buckets = new Map<string, DictionaryItem[]>();

  for (const item of items) {
    const row = KANA_ROWS.find((r) => r.pattern.test(item.reading));
    const label = row?.label ?? LABEL_OTHER_ROW;
    const bucket = buckets.get(label);
    if (bucket !== undefined) {
      bucket.push(item);
    } else {
      buckets.set(label, [item]);
    }
  }

  // あいうえお順 → その他
  const orderedLabels = [...KANA_ROW_LABELS, LABEL_OTHER_ROW].filter((k) => buckets.has(k));
  return orderedLabels.map((label) => ({
    title: label,
    data: buckets.get(label) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// TermCardCell（memo化してSectionListのrenderItemへ渡す）
// ---------------------------------------------------------------------------

type TermCardCellProps = {
  item: DictionaryItem;
};

const TermCardCell = memo(function TermCardCell({ item }: TermCardCellProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/dictionary/[slug]', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <DictionaryTermCard
      term={item.term}
      reading={item.reading}
      category={item.category}
      description={item.description}
      onPress={handlePress}
      accessibilityLabel={`${item.term}（${item.reading}）- ${item.category}`}
    />
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DictionaryScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  // 詳細画面からのカテゴリリンクで渡される category パラメータを初期値に使う。
  // useLocalSearchParams は string | string[] を返すため型ガードで string に絞る。
  // 未知のカテゴリ名は無視して全件表示にする。
  const rawCategory = params['category'];
  const categoryParam = typeof rawCategory === 'string'
    ? rawCategory
    : Array.isArray(rawCategory)
      ? rawCategory[0] ?? ''
      : '';
  const initialCategory = VALID_CATEGORY_KEYS.has(categoryParam) ? categoryParam : '';

  const [filterMode, setFilterMode] = useState<FilterMode>('category');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
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

  const allItems = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const sections = useMemo(() => groupByKanaRow(allItems), [allItems]);

  const totalCount = allItems.length;

  const renderItem = useCallback(
    ({ item }: { item: DictionaryItem }) => <TermCardCell item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: DictionaryItem) => item.id, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const renderItemSeparator = useCallback(
    () => <View style={styles.itemSeparator} />,
    [],
  );

  const ListHeader = useMemo(
    () => (
      <View>
        {/* ヘッダーバナー画像 */}
        <Image
          source={require('@/assets/images/dictionary-header-mobile.webp')}
          style={styles.headerImage}
          contentFit="cover"
          accessibilityLabel=""
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        {/* タイトル・説明 */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>盆栽用語辞典</Text>
          <Text style={styles.subtitleText}>
            樹形・技術・管理・道具・用土など盆栽に関する用語を収録しています
          </Text>
        </View>
        {/* 件数 */}
        {totalCount > 0 && (
          <Text style={styles.countText}>{totalCount}件</Text>
        )}
      </View>
    ),
    [totalCount],
  );

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
          placeholder="用語・読み・説明文で検索…"
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
                const isSelected = selectedKana === kana.label;
                return (
                  <TouchableOpacity
                    key={kana.label}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedKana(isSelected ? '' : kana.label)}
                    hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={kana.label}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {kana.label}
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
      ) : sections.length === 0 ? (
        <>
          {ListHeader}
          <ScreenEmpty
            title={
              debouncedSearch.length > 0
                ? `「${debouncedSearch}」に一致する用語はありません`
                : '用語がありません'
            }
            description={debouncedSearch.length > 0 ? '別のキーワードでお試しください' : undefined}
          />
        </>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ItemSeparatorComponent={renderItemSeparator}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing6 },
          ]}
          stickySectionHeadersEnabled={false}
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
    backgroundColor: colorSurface,
  },
  searchBarContainer: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurfaceWashi,
  },
  searchInput: {
    height: 40,
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
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
  listContent: {
    paddingHorizontal: spacing4,
  },
  headerImage: {
    width: '100%',
    height: HEADER_IMAGE_HEIGHT,
    borderRadius: radiusMd,
    marginTop: spacing4,
    overflow: 'hidden',
  },
  titleBlock: {
    marginTop: spacing4,
    marginBottom: spacing3,
  },
  titleText: {
    ...textLg,
    color: colorTextPrimary,
    fontWeight: '700',
  },
  subtitleText: {
    ...textSm,
    color: colorTextSecondary,
    marginTop: spacing2,
  },
  countText: {
    ...textSm,
    color: colorTextTertiary,
    marginBottom: spacing3,
  },
  sectionHeader: {
    paddingTop: spacing6,
    paddingBottom: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    marginBottom: spacing3,
    backgroundColor: colorSurfaceKinoko,
  },
  sectionHeaderText: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '500',
  },
  itemSeparator: {
    height: spacing3,
  },
  listFooter: {
    padding: spacing4,
    alignItems: 'center',
  },
});
