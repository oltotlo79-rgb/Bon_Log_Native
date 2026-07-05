/**
 * @module components/search/HashtagSearchResults
 * ハッシュタグ検索タブ。入力をデバウンスして候補一覧を表示し、タップで投稿一覧へ遷移する。
 * q が空の場合は Web の PopularTags 準拠で人気タグ上位 10 件を表示する。
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchHashtagsQuery } from '@/lib/queries/search';
import { useTrendingHashtagsQuery } from '@/lib/queries/explore';
import { useDebounce } from '@/hooks/use-debounce';
import { routeExplorePostsByHashtag } from '@/lib/constants/routes';
import { ERR_SEARCH_FAILED, ERR_EXPLORE_LOAD_FAILED } from '@/lib/constants/errors';
import { DEBOUNCE_SEARCH_MS } from '@/lib/constants/limits/ui';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  textMd,
  textXs,
} from '@/lib/constants/design-tokens';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const HASHTAG_SEARCH_LIMIT = 20;
const HASHTAG_ITEM_HEIGHT = 56;
const TAG_ICON_SIZE = 18;
const CHEVRON_SIZE = 16;

// ---------------------------------------------------------------------------
// ハッシュタグ行（検索候補・人気タグの両方で共用。両レスポンスとも { id, name, count } 形状）
// ---------------------------------------------------------------------------

type HashtagLike = {
  id: string;
  name: string;
  count: number;
};

type HashtagRowProps = {
  item: HashtagLike;
};

const HashtagRow = memo(function HashtagRow({ item }: HashtagRowProps) {
  const handlePress = useCallback(() => {
    router.push(routeExplorePostsByHashtag(item.name));
  }, [item.name]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`#${item.name} ${item.count}件の投稿を見る`}
    >
      <View style={styles.tagIconWrapper}>
        <Ionicons
          name="pricetag-outline"
          size={TAG_ICON_SIZE}
          color={colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <View style={styles.tagInfo}>
        <Text style={styles.tagName}>#{item.name}</Text>
        <Text style={styles.tagCount}>{item.count.toLocaleString('ja-JP')}件の投稿</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={CHEVRON_SIZE}
        color={colorTextTertiary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type HashtagSearchResultsProps = {
  rawQuery: string;
};

export function HashtagSearchResults({ rawQuery }: HashtagSearchResultsProps) {
  const debouncedQ = useDebounce(rawQuery, DEBOUNCE_SEARCH_MS);

  const { data, isLoading, isError, error, refetch } = useSearchHashtagsQuery(
    debouncedQ,
    HASHTAG_SEARCH_LIMIT
  );

  const trendingQuery = useTrendingHashtagsQuery();

  const items = data?.items ?? [];

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<HashtagLike>) => <HashtagRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: HashtagLike) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<HashtagLike> | null | undefined, index: number) => ({
      length: HASHTAG_ITEM_HEIGHT,
      offset: HASHTAG_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // 未入力時は Web の PopularTags（getPopularTags(10)）と同じく人気タグ上位 10 件を表示する
  if (rawQuery.length === 0) {
    const trendingItems = trendingQuery.data?.items ?? [];

    if (trendingQuery.isLoading) {
      return (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colorActionPrimary} />
        </View>
      );
    }

    if (trendingQuery.isError) {
      const debugMsg =
        trendingQuery.error instanceof Error ? trendingQuery.error.message : undefined;
      return (
        <ScreenError
          title="読み込めませんでした"
          description={ERR_EXPLORE_LOAD_FAILED}
          onRetry={() => void trendingQuery.refetch()}
          debugMessage={debugMsg}
        />
      );
    }

    if (trendingItems.length === 0) {
      return (
        <ScreenEmpty
          iconName="pricetag-outline"
          title="人気のタグはまだありません"
          description="投稿が増えるとここに人気のタグが表示されます"
        />
      );
    }

    return (
      <View style={styles.trendingContainer}>
        <Text style={styles.trendingTitle} accessibilityRole="header">
          人気のタグ
        </Text>
        <FlatList
          data={trendingItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          maxToRenderPerBatch={20}
          keyboardDismissMode="on-drag"
        />
      </View>
    );
  }

  if (debouncedQ.length === 0) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }

  if (isError) {
    const debugMsg = error instanceof Error ? error.message : undefined;
    return (
      <ScreenError
        title="検索できませんでした"
        description={ERR_SEARCH_FAILED}
        onRetry={() => void refetch()}
        debugMessage={debugMsg}
      />
    );
  }

  if (items.length === 0) {
    return (
      <ScreenEmpty
        variant="search"
        title={`「#${debouncedQ}」に一致するタグはありません`}
        description="別のキーワードでお試しください"
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      maxToRenderPerBatch={20}
      keyboardDismissMode="on-drag"
    />
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing4,
  },
  trendingContainer: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  trendingTitle: {
    ...textMd,
    fontWeight: '600',
    color: colorTextPrimary,
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing2,
  },
  listContent: {
    paddingTop: spacing3,
    paddingBottom: spacing4,
    backgroundColor: colorBackground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HASHTAG_ITEM_HEIGHT,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurface,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    gap: spacing3,
  },
  rowPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  tagIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tagInfo: {
    flex: 1,
    gap: 2,
  },
  tagName: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  tagCount: {
    ...textXs,
    color: colorTextSecondary,
  },
});
