/**
 * @module lib/queries/shops
 * 盆栽園マップの一覧・詳細・登録・更新・レビュー・ジャンルのクエリフック。
 * 一覧・詳細・レビュー・ジャンルはゲスト可。登録・更新は認証必須。
 */

import { useQuery, useMutation, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, type ShopsListParams, type GenreType } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD, STALE_TIME_MASTER } from '@/lib/constants/query';
import { SHOPS_PAGE_SIZE, REVIEWS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type ShopItem = components['schemas']['ShopItem'];
export type ShopListResponse = components['schemas']['ShopListResponse'];
export type ShopCreatedResponse = components['schemas']['ShopCreatedResponse'];
export type ReviewItem = components['schemas']['ReviewItem'];
export type ReviewListResponse = components['schemas']['ReviewListResponse'];
export type GenreListResponse = components['schemas']['GenreListResponse'];

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

/**
 * 盆栽園一覧の無限スクロールクエリ（ゲスト可）。
 * params で名称検索・ジャンル・都道府県・ソート順を絞り込める。
 * sortBy=rating はサーバー側メモリソート（DB 集計困難なため）。
 */
export function useShopsListQuery(params: ShopsListParams = {}) {
  return useInfiniteQuery<
    ShopListResponse,
    Error,
    InfiniteData<ShopListResponse>,
    ReturnType<typeof queryKeys.shops.list>,
    string | undefined
  >({
    queryKey: queryKeys.shops.list(params),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/shops', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: SHOPS_PAGE_SIZE,
            search: params.search,
            genreId: params.genreId,
            prefecture: params.prefecture,
            sortBy: params.sortBy,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching shops');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
  });
}

/**
 * 盆栽園詳細クエリ（ゲスト可）。
 * id が空文字の場合はフェッチを行わない。
 * isOwner は閲覧者が作成者の場合 true（ゲスト時は false）。
 */
export function useShopDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.shops.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/shops/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching shop detail');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    enabled: id.length > 0,
  });
}

/**
 * 盆栽園レビュー一覧の無限スクロールクエリ（ゲスト可）。
 * shopId が空文字の場合はフェッチを行わない。
 */
export function useShopReviewsQuery(shopId: string) {
  return useInfiniteQuery<
    ReviewListResponse,
    Error,
    InfiniteData<ReviewListResponse>,
    ReturnType<typeof queryKeys.shops.reviews>,
    string | undefined
  >({
    queryKey: queryKeys.shops.reviews(shopId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/shops/{id}/reviews', {
        params: {
          path: { id: shopId },
          query: {
            cursor: pageParam ?? undefined,
            limit: REVIEWS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching shop reviews');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: shopId.length > 0,
  });
}

/**
 * ジャンル一覧クエリ（ゲスト可）。
 * type=shop: 盆栽園タグ用ジャンル / type=post: 投稿タグ用ジャンル。
 * マスタ系データのため長めの staleTime を設定する。
 */
export function useGenresQuery(type: GenreType) {
  return useQuery({
    queryKey: queryKeys.genres.list(type),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/genres', {
        params: { query: { type } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching genres');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
  });
}

// ---------------------------------------------------------------------------
// ミューテーション
// ---------------------------------------------------------------------------

export type CreateShopParams = {
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  website?: string | null;
  businessHours?: string | null;
  closedDays?: string | null;
  genreIds: string[];
};

/**
 * 盆栽園を登録するミューテーション（認証必須・ゲスト不可）。
 * 同一住所が既登録の場合は 409 CONFLICT を伝播する。
 * onSettled: shops.list を invalidate する。
 *
 * invalidation-map.md 参照: 盆栽園作成 → shops.list。
 */
export function useCreateShopMutation() {
  const queryClient = useQueryClient();

  return useMutation<ShopCreatedResponse, Error, CreateShopParams>({
    mutationFn: async (params) => {
      const { data, error } = await apiClient.POST('/api/v1/shops', {
        body: params,
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating shop');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

export type UpdateShopParams = {
  id: string;
  name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  website?: string | null;
  businessHours?: string | null;
  closedDays?: string | null;
  genreIds?: string[];
};

/**
 * 盆栽園を更新するミューテーション（作成者または admin のみ）。
 * genreIds 指定時は既存ジャンルを全置換する。
 * 権限なしの 403 / 不存在の 404 はそのまま伝播する。
 * onSettled: shops.detail(id) と shops.list を invalidate する。
 *
 * invalidation-map.md 参照: 盆栽園更新 → shops.detail(id) / shops.list。
 */
export function useUpdateShopMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, UpdateShopParams>({
    mutationFn: async ({ id, ...body }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/shops/{id}', {
        params: { path: { id } },
        body,
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating shop');
      }
      return data;
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

export type CreateReviewParams = {
  shopId: string;
  rating: number;
  content?: string | null;
  mediaUrls: string[];
};

/**
 * 盆栽園にレビューを投稿するミューテーション（認証必須・ゲスト不可）。
 * 1 盆栽園につき 1 ユーザー 1 件まで。二重投稿は 409 CONFLICT を伝播する。
 * onSettled: shops.reviews(shopId) と shops.detail(shopId) を invalidate する。
 *
 * invalidation-map.md 参照: レビュー作成 → shops.reviews(shopId) / shops.detail(shopId)。
 */
export function useCreateReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation<ReviewItem, Error, CreateReviewParams>({
    mutationFn: async ({ shopId, rating, content, mediaUrls }) => {
      const { data, error } = await apiClient.POST('/api/v1/shops/{id}/reviews', {
        params: { path: { id: shopId } },
        body: { rating, content, mediaUrls },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating review');
      }
      return data;
    },

    onSettled: (_data, _error, { shopId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops.reviews(shopId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops.detail(shopId) });
    },
  });
}
