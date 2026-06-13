/**
 * @module lib/queries/likes
 * いいねトグルミューテーションフック（楽観更新付き）。
 * currentlyLiked が true → DELETE（解除）、false → POST（付与）の出し分けを行う。
 */

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

type LikeResponse = components['schemas']['LikeResponse'];
type FeedResponse = components['schemas']['FeedResponse'];
type PostResponse = components['schemas']['PostResponse'];
type SearchPostsResponse = components['schemas']['SearchPostsResponse'];

export type ToggleLikeParams = {
  postId: string;
  /** 操作前のいいね状態。true → 解除(DELETE)、false → 付与(POST) */
  currentlyLiked: boolean;
};

/** 楽観更新のロールバック用スナップショット型 */
type LikeSnapshot = {
  feedData: InfiniteData<FeedResponse> | undefined;
  detailData: PostResponse | undefined;
  searchSnapshotMap: Map<string, InfiniteData<SearchPostsResponse>>;
};

/**
 * いいねをトグルするミューテーション。
 * onMutate: フィード・詳細・検索結果を楽観更新し、ロールバック用スナップショットを返す。
 * onSuccess: サーバー確定値（liked/likeCount）を詳細キャッシュに反映する。
 * onError: スナップショットからロールバックする。
 * onSettled: 詳細クエリのみ invalidate（フィード再取得は重いため setQueryData で確定反映済み）。
 *
 * invalidation-map.md 参照: いいねは楽観更新 + onSuccess での setQueryData を優先し、
 * 整合のため posts.detail(postId) のみ onSettled で invalidate する。
 */
export function useToggleLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation<LikeResponse, Error, ToggleLikeParams, LikeSnapshot>({
    mutationFn: async ({ postId, currentlyLiked }) => {
      if (currentlyLiked) {
        const { data, error } = await apiClient.DELETE('/api/v1/posts/{id}/like', {
          params: { path: { id: postId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error removing like');
        }
        return data;
      } else {
        const { data, error } = await apiClient.POST('/api/v1/posts/{id}/like', {
          params: { path: { id: postId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error adding like');
        }
        return data;
      }
    },

    onMutate: async ({ postId, currentlyLiked }) => {
      // 進行中のフェッチをキャンセルして楽観更新がリセットされないようにする
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.feed() });
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.search.all });

      // スナップショットを取得
      const feedData = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed());
      const detailData = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail(postId));

      // 検索キャッシュは複数クエリキーが存在するため全て収集する
      const searchSnapshotMap = new Map<string, InfiniteData<SearchPostsResponse>>();
      const searchCache = queryClient.getQueriesData<InfiniteData<SearchPostsResponse>>({
        queryKey: queryKeys.search.all,
      });
      for (const [key, data] of searchCache) {
        if (data !== undefined) {
          searchSnapshotMap.set(JSON.stringify(key), data);
        }
      }

      const likedDelta = currentlyLiked ? -1 : 1;

      // フィードの楽観更新
      if (feedData !== undefined) {
        queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed(), {
          ...feedData,
          pages: feedData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === postId
                ? { ...item, isLiked: !currentlyLiked, likeCount: item.likeCount + likedDelta }
                : item
            ),
          })),
        });
      }

      // 詳細の楽観更新
      if (detailData !== undefined) {
        queryClient.setQueryData<PostResponse>(queryKeys.posts.detail(postId), {
          ...detailData,
          isLiked: !currentlyLiked,
          likeCount: detailData.likeCount + likedDelta,
        });
      }

      // 検索結果の楽観更新
      for (const [key, data] of searchCache) {
        if (data !== undefined) {
          queryClient.setQueryData<InfiniteData<SearchPostsResponse>>(key, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === postId
                  ? { ...item, isLiked: !currentlyLiked, likeCount: item.likeCount + likedDelta }
                  : item
              ),
            })),
          });
        }
      }

      return { feedData, detailData, searchSnapshotMap };
    },

    onError: (_error, { postId }, snapshot) => {
      if (snapshot === undefined) return;

      if (snapshot.feedData !== undefined) {
        queryClient.setQueryData(queryKeys.posts.feed(), snapshot.feedData);
      }
      if (snapshot.detailData !== undefined) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), snapshot.detailData);
      }
      for (const [keyStr, data] of snapshot.searchSnapshotMap) {
        const key = JSON.parse(keyStr) as string[];
        queryClient.setQueryData(key, data);
      }
    },

    onSuccess: (response, { postId }) => {
      // サーバー確定値で詳細キャッシュを上書きする
      const detailData = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail(postId));
      if (detailData !== undefined) {
        queryClient.setQueryData<PostResponse>(queryKeys.posts.detail(postId), {
          ...detailData,
          isLiked: response.liked,
          likeCount: response.likeCount,
        });
      }

      // フィードキャッシュも確定値で上書きする
      const feedData = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed());
      if (feedData !== undefined) {
        queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed(), {
          ...feedData,
          pages: feedData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === postId
                ? { ...item, isLiked: response.liked, likeCount: response.likeCount }
                : item
            ),
          })),
        });
      }

      // setQueryData で確定値を書き込んだ後、整合のため詳細のみ invalidate する。
      // フィードの再取得は重いため invalidate しない（setQueryData で確定反映済み）。
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}
