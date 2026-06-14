/**
 * @module app/(tabs)/search/index
 * 検索画面 — 投稿・ユーザーの横断検索（search-screen.md §2 準拠）。
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
import { router } from 'expo-router';
import { useSearchPostsQuery, useSearchUsersQuery, type SearchPostItem, type SearchUserItem } from '@/lib/queries/search';
import { useDebounce } from '@/hooks/use-debounce';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { PostCard } from '@/components/post/PostCard';
import { UserResultItem, ITEM_MIN_HEIGHT } from '@/components/user/UserResultItem';
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

type SearchSegment = 'posts' | 'users';

const SEGMENT_TABS: { key: SearchSegment; label: string }[] = [
  { key: 'posts', label: '投稿' },
  { key: 'users', label: 'ユーザー' },
];


// ---------------------------------------------------------------------------
// SearchBar サブコンポーネント
// ---------------------------------------------------------------------------

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onClear: () => void;
};

function SearchBar({ value, onChangeText, onSubmit, onClear }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

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
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit(value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="ユーザーや投稿を検索..."
        placeholderTextColor={colorTextTertiary}
        returnKeyType="search"
        blurOnSubmit
        accessibilityRole="search"
        accessibilityLabel="ユーザーや投稿を検索"
        // Android のデフォルト下線を非表示にする
        underlineColorAndroid="transparent"
        // iOS はライトモード前提
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
  currentUserId: string | undefined;
};

function PostSearchResults({ query, currentUserId }: PostSearchResultsProps) {
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
  } = useSearchPostsQuery(query);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage === true && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

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

  if (posts.length === 0) {
    return (
      <ScreenEmpty
        iconName="search"
        title={`「${query}」の投稿は見つかりませんでした`}
        description="別のキーワードでお試しください"
      />
    );
  }

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

  return (
    <FlatList
      data={posts}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
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
};

function UserSearchResults({ query }: UserSearchResultsProps) {
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
        iconName="search"
        title={`「${query}」に一致するユーザーはいません`}
        description="別のキーワードでお試しください"
      />
    );
  }

  const renderItem = ({ item }: ListRenderItemInfo<SearchUserItem>) => (
    <UserResultItem user={item} onPress={handleUserPress} />
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

  const [inputValue, setInputValue] = useState('');
  const [activeSegment, setActiveSegment] = useState<SearchSegment>('posts');
  const isOffline = !useOnlineStatus();
  const textInputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebounce(inputValue, DEBOUNCE_SEARCH_MS);

  const activeQuery = debouncedQuery;

  const handleClear = useCallback(() => {
    setInputValue('');
    // クリア後もフォーカスを残す（search-screen.md §3.3）
    textInputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((text: string) => {
    // return 押下は debounce を待たず即時検索（debouncedQuery との差を setInputValue が埋める）
    setInputValue(text);
  }, []);

  const showInitialView = inputValue.length === 0 && debouncedQuery.length === 0;

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
        />
      </View>

      <View style={styles.body}>
        {showInitialView ? (
          <ScreenEmpty
            iconName="search"
            title="検索してみましょう"
            description="ニックネームやキーワードを入力してください"
          />
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
            ) : activeQuery.length > 0 ? (
              <View style={styles.resultsContainer}>
                {activeSegment === 'posts' ? (
                  <PostSearchResults
                    query={activeQuery}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <UserSearchResults
                    query={activeQuery}
                  />
                )}
              </View>
            ) : (
              // デバウンス待ち中のローディング
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
    // Android のデフォルト下線除去は TextInput の prop で制御
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
