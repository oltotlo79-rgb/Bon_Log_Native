/**
 * @module lib/queries/search
 * 投稿・ユーザー検索の無限スクロールクエリフック。
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { FEED_PAGE_SIZE, USERS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type SearchPostItem = components['schemas']['SearchPostsResponse']['items'][number];
export type SearchUserItem = components['schemas']['SearchUsersResponse']['items'][number];

/**
 * 投稿検索の無限スクロールクエリ。
 * q が空文字の場合はフェッチを行わない（enabled=false）。
 * ブロック済みユーザーの投稿はサーバー側で除外済み。
 */
export function useSearchPostsQuery(q: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.search.posts(q),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/search/posts', {
        params: {
          query: {
            q,
            cursor: pageParam ?? undefined,
            limit: FEED_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error searching posts');
      }
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: q.length > 0,
  });
}

/**
 * ユーザー検索の無限スクロールクエリ。
 * q が空文字の場合はフェッチを行わない（enabled=false）。
 * ブロック済みユーザーはサーバー側で除外済み。
 */
export function useSearchUsersQuery(q: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.search.users(q),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/search/users', {
        params: {
          query: {
            q,
            cursor: pageParam ?? undefined,
            limit: USERS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error searching users');
      }
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: q.length > 0,
  });
}
