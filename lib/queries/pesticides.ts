/**
 * @module lib/queries/pesticides
 * 農薬病害虫図鑑のクエリフック。
 * 病害虫・農薬製品・有効成分・展着剤・コラム・剤型・混用チェッカーを提供する。
 * 一覧はカーソルページネーション（useInfiniteQuery）または全件（useQuery）。詳細は useQuery。ゲスト可。
 */

import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, type PesticideListParams } from '@/lib/queries/keys';
import { STALE_TIME_MASTER, STALE_TIME_LONG } from '@/lib/constants/query';
import {
  DISEASE_PESTS_PAGE_SIZE,
  PESTICIDE_PRODUCTS_PAGE_SIZE,
  PESTICIDE_INGREDIENTS_PAGE_SIZE,
  SPREADER_PRODUCTS_PAGE_SIZE,
  PESTICIDE_COLUMNS_PAGE_SIZE,
} from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';
import type { paths } from '@/lib/api/client';

export type DiseasePestListResponse = components['schemas']['DiseasePestListResponse'];
export type DiseasePestDetail = components['schemas']['DiseasePestDetail'];
export type PesticideListResponse = components['schemas']['PesticideListResponse'];
export type IngredientListResponse = components['schemas']['IngredientListResponse'];
export type IngredientDetail = components['schemas']['IngredientDetail'];
export type SpreaderTypeListResponse = components['schemas']['SpreaderTypeListResponse'];
export type SpreaderProductListResponse = components['schemas']['SpreaderProductListResponse'];
export type PesticideColumnListResponse = components['schemas']['PesticideColumnListResponse'];
export type PesticideColumnDetail = components['schemas']['PesticideColumnDetail'];
export type FormulationTypeListResponse = components['schemas']['FormulationTypeListResponse'];
export type MixingDataResponse = components['schemas']['MixingDataResponse'];

type PesticideProductDetail =
  paths['/api/v1/pesticides/products/{slug}']['get']['responses']['200']['content']['application/json'];

type SpreaderTypeDetail =
  paths['/api/v1/pesticides/spreaders/{slug}']['get']['responses']['200']['content']['application/json'];

// ---------------------------------------------------------------------------
// 病害虫（disease-pests）
// ---------------------------------------------------------------------------

export type DiseasePestsFilter = {
  category?: string;
  search?: string;
  bodySizeMm?: number;
};

export function usePesticideDiseasePestsQuery(filter: DiseasePestsFilter = {}) {
  const params: PesticideListParams = {
    category: filter.category,
    search: filter.search,
    bodySizeMm: filter.bodySizeMm,
  };

  return useInfiniteQuery<
    DiseasePestListResponse,
    Error,
    InfiniteData<DiseasePestListResponse>,
    ReturnType<typeof queryKeys.pesticides.diseasePests>,
    string | undefined
  >({
    queryKey: queryKeys.pesticides.diseasePests(params),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/disease-pests', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: DISEASE_PESTS_PAGE_SIZE,
            category: filter.category ?? undefined,
            search: filter.search ?? undefined,
            bodySizeMm: filter.bodySizeMm ?? undefined,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching disease pests');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MASTER,
  });
}

export function usePesticideDiseasePestDetailQuery(slug: string) {
  return useQuery<DiseasePestDetail, Error>({
    queryKey: queryKeys.pesticides.diseasePestDetail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/disease-pests/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching disease pest detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// 農薬製品（products）
// ---------------------------------------------------------------------------

export type PesticideProductsFilter = {
  search?: string;
  type?: string;
  diseasePestId?: string;
  formulationTypeCode?: string;
};

export function usePesticideProductsQuery(filter: PesticideProductsFilter = {}) {
  const params: PesticideListParams = {
    search: filter.search,
    type: filter.type,
    diseasePestId: filter.diseasePestId,
    formulationTypeCode: filter.formulationTypeCode,
  };

  return useInfiniteQuery<
    PesticideListResponse,
    Error,
    InfiniteData<PesticideListResponse>,
    ReturnType<typeof queryKeys.pesticides.products>,
    string | undefined
  >({
    queryKey: queryKeys.pesticides.products(params),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/products', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: PESTICIDE_PRODUCTS_PAGE_SIZE,
            search: filter.search ?? undefined,
            type: filter.type ?? undefined,
            diseasePestId: filter.diseasePestId ?? undefined,
            formulationTypeCode: filter.formulationTypeCode ?? undefined,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching pesticide products');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MASTER,
  });
}

export function usePesticideProductDetailQuery(slug: string) {
  return useQuery<PesticideProductDetail, Error>({
    queryKey: queryKeys.pesticides.productDetail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/products/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching pesticide product detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// 有効成分（ingredients）
// ---------------------------------------------------------------------------

export type PesticideIngredientsFilter = {
  search?: string;
};

export function usePesticideIngredientsQuery(filter: PesticideIngredientsFilter = {}) {
  const params: PesticideListParams = {
    search: filter.search,
  };

  return useInfiniteQuery<
    IngredientListResponse,
    Error,
    InfiniteData<IngredientListResponse>,
    ReturnType<typeof queryKeys.pesticides.ingredients>,
    string | undefined
  >({
    queryKey: queryKeys.pesticides.ingredients(params),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/ingredients', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: PESTICIDE_INGREDIENTS_PAGE_SIZE,
            search: filter.search ?? undefined,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching pesticide ingredients');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MASTER,
  });
}

export function usePesticideIngredientDetailQuery(slug: string) {
  return useQuery<IngredientDetail, Error>({
    queryKey: queryKeys.pesticides.ingredientDetail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/ingredients/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching ingredient detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// 展着剤タイプ（spreaders）
// ---------------------------------------------------------------------------

export function useSpreaderTypesQuery() {
  return useQuery<SpreaderTypeListResponse, Error>({
    queryKey: queryKeys.pesticides.spreaderTypes,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/spreaders');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching spreader types');
      }
      return data;
    },
    staleTime: STALE_TIME_LONG,
  });
}

export function useSpreaderTypeDetailQuery(slug: string) {
  return useQuery<SpreaderTypeDetail, Error>({
    queryKey: queryKeys.pesticides.spreaderTypeDetail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/spreaders/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching spreader type detail');
      }
      return data;
    },
    staleTime: STALE_TIME_LONG,
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// 展着剤製品（spreader-products）
// ---------------------------------------------------------------------------

export function useSpreaderProductsQuery() {
  return useInfiniteQuery<
    SpreaderProductListResponse,
    Error,
    InfiniteData<SpreaderProductListResponse>,
    typeof queryKeys.pesticides.spreaderProducts,
    string | undefined
  >({
    queryKey: queryKeys.pesticides.spreaderProducts,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/spreader-products', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: SPREADER_PRODUCTS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching spreader products');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MASTER,
  });
}

// ---------------------------------------------------------------------------
// 農薬コラム（columns）
// ---------------------------------------------------------------------------

export function usePesticideColumnsQuery() {
  return useInfiniteQuery<
    PesticideColumnListResponse,
    Error,
    InfiniteData<PesticideColumnListResponse>,
    typeof queryKeys.pesticides.columns,
    string | undefined
  >({
    queryKey: queryKeys.pesticides.columns,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/columns', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: PESTICIDE_COLUMNS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching pesticide columns');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MASTER,
  });
}

export function usePesticideColumnDetailQuery(slug: string) {
  return useQuery<PesticideColumnDetail, Error>({
    queryKey: queryKeys.pesticides.columnDetail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/columns/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching pesticide column detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// 剤型マスタ（formulations）
// ---------------------------------------------------------------------------

export function useFormulationTypesQuery() {
  return useQuery<FormulationTypeListResponse, Error>({
    queryKey: queryKeys.pesticides.formulations,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/formulations');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching formulation types');
      }
      return data;
    },
    staleTime: STALE_TIME_LONG,
  });
}

// ---------------------------------------------------------------------------
// 混用チェッカー全データ（mixing-data）
// ---------------------------------------------------------------------------

export function useMixingDataQuery() {
  return useQuery<MixingDataResponse, Error>({
    queryKey: queryKeys.pesticides.mixingData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/pesticides/mixing-data');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching mixing data');
      }
      return data;
    },
    staleTime: STALE_TIME_LONG,
  });
}
