/**
 * @module components/profile/UserPostsList
 * ユーザーの投稿一覧。プロフィール画面（自分・他人）で共用する。
 * FlatList の ListHeaderComponent としてプロフィールヘッダーを受け取り、
 * 投稿を無限スクロールで並べる。4状態（ローディング・空・エラー・オフライン）を持つ。
 *
 * onEndReached 閾値 0.5 は FlatList が残り半画面に来たときに次ページを取得する。
 * データが空で isPublic=false かつ非フォロワーのときは PrivateAccountNotice を描画側で判断する必要があるため、
 * emptyComponent を prop で受け取りカスタマイズできるようにしている。
 */

import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useUserPostsQuery, type PostResponse } from '@/lib/queries/posts';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import { PostCard } from '@/components/post/PostCard';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { isApiError } from '@/lib/api/errors';
import {
  colorActionPrimary,
  spacing4,
  spacing6,
} from '@/lib/constants/design-tokens';
import { ERR_POST_LOAD_FAILED, ERR_FORBIDDEN } from '@/lib/constants/errors';
import { routePostDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** FlatList の onEndReachedThreshold に渡す閾値 */
const END_REACHED_THRESHOLD = 0.5;

/** リストアイテムの推定高さ（画像なし: 約140pt / 画像あり: 約280pt の中間値）*/
const ESTIMATED_ITEM_HEIGHT = 200;

// ---------------------------------------------------------------------------
// アイテムセル（memo 化で FlatList 内の不要な再レンダリングを防ぐ）
// ---------------------------------------------------------------------------

type PostCellProps = {
  item: PostResponse;
  currentUserId: string | undefined;
};

const PostCell = React.memo(function PostCell({
  item,
  currentUserId,
}: PostCellProps) {
  const handleComment = useCallback(() => {
    router.push(routePostDetail(item.id));
  }, [item.id]);

  const props = mapToPostCardProps(item, currentUserId, {
    onComment: handleComment,
  });

  return <PostCard {...props} />;
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UserPostsListProps = {
  userId: string;
  currentUserId: string | undefined;
  /** FlatList の ListHeaderComponent に渡すプロフィールヘッダー要素 */
  ListHeaderComponent: React.ReactElement;
  /**
   * 投稿が 0 件のときに表示するコンポーネント。
   * 非公開アカウント通知や自分向けの「投稿する」ボタンなど、
   * 呼び出し元の文脈でカスタマイズできるようにする。
   */
  emptyComponent: React.ReactElement;
  isOffline: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserPostsList({
  userId,
  currentUserId,
  ListHeaderComponent,
  emptyComponent,
  isOffline,
}: UserPostsListProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useUserPostsQuery(userId);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: PostResponse) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: PostResponse }) => (
      <PostCell item={item} currentUserId={currentUserId} />
    ),
    [currentUserId]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<PostResponse> | null | undefined, index: number) => ({
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // ローディング中はリストヘッダーのみ見せてスピナーをフッターに出す
  if (isLoading) {
    return (
      <FlatList
        data={[]}
        keyExtractor={keyExtractor}
        renderItem={null}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={<ScreenLoading variant="skeleton" skeletonCount={3} />}
        contentContainerStyle={styles.listContent}
      />
    );
  }

  if (isError) {
    const isForbidden = isApiError(error) && error.code === 'GUEST_NOT_ALLOWED';
    return (
      <FlatList
        data={[]}
        keyExtractor={keyExtractor}
        renderItem={null}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          <ScreenError
            title="読み込めませんでした"
            description={isForbidden ? ERR_FORBIDDEN : ERR_POST_LOAD_FAILED}
            onRetry={handleRefetch}
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={handleRefetch}
            tintColor={colorActionPrimary}
            accessibilityLabel="引き下げて更新"
          />
        }
      />
    );
  }

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={emptyComponent}
      contentContainerStyle={styles.listContent}
      onEndReached={handleEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      getItemLayout={getItemLayout}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={handleRefetch}
          tintColor={colorActionPrimary}
          accessibilityLabel="引き下げて更新"
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoading}>
            <ScreenLoading variant="spinner" />
          </View>
        ) : null
      }
    />
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing6,
    flexGrow: 1,
  },
  footerLoading: {
    height: 60,
  },
});
