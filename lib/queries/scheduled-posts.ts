/**
 * @module lib/queries/scheduled-posts
 * 予約投稿の CRUD・キャンセルフック（プレミアム会員限定）。
 * 403 PREMIUM_REQUIRED はリトライせずそのまま伝播する。
 */

import { useQuery, useMutation, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { SCHEDULED_POSTS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type ScheduledPostItem = components['schemas']['ScheduledPostItem'];
export type ScheduledPostListResponse = components['schemas']['ScheduledPostListResponse'];
export type ScheduledPostCreatedResponse = components['schemas']['ScheduledPostCreatedResponse'];

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

/**
 * 予約投稿一覧の無限スクロールクエリ（プレミアム限定）。
 * プレミアム非会員・ゲストは 403 が返る（リトライなしで伝播）。
 * scheduledAt 昇順で返される。
 */
export function useScheduledPostsQuery() {
  return useInfiniteQuery<
    ScheduledPostListResponse,
    Error,
    InfiniteData<ScheduledPostListResponse>,
    ReturnType<typeof queryKeys.scheduledPosts.list>,
    string | undefined
  >({
    queryKey: queryKeys.scheduledPosts.list(),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/scheduled-posts', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: SCHEDULED_POSTS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching scheduled posts');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    // 403 PREMIUM_REQUIRED はリトライしない（QueryClient の retry 関数で 4xx をスキップするが念のため明示）
    retry: false,
  });
}

/**
 * 予約投稿詳細クエリ（所有者のみ・プレミアム限定）。
 * 他人・不存在は 404 で統一（IDOR 防御）。
 * id が空文字の場合はフェッチを行わない。
 */
export function useScheduledPostDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.scheduledPosts.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/scheduled-posts/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching scheduled post detail');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    enabled: id.length > 0,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// ミューテーション
// ---------------------------------------------------------------------------

export type CreateScheduledPostParams = {
  content: string;
  scheduledAt: string;
  genreIds: string[];
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
};

/**
 * 予約投稿を作成するミューテーション（プレミアム限定）。
 * 400 pending 上限超過・403 PREMIUM_REQUIRED はそのまま伝播する。
 * onSettled: scheduledPosts.list を invalidate する。
 *
 * invalidation-map.md 参照: 予約投稿作成 → scheduledPosts.list。
 */
export function useCreateScheduledPostMutation() {
  const queryClient = useQueryClient();

  return useMutation<ScheduledPostCreatedResponse, Error, CreateScheduledPostParams>({
    mutationFn: async (params) => {
      const { data, error } = await apiClient.POST('/api/v1/scheduled-posts', {
        body: params,
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating scheduled post');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.list() });
    },
  });
}

export type UpdateScheduledPostParams = {
  id: string;
  content: string;
  scheduledAt: string;
  genreIds: string[];
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
};

/**
 * 予約投稿を更新するミューテーション（pending のみ・プレミアム限定）。
 * pending 以外は 400 VALIDATION_ERROR・プレミアム非会員は 403 をそのまま伝播する。
 * フィールド構成は POST と同一（差し替え方式）。
 * onSettled: scheduledPosts.detail(id) と scheduledPosts.list を invalidate する。
 *
 * invalidation-map.md 参照: 予約投稿更新 → scheduledPosts.detail(id) / scheduledPosts.list。
 */
export function useUpdateScheduledPostMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, UpdateScheduledPostParams>({
    mutationFn: async ({ id, ...body }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/scheduled-posts/{id}', {
        params: { path: { id } },
        body,
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating scheduled post');
      }
      return data;
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.list() });
    },
  });
}

export type DeleteScheduledPostParams = {
  id: string;
};

/**
 * 予約投稿をハード削除するミューテーション（published 以外のみ）。
 * published 状態は 400 VALIDATION_ERROR を伝播する。
 * onSettled: scheduledPosts.list を invalidate する。
 *
 * invalidation-map.md 参照: 予約投稿削除 → scheduledPosts.list。
 */
export function useDeleteScheduledPostMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, DeleteScheduledPostParams>({
    mutationFn: async ({ id }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/scheduled-posts/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting scheduled post');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.list() });
    },
  });
}

export type CancelScheduledPostParams = {
  id: string;
};

/**
 * 予約投稿をキャンセルするミューテーション（pending のみ・ソフトキャンセル）。
 * status を cancelled に変更する（ハード削除は DELETE を使用）。
 * pending 以外は 400 VALIDATION_ERROR を伝播する。
 * onSettled: scheduledPosts.detail(id) と scheduledPosts.list を invalidate する。
 *
 * invalidation-map.md 参照: 予約投稿キャンセル → scheduledPosts.detail(id) / scheduledPosts.list。
 */
export function useCancelScheduledPostMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, CancelScheduledPostParams>({
    mutationFn: async ({ id }) => {
      const { data, error } = await apiClient.POST('/api/v1/scheduled-posts/{id}/cancel', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error cancelling scheduled post');
      }
      return data;
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.list() });
    },
  });
}
