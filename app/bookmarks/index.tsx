/**
 * @module app/bookmarks/index
 * ブックマーク一覧画面。
 * PostCard を流用し、フィードと同じ操作感を維持する。
 * 仕様: docs/design/bookmarks.md
 */

import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Text,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookmarksQuery } from '@/lib/queries/bookmarks';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { PostCard } from '@/components/post/PostCard';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Toast } from '@/components/common/Toast';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorBorderLight,
  spacing3,
  spacing4,
  spacing6,
  textLg,
} from '@/lib/constants/design-tokens';
import { ROUTE_FEED } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type BookmarkItem = components['schemas']['BookmarksListResponse']['items'][number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { toast, hideToast } = useToast();

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useBookmarksQuery();

  const { data: currentUser } = useCurrentUserQuery();

  const allItems: BookmarkItem[] = data?.pages.flatMap((page) => page.items as BookmarkItem[]) ?? [];

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: BookmarkItem }) => {
      const props = mapToPostCardProps(
        item,
        currentUser?.id,
        {
          onComment: () => {
            router.push({ pathname: '/posts/[id]', params: { id: item.id } });
          },
        },
      );
      return <PostCard {...props} />;
    },
    [currentUser?.id]
  );

  const keyExtractor = useCallback((item: BookmarkItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <BookmarksHeader />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <BookmarksHeader />
        <ScreenError
          title="読み込めませんでした"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />

      <BookmarksHeader />

      {allItems.length === 0 ? (
        <ScreenEmpty
          iconName="bookmark-outline"
          title="ブックマークがありません"
          description="投稿のブックマークボタンをタップすると、ここに保存されます。"
          actionLabel="フィードを見る"
          onAction={() => router.push(ROUTE_FEED)}
        />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing6 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={handleRefresh}
              tintColor={colorActionPrimary}
            />
          }
          accessibilityRole="list"
        />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

function BookmarksHeader() {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="戻る"
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backButtonText}>‹ 戻る</Text>
      </Pressable>
      <Text style={styles.headerTitle}>ブックマーク</Text>
      <View style={styles.headerRight} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 44,
  },
  backButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: colorTextSecondary,
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 60,
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
  },
  footer: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },
});
