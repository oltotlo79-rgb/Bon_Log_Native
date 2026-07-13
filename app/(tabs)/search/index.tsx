/**
 * @module app/(tabs)/search/index
 * 検索画面 — 投稿・ユーザー・タグの横断検索（search-screen.md §2 準拠）。
 * 投稿タブにはジャンル/期間/いいね数/メディア種別フィルタを持つ。
 * タグタブはデバウンスしたハッシュタグ候補検索。
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSearchPostsQuery, useSearchUsersQuery, type SearchPostItem, type SearchUserItem } from '@/lib/queries/search';
import type { SearchPostsFilter } from '@/lib/queries/keys';
import { useDebounce } from '@/hooks/use-debounce';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { PostCard } from '@/components/post/PostCard';
import { UserResultItem, ITEM_MIN_HEIGHT } from '@/components/user/UserResultItem';
import { PostSearchFilterPanel } from '@/components/search/PostSearchFilterPanel';
import { HashtagSearchResults } from '@/components/search/HashtagSearchResults';
import { RecentSearchesPanel } from '@/components/search/RecentSearchesPanel';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  colorBorderLight,
  colorBorderFocus,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  textBase,
  textMd,
  textLg,
  textSm,
  letterSpacingTight,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { DEBOUNCE_SEARCH_MS } from '@/lib/constants/limits/ui';
import { ERR_SEARCH_FAILED, ERR_OFFLINE_ACTION } from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

type SearchSegment = 'posts' | 'users' | 'tags';

const SEGMENT_TABS: { key: SearchSegment; label: string }[] = [
  { key: 'posts', label: '投稿' },
  { key: 'users', label: 'ユーザー' },
  { key: 'tags', label: 'タグ' },
];

/**
 * useLocalSearchParams は string | string[] | undefined を返すため、
 * 単一値として扱う画面遷移パラメータ（q, genre）を string に絞り込む。
 */
function firstStringParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? '';
  return '';
}

// ---------------------------------------------------------------------------
// SearchBar サブコンポーネント
// ---------------------------------------------------------------------------

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onClear: () => void;
  /** 最近の検索パネルの表示判定に使うため、フォーカス状態を親へ通知する */
  onFocusChange?: (isFocused: boolean) => void;
  inputRef?: React.RefObject<TextInput | null>;
};

function SearchBar({ value, onChangeText, onSubmit, onClear, onFocusChange, inputRef }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);
  };

  return (
    <View
      style={[
        styles.searchBar,
        isFocused && styles.searchBarFocused,
      ]}
    >
      <Ionicons
        name="search"
        size={20}
        color={colorTextSecondary}
        style={styles.searchIcon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <TextInput
        ref={inputRef}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit(value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="投稿・ユーザー・タグを検索..."
        placeholderTextColor={colorTextTertiary}
        returnKeyType="search"
        blurOnSubmit
        accessibilityRole="search"
        accessibilityLabel="投稿・ユーザー・タグを検索"
        underlineColorAndroid="transparent"
        keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
      />
      {value.length > 0 && (
        <Pressable
          onPress={onClear}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="検索をクリア"
          style={styles.clearButton}
        >
          <Ionicons
            name="close-circle"
            size={16}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// セグメントタブ
// ---------------------------------------------------------------------------

type SearchSegmentTabsProps = {
  activeSegment: SearchSegment;
  onSelect: (segment: SearchSegment) => void;
};

function SearchSegmentTabs({ activeSegment, onSelect }: SearchSegmentTabsProps) {
  return (
    <View style={styles.segmentContainer}>
      {SEGMENT_TABS.map(({ key, label }) => {
        const isActive = activeSegment === key;
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.segmentTab,
              isActive && styles.segmentTabActive,
              pressed && styles.segmentTabPressed,
            ]}
            onPress={() => onSelect(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            <Text
              style={[
                styles.segmentLabel,
                isActive ? styles.segmentLabelActive : styles.segmentLabelInactive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 投稿検索結果
// ---------------------------------------------------------------------------

type PostSearchResultsProps = {
  query: string;
  filter: SearchPostsFilter;
  currentUserId: string | undefined;
  onFilterApply: (filter: SearchPostsFilter) => void;
  onFilterReset: () => void;
};

function PostSearchResults({
  query,
  filter,
  currentUserId,
  onFilterApply,
  onFilterReset,
}: PostSearchResultsProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useSearchPostsQuery(query, filter);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage === true && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  const renderItem = ({ item }: ListRenderItemInfo<SearchPostItem>) => {
    const props = mapToPostCardProps(
      item,
      currentUserId,
      {
        onComment: () => {
          router.push(routes.postDetail(item.id));
        },
      }
    );
    return <PostCard {...props} />;
  };

  const keyExtractor = (item: SearchPostItem) => item.id;

  const ListHeader = (
    <PostSearchFilterPanel
      currentFilter={filter}
      onApply={onFilterApply}
      onReset={onFilterReset}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.resultsContainer}>
        {ListHeader}
        <ScreenLoading variant="skeleton" skeletonCount={3} />
      </View>
    );
  }

  if (isError) {
    const debugMsg = error instanceof Error ? error.message : undefined;
    return (
      <View style={styles.resultsContainer}>
        {ListHeader}
        <ScreenError
          title="検索できませんでした"
          description={ERR_SEARCH_FAILED}
          onRetry={() => void refetch()}
          debugMessage={debugMsg}
        />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.resultsContainer}>
        {ListHeader}
        <ScreenEmpty
          variant="search"
          title={`「${query}」の投稿は見つかりませんでした`}
          description="フィルターを変えるか、別のキーワードでお試しください"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={ListHeader}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      keyboardDismissMode="on-drag"
      onEndReachedThreshold={0.3}
      onEndReached={handleLoadMore}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
          tintColor={colorActionPrimary}
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colorActionPrimary} />
            <Text style={styles.footerText}>読み込み中...</Text>
          </View>
        ) : !hasNextPage && posts.length > 0 ? (
          <Text style={styles.endText}>これ以上結果はありません</Text>
        ) : null
      }
    />
  );
}

// ---------------------------------------------------------------------------
// ユーザー検索結果
// ---------------------------------------------------------------------------

type UserSearchResultsProps = {
  query: string;
  currentUserId: string | undefined;
};

function UserSearchResults({ query, currentUserId }: UserSearchResultsProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useSearchUsersQuery(query);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage === true && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleUserPress = useCallback((userId: string) => {
    router.push(routes.userDetail(userId));
  }, []);

  const users = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return <ScreenLoading variant="skeleton" skeletonCount={3} />;
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

  if (users.length === 0) {
    return (
      <ScreenEmpty
        variant="search"
        title={`「${query}」に一致するユーザーはいません`}
        description="別のキーワードでお試しください"
      />
    );
  }

  const renderItem = ({ item }: ListRenderItemInfo<SearchUserItem>) => (
    <UserResultItem user={item} onPress={handleUserPress} currentUserId={currentUserId} />
  );

  const keyExtractor = (item: SearchUserItem) => item.id;

  return (
    <FlatList
      data={users}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.userListContent}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      keyboardDismissMode="on-drag"
      getItemLayout={(_data, index) => ({
        length: ITEM_MIN_HEIGHT + spacing3,
        offset: (ITEM_MIN_HEIGHT + spacing3) * index,
        index,
      })}
      onEndReachedThreshold={0.3}
      onEndReached={handleLoadMore}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
          tintColor={colorActionPrimary}
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colorActionPrimary} />
            <Text style={styles.footerText}>読み込み中...</Text>
          </View>
        ) : !hasNextPage && users.length > 0 ? (
          <Text style={styles.endText}>これ以上結果はありません</Text>
        ) : null
      }
    />
  );
}

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function SearchScreen() {
  const { data: me } = useCurrentUserQuery();
  const currentUserId = me?.id;

  // 投稿本文の #タグ タップ（routeSearchByQuery）やジャンルタグのタップ
  // （routeSearchByGenre）からの遷移で q / genre を初期値として受け取る（Web の
  // searchParams 扱いに準拠）。
  const params = useLocalSearchParams<{ q?: string | string[]; genre?: string | string[] }>();
  const initialQuery = firstStringParam(params.q);
  const initialGenreId = firstStringParam(params.genre);

  const [inputValue, setInputValue] = useState(initialQuery);
  const [activeSegment, setActiveSegment] = useState<SearchSegment>('posts');
  const [postFilter, setPostFilter] = useState<SearchPostsFilter>(
    initialGenreId.length > 0 ? { genreId: initialGenreId } : {}
  );
  const [isSearchBarFocused, setIsSearchBarFocused] = useState(false);
  const isOffline = !useOnlineStatus();
  const textInputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebounce(inputValue, DEBOUNCE_SEARCH_MS);

  const activeQuery = debouncedQuery;

  const {
    searches: recentSearches,
    add: addRecentSearch,
    removeOne: removeRecentSearch,
    clear: clearRecentSearches,
  } = useRecentSearches();

  const handleClear = useCallback(() => {
    setInputValue('');
    textInputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((text: string) => {
    setInputValue(text);
    addRecentSearch(text);
  }, [addRecentSearch]);

  const handleSelectRecentSearch = useCallback((query: string) => {
    setInputValue(query);
    addRecentSearch(query);
    textInputRef.current?.blur();
  }, [addRecentSearch]);

  const handleFilterApply = useCallback((filter: SearchPostsFilter) => {
    setPostFilter(filter);
  }, []);

  const handleFilterReset = useCallback(() => {
    setPostFilter({});
  }, []);

  // ジャンルフィルタが適用されている間は、クエリが空でも初期案内画面へ戻さない
  // （ジャンルタグタップ直後に投稿タブへ着地させる — Web の GenreFilter 挙動）。
  const hasGenreFilter = postFilter.genreId !== undefined;
  const showInitialView = inputValue.length === 0 && debouncedQuery.length === 0 && !hasGenreFilter;
  // 検索バーフォーカス中・未入力・履歴ありの時だけ最近の検索を出す（cfw SearchBar のドロップダウン条件と同じ）
  const showRecentSearches = isSearchBarFocused && inputValue.length === 0 && recentSearches.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={isOffline} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          検索
        </Text>
      </View>

      {/* 検索バー */}
      <View style={styles.searchBarContainer}>
        <SearchBar
          value={inputValue}
          onChangeText={setInputValue}
          onSubmit={handleSubmit}
          onClear={handleClear}
          onFocusChange={setIsSearchBarFocused}
          inputRef={textInputRef}
        />
      </View>

      <View style={styles.body}>
        {showInitialView ? (
          showRecentSearches ? (
            <RecentSearchesPanel
              searches={recentSearches}
              onSelect={handleSelectRecentSearch}
              onRemove={removeRecentSearch}
              onClearAll={clearRecentSearches}
            />
          ) : (
            <ScreenEmpty
              iconName="search"
              title="検索してみましょう"
              description="ニックネーム、キーワード、#タグを入力してください"
            />
          )
        ) : (
          <>
            <SearchSegmentTabs
              activeSegment={activeSegment}
              onSelect={setActiveSegment}
            />

            {isOffline ? (
              <ScreenEmpty
                iconName="cloud-offline-outline"
                title="オフライン中"
                description={ERR_OFFLINE_ACTION}
              />
            ) : activeQuery.length > 0 || activeSegment === 'tags' || (activeSegment === 'posts' && hasGenreFilter) ? (
              <View style={styles.resultsContainer}>
                {activeSegment === 'posts' ? (
                  <PostSearchResults
                    query={activeQuery}
                    filter={postFilter}
                    currentUserId={currentUserId}
                    onFilterApply={handleFilterApply}
                    onFilterReset={handleFilterReset}
                  />
                ) : activeSegment === 'users' ? (
                  <UserSearchResults
                    query={activeQuery}
                    currentUserId={currentUserId}
                  />
                ) : (
                  /* タグタブは入力値をそのまま渡す（内部でデバウンス処理） */
                  <HashtagSearchResults rawQuery={inputValue} />
                )}
              </View>
            ) : (
              /* デバウンス待ち中のローディング（タグタブ以外） */
              <ScreenLoading variant="skeleton" skeletonCount={3} />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  header: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
  },
  searchBarContainer: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorBackground,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
  },
  searchBarFocused: {
    backgroundColor: colorBackground,
    borderWidth: 2,
    borderColor: colorBorderFocus,
  },
  searchIcon: {
    marginRight: spacing2,
  },
  searchInput: {
    flex: 1,
    ...textBase,
    color: colorTextPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: spacing2,
    padding: spacing2,
  },
  body: {
    flex: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colorBackground,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  segmentTab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colorActionPrimary,
  },
  segmentTabPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  segmentLabel: {
    ...textMd,
    letterSpacing: letterSpacingTight,
  },
  segmentLabelActive: {
    color: colorTextPrimary,
    fontWeight: '700',
  },
  segmentLabelInactive: {
    color: colorTextSecondary,
    fontWeight: '400',
  },
  resultsContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing4,
    gap: spacing4,
  },
  userListContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing4,
    gap: spacing3,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing4,
    gap: spacing2,
  },
  footerText: {
    ...textSm,
    color: colorTextSecondary,
  },
  endText: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'center',
    paddingVertical: spacing4,
  },
});
