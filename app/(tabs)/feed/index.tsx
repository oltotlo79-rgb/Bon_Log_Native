import React, { useCallback } from 'react';
import { FlatList, View, StyleSheet, Pressable, Platform, RefreshControl } from 'react-native';
import { Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorBorderLight,
  colorFab,
  colorFabText,
  colorActionPrimary,
  spacing4,
  spacing5,
  textLg,
  letterSpacingWidest,
  radiusFull,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';
import { ROUTE_POST_NEW, ROUTE_SEARCH, routePostDetail } from '@/lib/constants/routes';
import { ERR_FEED_LOAD_FAILED } from '@/lib/constants/errors';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { PostCard } from '@/components/post/PostCard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useFeedQuery, type FeedItem } from '@/lib/queries/feed';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import { useCurrentUserQuery } from '@/lib/queries/auth';

const TAB_BAR_HEIGHT = 60;
const FAB_SIZE = 56;
/** フィードアイテムの推定高さ（画像なし: 約140pt / 画像あり: 約280pt の中間値）*/
const ESTIMATED_ITEM_HEIGHT = 200;

// ---------------------------------------------------------------------------
// フィードアイテムコンポーネント（memo 化で FlatList 内の不要な再レンダリングを防ぐ）
// ---------------------------------------------------------------------------

type FeedItemCellProps = {
  item: FeedItem;
  currentUserId: string | undefined;
  onPressPost: (id: string) => void;
};

const FeedItemCell = React.memo(function FeedItemCell({
  item,
  currentUserId,
  onPressPost,
}: FeedItemCellProps) {
  const handleComment = useCallback(() => {
    onPressPost(item.id);
  }, [item.id, onPressPost]);

  const props = mapToPostCardProps(item, currentUserId, {
    onComment: handleComment,
  });

  return <PostCard {...props} />;
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useFeedQuery();

  const { data: me } = useCurrentUserQuery();
  const currentUserId = me?.id;

  const fabBottom =
    TAB_BAR_HEIGHT +
    (Platform.OS === 'android' ? insets.bottom : 0) +
    spacing4;

  const handlePressFab = useCallback(() => {
    router.push(ROUTE_POST_NEW);
  }, []);

  const handleSearchAction = useCallback(() => {
    router.push(ROUTE_SEARCH);
  }, []);

  const handlePressPost = useCallback((id: string) => {
    router.push(routePostDetail(id));
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedItemCell
        item={item}
        currentUserId={currentUserId}
        onPressPost={handlePressPost}
      />
    ),
    [currentUserId, handlePressPost]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<FeedItem> | null | undefined, index: number) => ({
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  function renderContent() {
    if (isLoading) {
      return <ScreenLoading variant="skeleton" skeletonCount={3} />;
    }

    if (isError) {
      return (
        <ScreenError
          title="読み込めませんでした"
          description={ERR_FEED_LOAD_FAILED}
          onRetry={refetch}
        />
      );
    }

    if (items.length === 0) {
      return (
        <ScreenEmpty
          variant="feed"
          title="タイムラインに投稿がありません"
          description="ユーザーをフォローすると、その人の投稿がここに表示されます"
          actionLabel="ユーザーを検索"
          onAction={handleSearchAction}
        />
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={colorActionPrimary}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ScreenLoading variant="spinner" />
            </View>
          ) : null
        }
        testID="feed-list"
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          ホーム
        </Text>
      </View>

      {renderContent()}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabBottom },
          shadowWashiLg,
          pressed && styles.fabPressed,
        ]}
        onPress={handlePressFab}
        accessibilityRole="button"
        accessibilityLabel="新規投稿"
        hitSlop={spacing5}
      >
        <Ionicons name="add" size={28} color={colorFabText} />
      </Pressable>
    </SafeAreaView>
  );
}

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
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: TAB_BAR_HEIGHT + spacing4,
  },
  footerLoading: {
    height: 60,
  },
  fab: {
    position: 'absolute',
    right: spacing4,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorFab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.85,
  },
});
