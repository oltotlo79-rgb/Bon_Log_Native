/**
 * @module lib/queries/feed
 * タイムラインフィードの無限スクロールクエリフック。
 */

import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_REALTIME } from '@/lib/constants/query';
import { FEED_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type FeedItem = components['schemas']['FeedResponse']['items'][number];

type FeedResponse = components['schemas']['FeedResponse'];

/**
 * フィードの無限スクロールクエリ。
 * isGuest フラグはページデータ内に含まれる（FeedResponse.isGuest）。
 * ゲスト状態の分岐は frontend 側で pages[0].isGuest を参照すること。
 *
 * nextCursor が null（終端）の場合は getNextPageParam が undefined を返し、
 * TanStack Query が hasNextPage: false を設定する。
 */
export function useFeedQuery() {
  return useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, ReturnType<typeof queryKeys.posts.feed>, string | undefined>({
    queryKey: queryKeys.posts.feed(),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/feed', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: FEED_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching feed');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_REALTIME,
  });
}
