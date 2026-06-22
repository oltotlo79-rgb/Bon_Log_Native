/**
 * @module lib/queries/bonsai
 * マイ盆栽の CRUD・成長記録の CRUD クエリフック。
 * 盆栽データは所有者のみ閲覧可能（他人・不存在は 404 IDOR 防御）。
 */

import { useQuery, useMutation, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { BONSAI_PAGE_SIZE, BONSAI_RECORDS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type BonsaiDetail = components['schemas']['BonsaiDetail'];
export type BonsaiListResponse = components['schemas']['BonsaiListResponse'];
export type BonsaiRecordListResponse = components['schemas']['BonsaiRecordListResponse'];
type SuccessResponse = components['schemas']['SuccessResponse'];

// ---------------------------------------------------------------------------
// 盆栽一覧・詳細
// ---------------------------------------------------------------------------

/**
 * マイ盆栽一覧の無限スクロールクエリ。
 * 各アイテムには latestRecord と recordCount が含まれる。
 */
export function useBonsaiListQuery() {
  return useInfiniteQuery<
    BonsaiListResponse,
    Error,
    InfiniteData<BonsaiListResponse>,
    ReturnType<typeof queryKeys.bonsai.list>,
    string | undefined
  >({
    queryKey: queryKeys.bonsai.list(),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/bonsai', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: BONSAI_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching bonsai list');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
  });
}

/**
 * 盆栽詳細クエリ（所有者のみ）。
 * id が空文字の場合はフェッチを行わない。
 */
export function useBonsaiDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.bonsai.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/bonsai/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching bonsai detail');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    enabled: id.length > 0,
  });
}

// ---------------------------------------------------------------------------
// 盆栽 CRUD ミューテーション
// ---------------------------------------------------------------------------

export type CreateBonsaiParams = {
  name: string;
  species?: string;
  acquiredAt?: string;
  description?: string;
};

/**
 * 盆栽を作成するミューテーション。
 * onSettled: bonsai.list を invalidate する。
 *
 * invalidation-map.md 参照: 盆栽作成 → bonsai.list。
 */
export function useCreateBonsaiMutation() {
  const queryClient = useQueryClient();

  return useMutation<BonsaiDetail, Error, CreateBonsaiParams>({
    mutationFn: async ({ name, species, acquiredAt, description }) => {
      const { data, error } = await apiClient.POST('/api/v1/bonsai', {
        body: { name, species, acquiredAt, description },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating bonsai');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.list() });
    },
  });
}

export type UpdateBonsaiParams = {
  id: string;
  name?: string;
  species?: string;
  acquiredAt?: string | null;
  description?: string;
};

/**
 * 盆栽を更新するミューテーション（所有者のみ）。
 * onSettled: bonsai.detail(id) と bonsai.list を invalidate する。
 *
 * invalidation-map.md 参照: 盆栽更新 → bonsai.detail(id) / bonsai.list。
 */
export function useUpdateBonsaiMutation() {
  const queryClient = useQueryClient();

  return useMutation<BonsaiDetail, Error, UpdateBonsaiParams>({
    mutationFn: async ({ id, name, species, acquiredAt, description }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/bonsai/{id}', {
        params: { path: { id } },
        body: { name, species, acquiredAt, description },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating bonsai');
      }
      return data;
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.list() });
    },
  });
}

export type DeleteBonsaiParams = {
  id: string;
};

/**
 * 盆栽を削除するミューテーション（所有者のみ）。
 * 盆栽と全成長記録・画像が削除される。
 * onSettled: bonsai.list を invalidate する。
 *
 * invalidation-map.md 参照: 盆栽削除 → bonsai.list。
 */
export function useDeleteBonsaiMutation() {
  const queryClient = useQueryClient();

  return useMutation<SuccessResponse, Error, DeleteBonsaiParams>({
    mutationFn: async ({ id }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/bonsai/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting bonsai');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.list() });
    },
  });
}

// ---------------------------------------------------------------------------
// 成長記録
// ---------------------------------------------------------------------------

/**
 * 指定盆栽の成長記録一覧を取得する無限スクロールクエリ（所有者のみ）。
 * bonsaiId が空文字の場合はフェッチを行わない。
 */
export function useBonsaiRecordsQuery(bonsaiId: string) {
  return useInfiniteQuery<
    BonsaiRecordListResponse,
    Error,
    InfiniteData<BonsaiRecordListResponse>,
    ReturnType<typeof queryKeys.bonsai.records>,
    string | undefined
  >({
    queryKey: queryKeys.bonsai.records(bonsaiId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/bonsai/{id}/records', {
        params: {
          path: { id: bonsaiId },
          query: {
            cursor: pageParam ?? undefined,
            limit: BONSAI_RECORDS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching bonsai records');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: bonsaiId.length > 0,
  });
}

export type CreateBonsaiRecordParams = {
  bonsaiId: string;
  content?: string;
  recordAt: string;
  mediaUrls: string[];
};

/**
 * 盆栽に成長記録を追加するミューテーション（所有者のみ）。
 * onSettled: bonsai.records(bonsaiId)・bonsai.detail(bonsaiId)・bonsai.list を invalidate する。
 *
 * invalidation-map.md 参照: 成長記録作成 → bonsai.records(bonsaiId) / bonsai.detail(bonsaiId) / bonsai.list。
 */
export function useCreateBonsaiRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation<BonsaiDetail, Error, CreateBonsaiRecordParams>({
    mutationFn: async ({ bonsaiId, content, recordAt, mediaUrls }) => {
      const { data, error } = await apiClient.POST('/api/v1/bonsai/{id}/records', {
        params: { path: { id: bonsaiId } },
        body: { content, recordAt, mediaUrls },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating bonsai record');
      }
      return data;
    },

    onSettled: (_data, _error, { bonsaiId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.records(bonsaiId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.detail(bonsaiId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.list() });
    },
  });
}

export type UpdateBonsaiRecordParams = {
  bonsaiId: string;
  recordId: string;
  content?: string;
  recordAt?: string;
  mediaUrls?: string[];
};

/**
 * 成長記録を更新するミューテーション（所有者のみ）。
 * mediaUrls 指定時は既存画像を全て置換する（差し替え方式）。
 * onSettled: bonsai.records(bonsaiId) と bonsai.detail(bonsaiId) を invalidate する。
 *
 * invalidation-map.md 参照: 成長記録更新 → bonsai.records(bonsaiId) / bonsai.detail(bonsaiId)。
 */
export function useUpdateBonsaiRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation<BonsaiDetail, Error, UpdateBonsaiRecordParams>({
    mutationFn: async ({ bonsaiId, recordId, content, recordAt, mediaUrls }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/bonsai/{id}/records/{recordId}', {
        params: { path: { id: bonsaiId, recordId } },
        body: { content, recordAt, mediaUrls },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating bonsai record');
      }
      return data;
    },

    onSettled: (_data, _error, { bonsaiId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.records(bonsaiId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.detail(bonsaiId) });
    },
  });
}

export type DeleteBonsaiRecordParams = {
  bonsaiId: string;
  recordId: string;
};

/**
 * 成長記録を削除するミューテーション（所有者のみ）。
 * onSettled: bonsai.records(bonsaiId) と bonsai.detail(bonsaiId) を invalidate する。
 *
 * invalidation-map.md 参照: 成長記録削除 → bonsai.records(bonsaiId) / bonsai.detail(bonsaiId)。
 */
export function useDeleteBonsaiRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation<SuccessResponse, Error, DeleteBonsaiRecordParams>({
    mutationFn: async ({ bonsaiId, recordId }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/bonsai/{id}/records/{recordId}', {
        params: { path: { id: bonsaiId, recordId } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting bonsai record');
      }
      return data;
    },

    onSettled: (_data, _error, { bonsaiId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.records(bonsaiId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.detail(bonsaiId) });
    },
  });
}
