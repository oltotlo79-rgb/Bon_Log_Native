/**
 * @module lib/queries/hormones
 * 植物ホルモンのクエリフック。
 * 一覧・相互作用・技法・シミュレーターは全件返却（ページネーションなし）。
 * コラムはカーソルページネーション。詳細は slug 指定。ゲスト可。
 */

import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_MASTER, STALE_TIME_LONG } from '@/lib/constants/query';
import { HORMONE_COLUMNS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';
import type { paths } from '@/lib/api/client';

export type HormoneDetail = components['schemas']['HormoneDetail'];
export type HormoneInteractionListResponse = components['schemas']['HormoneInteractionListResponse'];
export type HormoneTechniqueListResponse = components['schemas']['HormoneTechniqueListResponse'];
export type HormoneSimulatorResponse = components['schemas']['HormoneSimulatorResponse'];
export type HormoneColumnListResponse = components['schemas']['HormoneColumnListResponse'];
export type HormoneColumnDetail = components['schemas']['HormoneColumnDetail'];

type HormonesResponse =
  paths['/api/v1/hormones']['get']['responses']['200']['content']['application/json'];

export function useHormonesQuery(category?: string) {
  return useQuery<HormonesResponse, Error>({
    queryKey: queryKeys.hormones.list(category),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/hormones', {
        params: {
          query: { category: category ?? undefined },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormones');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
  });
}

export function useHormoneDetailQuery(slug: string) {
  return useQuery<HormoneDetail, Error>({
    queryKey: queryKeys.hormones.detail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/hormones/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormone detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// 相互作用（interactions）— ページネーションなし
// ---------------------------------------------------------------------------

export function useHormoneInteractionsQuery() {
  return useQuery<HormoneInteractionListResponse, Error>({
    queryKey: queryKeys.hormones.interactions,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/hormones/interactions');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormone interactions');
      }
      return data;
    },
    staleTime: STALE_TIME_LONG,
  });
}

// ---------------------------------------------------------------------------
// 技法（techniques）— ページネーションなし・techniqueKey 単位グループ化
// ---------------------------------------------------------------------------

export function useHormoneTechniquesQuery() {
  return useQuery<HormoneTechniqueListResponse, Error>({
    queryKey: queryKeys.hormones.techniques,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/hormones/techniques');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormone techniques');
      }
      return data;
    },
    staleTime: STALE_TIME_LONG,
  });
}

// ---------------------------------------------------------------------------
// シミュレーター全データ（simulator）— ページネーションなし
// ---------------------------------------------------------------------------

export function useHormoneSimulatorQuery() {
  return useQuery<HormoneSimulatorResponse, Error>({
    queryKey: queryKeys.hormones.simulator,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/hormones/simulator');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormone simulator data');
      }
      return data;
    },
    staleTime: STALE_TIME_LONG,
  });
}

// ---------------------------------------------------------------------------
// ホルモンコラム（columns）
// ---------------------------------------------------------------------------

export function useHormoneColumnsQuery() {
  return useInfiniteQuery<
    HormoneColumnListResponse,
    Error,
    InfiniteData<HormoneColumnListResponse>,
    typeof queryKeys.hormones.columns,
    string | undefined
  >({
    queryKey: queryKeys.hormones.columns,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/hormones/columns', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: HORMONE_COLUMNS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormone columns');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MASTER,
  });
}

export function useHormoneColumnDetailQuery(slug: string) {
  return useQuery<HormoneColumnDetail, Error>({
    queryKey: queryKeys.hormones.columnDetail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/hormones/columns/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormone column detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}
