/**
 * @module lib/queries/notifications
 * 通知一覧・未読件数クエリフック + 既読化ミューテーション。
 * ゲストユーザーには 403 GUEST_NOT_ALLOWED を返すため、frontend で認証状態を確認してから使用すること。
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_REALTIME, UNREAD_COUNT_REFETCH_INTERVAL_MS } from '@/lib/constants/query';
import { NOTIFICATIONS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type NotificationItem = components['schemas']['NotificationsListResponse']['items'][number];
export type UnreadCount = components['schemas']['UnreadCountResponse'];
export type NotificationReadResponse = components['schemas']['NotificationReadResponse'];

type NotificationsListResponse = components['schemas']['NotificationsListResponse'];
type UnreadCountResponse = components['schemas']['UnreadCountResponse'];

/**
 * 通知一覧の無限スクロールクエリ。
 * ミュート除外はサーバー側で実施済み。
 * ゲスト不可（403 GUEST_NOT_ALLOWED）— ApiError をそのまま throw する。
 */
export function useNotificationsQuery() {
  return useInfiniteQuery<NotificationsListResponse, Error, InfiniteData<NotificationsListResponse>, ReturnType<typeof queryKeys.notifications.list>, string | undefined>({
    queryKey: queryKeys.notifications.list(),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/notifications', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: NOTIFICATIONS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching notifications');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_REALTIME,
  });
}

/**
 * 未読通知件数クエリ。
 * バッジ表示用。ゲスト不可（403 GUEST_NOT_ALLOWED）— ApiError をそのまま throw する。
 */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/notifications/unread-count');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching unread count');
      }
      return data;
    },
    staleTime: STALE_TIME_REALTIME,
    refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL_MS,
  });
}

// ---------------------------------------------------------------------------
// useMarkNotificationsReadMutation
// ---------------------------------------------------------------------------

export type MarkNotificationsReadParams = {
  /** 既読化する通知 ID の配列。省略または空配列で全未読を既読化する（最大 100 件）。 */
  ids?: string[];
};

/**
 * 通知を既読化するミューテーション（PATCH /api/v1/notifications/read）。
 * onSuccess: 通知一覧の isRead を setQueryData で即時反映し、未読件数バッジも確定値で更新する。
 * ゲスト不可（403 GUEST_NOT_ALLOWED）/ ids が 100 件超（400 VALIDATION_ERROR）は ApiError をそのまま throw する。
 */
export function useMarkNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<NotificationReadResponse, Error, MarkNotificationsReadParams>({
    mutationFn: async ({ ids } = {}) => {
      const { data, error } = await apiClient.PATCH('/api/v1/notifications/read', {
        body: { ids },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error marking notifications as read');
      }
      return data;
    },

    onSuccess: (response, { ids }) => {
      // 通知一覧の isRead を setQueryData で即時反映する
      const listData = queryClient.getQueryData<InfiniteData<NotificationsListResponse>>(
        queryKeys.notifications.list()
      );
      if (listData !== undefined) {
        const idsSet = ids !== undefined && ids.length > 0 ? new Set(ids) : null;
        queryClient.setQueryData<InfiniteData<NotificationsListResponse>>(
          queryKeys.notifications.list(),
          {
            ...listData,
            pages: listData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                // ids 指定の場合は該当 id のみ、未指定・空配列の場合は全件を既読にする
                idsSet === null || idsSet.has(item.id) ? { ...item, isRead: true } : item
              ),
            })),
          }
        );
      }

      // 未読件数バッジをサーバー確定値で即時更新する
      // UnreadCountResponse は { count: number } 形式のため count フィールドに変換する
      queryClient.setQueryData<UnreadCountResponse>(queryKeys.notifications.unreadCount, {
        count: response.unreadCount,
      });
    },
  });
}
