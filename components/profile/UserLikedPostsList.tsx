/**
 * @module components/profile/UserLikedPostsList
 * ユーザーがいいねした投稿一覧（Web版 app/(main)/users/[id]/likes/page.tsx 相当）。
 * PostCard で投稿を無限スクロール表示する。4状態（ローディング・空・エラー・非公開）を持つ。
 */

import React, { useCallback } from 'react';
import { FlatList, View, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useUserLikedPostsQuery, type PostResponse } from '@/lib/queries/posts';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import { PostCard } from '@/components/post/PostCard';
import { PrivateAccountNotice } from '@/components/common/PrivateAccountNotice';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { isApiError } from '@/lib/api/errors';
import {
  colorActionPrimary,
  spacing4,
  spacing6,
} from '@/lib/constants/design-tokens';
import { ERR_POST_LOAD_FAILED, ERR_USER_NOT_FOUND } from '@/lib/constants/errors';
import { routePostDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const END_REACHED_THRESHOLD = 0.5;

/** リストアイテムの推定高さ（UserPostsList と同一値）*/
const ESTIMATED_ITEM_HEIGHT = 200;

const PRIVATE_NOTICE_DESCRIPTION =
  'フォローリクエストが承認されると、いいねした投稿を閲覧できるようになります。';

// ---------------------------------------------------------------------------
// アイテムセル（memo 化で FlatList 内の不要な再レンダリングを防ぐ）
// ---------------------------------------------------------------------------

type PostCellProps = {
  item: PostResponse;
  currentUserId: string | undefined;
};

const PostCell = React.memo(function PostCell({ item, currentUserId }: PostCellProps) {
  const handleComment = useCallback(() => {
    router.push(routePostDetail(item.id));
  }, [item.id]);

  const props = mapToPostCardProps(item, currentUserId, { onComment: handleComment });

  return <PostCard {...props} />;
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UserLikedPostsListProps = {
  userId: string;
  currentUserId: string | undefined;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserLikedPostsList({ userId, currentUserId }: UserLikedPostsListProps) {
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
  } = useUserLikedPostsQuery(userId);

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

  if (isLoading) {
    return <ScreenLoading variant="skeleton" skeletonCount={3} />;
  }

  if (isError) {
    // 非公開アカウントの非フォロワーアクセスは 403 + code=NOT_FOUND で返る（status で判別する）
    if (isApiError(error) && error.status === 403) {
      return <PrivateAccountNotice description={PRIVATE_NOTICE_DESCRIPTION} />;
    }
    const isNotFound = isApiError(error) && error.status === 404;
    return (
      <ScreenError
        title={isNotFound ? 'ユーザーが見つかりません' : '読み込めませんでした'}
        description={isNotFound ? ERR_USER_NOT_FOUND : ERR_POST_LOAD_FAILED}
        onRetry={handleRefetch}
      />
    );
  }

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <ScreenEmpty iconName="heart-outline" title="いいねした投稿がありません" />
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
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
