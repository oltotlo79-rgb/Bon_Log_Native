/**
 * @module lib/queries/notifications
 * 通知一覧・未読件数クエリフック。
 * ゲストユーザーには 403 GUEST_NOT_ALLOWED を返すため、frontend で認証状態を確認してから使用すること。
 */

import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_REALTIME, UNREAD_COUNT_REFETCH_INTERVAL_MS } from '@/lib/constants/query';
import { NOTIFICATIONS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type NotificationItem = components['schemas']['NotificationsListResponse']['items'][number];
export type UnreadCount = components['schemas']['UnreadCountResponse'];

type NotificationsListResponse = components['schemas']['NotificationsListResponse'];

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
