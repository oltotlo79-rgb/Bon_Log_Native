/**
 * @module lib/queries/fertilizers
 * 施肥ガイドのクエリフック。
 * 栄養素・肥料カテゴリ・樹種は全件返却（カーソルなし）。施肥スケジュールは樹種 slug 指定。
 * コラムはカーソルページネーション。ゲスト可。
 */

import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_MASTER } from '@/lib/constants/query';
import { FERTILIZER_COLUMNS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';
import type { paths } from '@/lib/api/client';

export type NutrientDetail = components['schemas']['NutrientDetail'];
export type FertilizationScheduleResponse = components['schemas']['FertilizationScheduleResponse'];
export type FertilizerColumnListResponse = components['schemas']['FertilizerColumnListResponse'];
export type FertilizerColumnDetail = components['schemas']['FertilizerColumnDetail'];

type NutrientsResponse =
  paths['/api/v1/fertilizers/nutrients']['get']['responses']['200']['content']['application/json'];
type CategoriesResponse =
  paths['/api/v1/fertilizers/categories']['get']['responses']['200']['content']['application/json'];
type TreeSpeciesResponse =
  paths['/api/v1/fertilizers/tree-species']['get']['responses']['200']['content']['application/json'];

export function useFertilizerNutrientsQuery(category?: string) {
  return useQuery<NutrientsResponse, Error>({
    queryKey: queryKeys.fertilizers.nutrients(category),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/fertilizers/nutrients', {
        params: {
          query: { category: category ?? undefined },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching fertilizer nutrients');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
  });
}

export function useFertilizerNutrientDetailQuery(slug: string) {
  return useQuery<NutrientDetail, Error>({
    queryKey: queryKeys.fertilizers.nutrientDetail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/fertilizers/nutrients/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching nutrient detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}

export function useFertilizerCategoriesQuery() {
  return useQuery<CategoriesResponse, Error>({
    queryKey: queryKeys.fertilizers.categories,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/fertilizers/categories');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching fertilizer categories');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
  });
}

export function useFertilizerTreeSpeciesQuery(category?: string) {
  return useQuery<TreeSpeciesResponse, Error>({
    queryKey: queryKeys.fertilizers.treeSpecies(category),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/fertilizers/tree-species', {
        params: {
          query: { category: category ?? undefined },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching fertilizer tree species');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
  });
}

export function useFertilizationScheduleQuery(slug: string) {
  return useQuery<FertilizationScheduleResponse, Error>({
    queryKey: queryKeys.fertilizers.schedule(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/api/v1/fertilizers/tree-species/{slug}/schedule',
        {
          params: { path: { slug } },
        },
      );
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching fertilization schedule');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// 施肥コラム（columns）
// ---------------------------------------------------------------------------

export function useFertilizerColumnsQuery(category?: string) {
  return useInfiniteQuery<
    FertilizerColumnListResponse,
    Error,
    InfiniteData<FertilizerColumnListResponse>,
    ReturnType<typeof queryKeys.fertilizers.columns>,
    string | undefined
  >({
    queryKey: queryKeys.fertilizers.columns(category),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/fertilizers/columns', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: FERTILIZER_COLUMNS_PAGE_SIZE,
            category: category ?? undefined,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching fertilizer columns');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MASTER,
  });
}

export function useFertilizerColumnDetailQuery(slug: string) {
  return useQuery<FertilizerColumnDetail, Error>({
    queryKey: queryKeys.fertilizers.columnDetail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/fertilizers/columns/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching fertilizer column detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}
