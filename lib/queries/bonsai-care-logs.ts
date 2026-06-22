/**
 * @module lib/queries/bonsai-care-logs
 * マイ盆栽 手入れログ（BonsaiCareLog）の CRUD クエリフック。
 * 手入れログは特定の盆栽に紐づかずユーザー単位で管理される（Web 仕様準拠）。
 * エンドポイント: /api/v1/bonsai/care-logs（盆栽 ID を含まない）
 */

import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { CARE_LOGS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';
import type { CareLogsParams } from '@/lib/queries/keys';

export type CareLogItem = components['schemas']['CareLogItem'];
export type CareLogListResponse = components['schemas']['CareLogListResponse'];
export type CareLogCreatedResponse = components['schemas']['CareLogCreatedResponse'];

/**
 * BonsaiCareType enum の定数定義。
 * マジック文字列を避け、型安全に手入れ種別を参照する。
 */
export const BONSAI_CARE_TYPE = {
  PESTICIDE: 'pesticide',
  SOLID_FERTILIZER: 'solid_fertilizer',
  LIQUID_FERTILIZER: 'liquid_fertilizer',
  ROTATE: 'rotate',
  SHADING: 'shading',
  MURO_IN: 'muro_in',
  MURO_OUT: 'muro_out',
  OTHER: 'other',
} as const satisfies Record<string, components['schemas']['BonsaiCareType']>;

export type BonsaiCareType = components['schemas']['BonsaiCareType'];

// ---------------------------------------------------------------------------
// 手入れログ一覧
// ---------------------------------------------------------------------------

/**
 * 認証ユーザー自身の手入れログ一覧を取得する無限スクロールクエリ。
 * params で from/to 期間フィルタを指定可（半開区間 [from, to)）。
 * from/to 両方指定で 367 日超はサーバーが 400 を返す。
 * 認証必須・ゲスト 403。
 */
export function useCareLogsQuery(params: CareLogsParams = {}) {
  return useInfiniteQuery<
    CareLogListResponse,
    Error,
    InfiniteData<CareLogListResponse>,
    ReturnType<typeof queryKeys.bonsai.careLogs>,
    string | undefined
  >({
    queryKey: queryKeys.bonsai.careLogs(params),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/bonsai/care-logs', {
        params: {
          query: {
            from: params.from,
            to: params.to,
            cursor: pageParam ?? undefined,
            limit: CARE_LOGS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching care logs');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
  });
}

// ---------------------------------------------------------------------------
// 手入れログ CRUD ミューテーション
// ---------------------------------------------------------------------------

export type CreateCareLogParams = {
  type: BonsaiCareType;
  performedAt: string;
  note?: string;
};

/**
 * 手入れログを作成するミューテーション（認証必須・ゲスト 403）。
 * performedAt は ISO 8601 形式（未来日 +1 日トレランス。超過は 400）。
 * note は最大 500 文字（超過は 400）。
 * onSettled: bonsai.careLogs を invalidate する。
 *
 * invalidation-map.md 参照: 手入れログ作成 → bonsai.careLogs。
 */
export function useCreateCareLogMutation() {
  const queryClient = useQueryClient();

  return useMutation<CareLogCreatedResponse, Error, CreateCareLogParams>({
    mutationFn: async ({ type, performedAt, note }) => {
      const { data, error } = await apiClient.POST('/api/v1/bonsai/care-logs', {
        body: { type, performedAt, note },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating care log');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.all });
    },
  });
}

export type UpdateCareLogParams = {
  logId: string;
  type?: BonsaiCareType;
  performedAt?: string;
  note?: string | null;
};

/**
 * 手入れログを部分更新するミューテーション（所有者のみ）。
 * note に null を渡すとノートをクリアする。
 * 所有者以外・不存在は 404（ID 列挙攻撃防止）。
 * onSettled: bonsai.careLogs を invalidate する。
 *
 * invalidation-map.md 参照: 手入れログ更新 → bonsai.careLogs。
 */
export function useUpdateCareLogMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, UpdateCareLogParams>({
    mutationFn: async ({ logId, type, performedAt, note }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/bonsai/care-logs/{logId}', {
        params: { path: { logId } },
        body: { type, performedAt, note },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating care log');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.all });
    },
  });
}

export type DeleteCareLogParams = {
  logId: string;
};

/**
 * 手入れログを削除するミューテーション（所有者のみ）。
 * 所有者以外・不存在は 404（ID 列挙攻撃防止）。
 * onSettled: bonsai.careLogs を invalidate する。
 *
 * invalidation-map.md 参照: 手入れログ削除 → bonsai.careLogs。
 */
export function useDeleteCareLogMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, DeleteCareLogParams>({
    mutationFn: async ({ logId }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/bonsai/care-logs/{logId}', {
        params: { path: { logId } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting care log');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bonsai.all });
    },
  });
}
