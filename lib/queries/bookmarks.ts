/**
 * @module lib/queries/bookmarks
 * ブックマーク操作（トグル・一覧取得）フック。
 * ブックマーク一覧はフィード投稿と同等の形式で返される。
 */

import { useMutation, useInfiniteQuery, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { BOOKMARKS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

type BookmarkResponse = components['schemas']['BookmarkResponse'];
type BookmarksListResponse = components['schemas']['BookmarksListResponse'];
type FeedResponse = components['schemas']['FeedResponse'];
type PostResponse = components['schemas']['PostResponse'];
type SearchPostsResponse = components['schemas']['SearchPostsResponse'];

export type ToggleBookmarkParams = {
  postId: string;
  /** 操作前のブックマーク状態。true → 解除(DELETE)、false → 追加(POST) */
  currentlyBookmarked: boolean;
};

/** 楽観更新のロールバック用スナップショット型 */
type BookmarkSnapshot = {
  feedData: InfiniteData<FeedResponse> | undefined;
  detailData: PostResponse | undefined;
  bookmarksData: InfiniteData<BookmarksListResponse> | undefined;
  searchSnapshot: [QueryKey, InfiniteData<SearchPostsResponse>][];
};

/**
 * ブックマークをトグルするミューテーション。
 * いいね（likes.ts）の楽観更新パターンに倣い、フィード・詳細・ブックマーク一覧・検索結果を楽観更新する。
 * onSettled: posts.detail(postId) と bookmarks.list() を invalidate する。
 *
 * invalidation-map.md 参照: ブックマーク → 楽観更新 + onSettled で posts.detail と bookmarks.list を invalidate。
 */
export function useToggleBookmarkMutation() {
  const queryClient = useQueryClient();

  return useMutation<BookmarkResponse, Error, ToggleBookmarkParams, BookmarkSnapshot>({
    mutationFn: async ({ postId, currentlyBookmarked }) => {
      if (currentlyBookmarked) {
        const { data, error } = await apiClient.DELETE('/api/v1/posts/{id}/bookmark', {
          params: { path: { id: postId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error removing bookmark');
        }
        return data;
      } else {
        const { data, error } = await apiClient.POST('/api/v1/posts/{id}/bookmark', {
          params: { path: { id: postId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error adding bookmark');
        }
        return data;
      }
    },

    onMutate: async ({ postId, currentlyBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.feed() });
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.bookmarks.list() });
      await queryClient.cancelQueries({ queryKey: queryKeys.search.all });

      const feedData = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed());
      const detailData = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail(postId));
      const bookmarksData = queryClient.getQueryData<InfiniteData<BookmarksListResponse>>(queryKeys.bookmarks.list());

      const allSearchCache = queryClient.getQueriesData<InfiniteData<SearchPostsResponse>>({
        queryKey: queryKeys.search.all,
      });
      const searchSnapshot: [QueryKey, InfiniteData<SearchPostsResponse>][] = allSearchCache
        .filter((entry): entry is [QueryKey, InfiniteData<SearchPostsResponse>] => entry[1] !== undefined);

      const newBookmarked = !currentlyBookmarked;

      if (feedData !== undefined) {
        queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed(), {
          ...feedData,
          pages: feedData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === postId ? { ...item, isBookmarked: newBookmarked } : item
            ),
          })),
        });
      }

      if (detailData !== undefined) {
        queryClient.setQueryData<PostResponse>(queryKeys.posts.detail(postId), {
          ...detailData,
          isBookmarked: newBookmarked,
        });
      }

      // ブックマーク解除時はブックマーク一覧から該当アイテムを楽観的に除去する
      if (bookmarksData !== undefined && currentlyBookmarked) {
        queryClient.setQueryData<InfiniteData<BookmarksListResponse>>(queryKeys.bookmarks.list(), {
          ...bookmarksData,
          pages: bookmarksData.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== postId),
          })),
        });
      }

      for (const [key, data] of allSearchCache) {
        if (data === undefined) continue;
        queryClient.setQueryData<InfiniteData<SearchPostsResponse>>(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === postId ? { ...item, isBookmarked: newBookmarked } : item
            ),
          })),
        });
      }

      return { feedData, detailData, bookmarksData, searchSnapshot };
    },

    onError: (_error, { postId }, snapshot) => {
      if (snapshot === undefined) return;

      if (snapshot.feedData !== undefined) {
        queryClient.setQueryData(queryKeys.posts.feed(), snapshot.feedData);
      }
      if (snapshot.detailData !== undefined) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), snapshot.detailData);
      }
      if (snapshot.bookmarksData !== undefined) {
        queryClient.setQueryData(queryKeys.bookmarks.list(), snapshot.bookmarksData);
      }
      for (const [key, data] of snapshot.searchSnapshot) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: (_data, _error, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.list() });
    },
  });
}

/**
 * 自分のブックマーク投稿一覧を取得する無限スクロールクエリ。
 * items は feed と同等の投稿形式（isBookmarked=true 付き）。
 */
export function useBookmarksQuery() {
  return useInfiniteQuery<
    BookmarksListResponse,
    Error,
    InfiniteData<BookmarksListResponse>,
    ReturnType<typeof queryKeys.bookmarks.list>,
    string | undefined
  >({
    queryKey: queryKeys.bookmarks.list(),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/me/bookmarks', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: BOOKMARKS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching bookmarks');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
  });
}
