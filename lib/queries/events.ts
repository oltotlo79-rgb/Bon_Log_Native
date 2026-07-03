/**
 * @module lib/queries/events
 * イベントの一覧・詳細・CRUD クエリフック。
 * イベント一覧はゲスト可。作成・更新・削除は作成者のみ（403 / 404 は伝播）。
 */

import { useQuery, useMutation, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, type EventsFilter } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { EVENTS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type EventItemDetail = components['schemas']['EventItemDetail'];
export type EventListResponse = components['schemas']['EventListResponse'];
type EventItemCreate = components['schemas']['EventItemCreate'];
type EventItemUpdate = components['schemas']['EventItemUpdate'];

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

/**
 * イベント一覧の無限スクロールクエリ（ゲスト可）。
 * filter で地方・都道府県・過去イベント表示・年月を絞り込める。
 * 並び順は startDate 昇順（サーバー固定）。
 */
export function useEventsListQuery(filter: EventsFilter = {}) {
  return useInfiniteQuery<
    EventListResponse,
    Error,
    InfiniteData<EventListResponse>,
    ReturnType<typeof queryKeys.events.list>,
    string | undefined
  >({
    queryKey: queryKeys.events.list(filter),
    queryFn: async ({ pageParam }) => {
      // API の month は 0-11 (JavaScript Date.getMonth() 準拠)。
      // アプリ内部では 1-12（人間向け）で保持しているので送信時に -1 変換する。
      const apiMonth =
        filter.month !== undefined ? filter.month - 1 : undefined;
      const { data, error } = await apiClient.GET('/api/v1/events', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: EVENTS_PAGE_SIZE,
            region: filter.region,
            prefecture: filter.prefecture,
            showPast: filter.showPast === true ? 'true' : filter.showPast === false ? 'false' : undefined,
            year: filter.year,
            month: apiMonth,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching events');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
  });
}

/**
 * イベント詳細クエリ（ゲスト可）。
 * id が空文字の場合はフェッチを行わない。
 */
export function useEventDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/events/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching event detail');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    enabled: id.length > 0,
  });
}

// ---------------------------------------------------------------------------
// ミューテーション
// ---------------------------------------------------------------------------

export type CreateEventParams = {
  title: string;
  startDate: string;
  description?: string | null;
  endDate?: string | null;
  prefecture?: string | null;
  city?: string | null;
  venue?: string | null;
  organizer?: string | null;
  admissionFee?: string | null;
  hasSales: boolean;
  externalUrl?: string | null;
};

/**
 * イベントを作成するミューテーション（認証必須・ゲスト不可）。
 * onSettled: events.list を invalidate する。
 *
 * invalidation-map.md 参照: イベント作成 → events.list。
 */
export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation<EventItemCreate, Error, CreateEventParams>({
    mutationFn: async (params) => {
      const { data, error } = await apiClient.POST('/api/v1/events', {
        body: params,
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating event');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

export type UpdateEventParams = {
  id: string;
  title?: string;
  startDate?: string;
  description?: string | null;
  endDate?: string | null;
  prefecture?: string | null;
  city?: string | null;
  venue?: string | null;
  organizer?: string | null;
  admissionFee?: string | null;
  hasSales?: boolean;
  externalUrl?: string | null;
};

/**
 * イベントを部分更新するミューテーション（作成者のみ）。
 * 作成者でない場合の 403 / 不存在の 404 はそのまま伝播する。
 * onSettled: events.detail(id) と events.list を invalidate する。
 *
 * invalidation-map.md 参照: イベント更新 → events.detail(id) / events.list。
 */
export function useUpdateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation<EventItemUpdate, Error, UpdateEventParams>({
    mutationFn: async ({ id, ...body }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/events/{id}', {
        params: { path: { id } },
        body,
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating event');
      }
      return data;
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

export type DeleteEventParams = {
  id: string;
};

/**
 * イベントを削除するミューテーション（作成者のみ・204 No Content）。
 * 作成者でない場合の 403 はそのまま伝播する。
 * onSettled: events.list を invalidate する。
 *
 * invalidation-map.md 参照: イベント削除 → events.list。
 */
export function useDeleteEventMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteEventParams>({
    mutationFn: async ({ id }) => {
      const { error } = await apiClient.DELETE('/api/v1/events/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined) {
        throw error;
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}
