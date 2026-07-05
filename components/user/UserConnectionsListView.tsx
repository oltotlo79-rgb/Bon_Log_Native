/**
 * @module components/user/UserConnectionsListView
 * フォロワー一覧・フォロー中一覧で共用する無限スクロールリストの表示部分。
 * データ取得（useUserFollowersQuery / useUserFollowingQuery）は呼び出し元の画面が行い、
 * このコンポーネントは4状態（ローディング・空・エラー・非公開）の描画のみを担う。
 *
 * query は useUserFollowersQuery の戻り値型を基準にしている。useUserFollowingQuery は
 * TQueryKey のみが異なり戻り値の構造は同一のため、そのまま渡せる。
 */

import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { UserConnectionRow, ITEM_MIN_HEIGHT } from '@/components/user/UserConnectionRow';
import { PrivateAccountNotice } from '@/components/common/PrivateAccountNotice';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { isApiError } from '@/lib/api/errors';
import type { useUserFollowersQuery, UserConnectionItem } from '@/lib/queries/follows';
import { colorActionPrimary, spacing6 } from '@/lib/constants/design-tokens';
import { ERR_PROFILE_LOAD_FAILED, ERR_USER_NOT_FOUND } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const END_REACHED_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UserConnectionsListViewProps = {
  query: ReturnType<typeof useUserFollowersQuery>;
  currentUserId: string | undefined;
  emptyTitle: string;
  /** 対象アカウントが非公開かつ非フォロワーからの閲覧のときに表示する案内文言 */
  privateNoticeDescription: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserConnectionsListView({
  query,
  currentUserId,
  emptyTitle,
  privateNoticeDescription,
}: UserConnectionsListViewProps) {
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
  } = query;

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: UserConnectionItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: UserConnectionItem }) => (
      <UserConnectionRow user={item} currentUserId={currentUserId} />
    ),
    [currentUserId]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<UserConnectionItem> | null | undefined, index: number) => ({
      length: ITEM_MIN_HEIGHT,
      offset: ITEM_MIN_HEIGHT * index,
      index,
    }),
    []
  );

  if (isLoading) {
    return <ScreenLoading variant="skeleton" skeletonCount={4} />;
  }

  if (isError) {
    // 非公開アカウントの非フォロワーアクセスは 403 + code=NOT_FOUND で返る（status で判別する）
    if (isApiError(error) && error.status === 403) {
      return <PrivateAccountNotice description={privateNoticeDescription} />;
    }
    const isNotFound = isApiError(error) && error.status === 404;
    return (
      <ScreenError
        title={isNotFound ? 'ユーザーが見つかりません' : '読み込めませんでした'}
        description={isNotFound ? ERR_USER_NOT_FOUND : ERR_PROFILE_LOAD_FAILED}
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
      ListEmptyComponent={<ScreenEmpty iconName="people-outline" title={emptyTitle} />}
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
    paddingBottom: spacing6,
    flexGrow: 1,
  },
  footerLoading: {
    height: 60,
  },
});
