/**
 * @module lib/queries/dictionary
 * 盆栽用語辞典のクエリフック。
 * 一覧はカーソルページネーション（useInfiniteQuery）、詳細は useQuery。
 * ゲスト可。
 */

import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, type DictionaryListParams } from '@/lib/queries/keys';
import { STALE_TIME_MASTER } from '@/lib/constants/query';
import { DICTIONARY_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type DictionaryListResponse = components['schemas']['DictionaryListResponse'];
export type DictionaryDetailResponse = components['schemas']['DictionaryDetailResponse'];

export function useDictionaryListQuery(params: DictionaryListParams = {}) {
  return useInfiniteQuery<
    DictionaryListResponse,
    Error,
    InfiniteData<DictionaryListResponse>,
    ReturnType<typeof queryKeys.dictionary.list>,
    string | undefined
  >({
    queryKey: queryKeys.dictionary.list(params),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/dictionary', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: DICTIONARY_PAGE_SIZE,
            search: params.search ?? undefined,
            category: params.category ?? undefined,
            row: params.row ?? undefined,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching dictionary list');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MASTER,
  });
}

export function useDictionaryDetailQuery(slug: string) {
  return useQuery<DictionaryDetailResponse, Error>({
    queryKey: queryKeys.dictionary.detail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/dictionary/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching dictionary detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}
