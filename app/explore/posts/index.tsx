/**
 * @module app/explore/posts/index
 * ハッシュタグまたはジャンル別の投稿一覧画面。
 * useLocalSearchParams から hashtag か genreId を受け取り、
 * useExplorePostsQuery で無限スクロール取得する。
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExplorePostsQuery, type ExplorePostsResponse } from '@/lib/queries/explore';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import { PostCard } from '@/components/post/PostCard';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ERR_EXPLORE_LOAD_FAILED } from '@/lib/constants/errors';
import { routePostDetail } from '@/lib/constants/routes';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  spacing4,
  spacing2,
  textLg,
  textSm,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import type { ExplorePostsParams } from '@/lib/queries/keys';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** フィードアイテムの推定高さ（画像なし: 約140pt / 画像あり: 約280pt の中間値）*/
const ESTIMATED_ITEM_HEIGHT = 200;
const LOAD_MORE_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type ExplorePostItem = ExplorePostsResponse['items'][number];

// ---------------------------------------------------------------------------
// 投稿アイテムセル（memo で FlatList 内再レンダリングを防ぐ）
// ---------------------------------------------------------------------------

type ExplorePostCellProps = {
  item: ExplorePostItem;
  currentUserId: string | undefined;
  onPressPost: (id: string) => void;
};

const ExplorePostCell = React.memo(function ExplorePostCell({
  item,
  currentUserId,
  onPressPost,
}: ExplorePostCellProps) {
  const handleComment = useCallback(() => {
    onPressPost(item.id);
  }, [item.id, onPressPost]);

  const props = mapToPostCardProps(item, currentUserId, { onComment: handleComment });
  return <PostCard {...props} />;
});

// ---------------------------------------------------------------------------
// params の型ガード
// ---------------------------------------------------------------------------

/**
 * useLocalSearchParams の値は string | string[] のため型ガードで string に絞る。
 * string[] が来た場合は最初の要素を使う。
 */
function toSafeString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * params から ExplorePostsParams を構築する。
 * hashtag が存在する場合はハッシュタグ優先、なければ genreId を使う。
 * 両方ない場合は null（呼び出し側でガード）。
 */
function buildExploreParams(
  hashtag: string | undefined,
  genreId: string | undefined
): ExplorePostsParams | null {
  if (hashtag !== undefined && hashtag.length > 0) {
    return { hashtag };
  }
  if (genreId !== undefined && genreId.length > 0) {
    return { genreId };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ExplorePostsScreen() {
  const rawParams = useLocalSearchParams();
  const isOnline = useOnlineStatus();
  const { data: me } = useCurrentUserQuery();
  const currentUserId = me?.id;

  const hashtag = toSafeString(rawParams.hashtag);
  const genreId = toSafeString(rawParams.genreId);
  const exploreParams = buildExploreParams(hashtag, genreId);

  const isHashtag = hashtag !== undefined && hashtag.length > 0;
  const headerTitle = isHashtag
    ? `#${hashtag ?? ''}`
    : (genreId !== undefined && genreId.length > 0 ? (toSafeString(rawParams.genreName) ?? 'ジャンル') : '投稿一覧');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useExplorePostsQuery(
    // exploreParams が null の場合はダミーで hashtag='' を渡す（画面表示直後にエラーになるが許容）
    exploreParams ?? { hashtag: '' }
  );

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  const handlePressPost = useCallback((id: string) => {
    router.push(routePostDetail(id));
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: ExplorePostItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ExplorePostItem }) => (
      <ExplorePostCell
        item={item}
        currentUserId={currentUserId}
        onPressPost={handlePressPost}
      />
    ),
    [currentUserId, handlePressPost]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<ExplorePostItem> | null | undefined, index: number) => ({
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  function renderContent() {
    if (exploreParams === null) {
      return (
        <ScreenError
          title="パラメータが不正です"
          description="タグまたはジャンルを指定して再度お試しください。"
          onRetry={() => router.back()}
          retryLabel="戻る"
        />
      );
    }

    if (isLoading) {
      return <ScreenLoading variant="skeleton" skeletonCount={3} />;
    }

    if (isError) {
      return (
        <ScreenError
          title="読み込めませんでした"
          description={ERR_EXPLORE_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      );
    }

    if (allItems.length === 0) {
      return (
        <ScreenEmpty
          iconName="leaf-outline"
          title="投稿がありません"
          description="このタグ・ジャンルの投稿はまだありません"
        />
      );
    }

    return (
      <FlatList
        data={allItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={LOAD_MORE_THRESHOLD}
        getItemLayout={getItemLayout}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => void refetch()}
            tintColor={colorActionPrimary}
          />
        }
        accessibilityRole="list"
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colorTextPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
            {headerTitle}
          </Text>
          {!isLoading && !isError && allItems.length > 0 && (
            <Text style={styles.headerCount}>
              {allItems.length}件以上
            </Text>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      {renderContent()}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing2,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
  },
  headerCount: {
    ...textSm,
    color: colorTextSecondary,
  },
  headerRight: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing4,
  },
  footer: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },
});
