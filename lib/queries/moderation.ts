/**
 * @module lib/queries/moderation
 * ブロック・ミュート・通報のミューテーションフックとリストクエリフック。
 *
 * ブロック/ミュートは楽観更新しない（ブロックはフォロー解除という副作用があり、
 * 影響範囲が広いため、送信完了後に invalidate する — ugc-safety.md §15）。
 *
 * invalidation-map.md 参照。
 */

import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { USERS_PAGE_SIZE } from '@/lib/constants/limits/pagination';

// ---------------------------------------------------------------------------
// 型 export（frontend が直接使用する）
// ---------------------------------------------------------------------------

/** ブロック操作後のレスポンス型。 */
export type BlockResponse = components['schemas']['BlockResponse'];

/** ミュート操作後のレスポンス型。 */
export type MuteResponse = components['schemas']['MuteResponse'];

/** ブロック/ミュート一覧の item 型（`useBlockedUsersQuery` / `useMutedUsersQuery` の item）。 */
export type UserMinimalWithBio = components['schemas']['UserMinimalWithBio'];

/** ブロック/ミュート一覧レスポンス型（ページ単位）。 */
export type UserMinimalListResponse = components['schemas']['UserMinimalListResponse'];

// ---------------------------------------------------------------------------
// ブロック
// ---------------------------------------------------------------------------

export type BlockUserParams = {
  userId: string;
};

/**
 * ユーザーをブロックするミューテーション。
 *
 * POST /api/v1/users/{id}/block（冪等）。ブロック時に双方向フォローが解除される。
 *
 * onSuccess: users.detail(userId) の isBlocked=true / following=false / requested=false を
 *   setQueryData で即時反映する。
 * onSettled: users.detail / posts.feed / search / notifications / users.blocks を invalidate する。
 */
export function useBlockUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<BlockResponse, Error, BlockUserParams>({
    mutationFn: async ({ userId }) => {
      const { data, error } = await apiClient.POST('/api/v1/users/{id}/block', {
        params: { path: { id: userId } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error blocking user');
      }
      return data;
    },

    onSuccess: (_response, { userId }) => {
      const profileData = queryClient.getQueryData<components['schemas']['UserProfileResponse']>(
        queryKeys.users.detail(userId)
      );
      if (profileData !== undefined) {
        queryClient.setQueryData<components['schemas']['UserProfileResponse']>(
          queryKeys.users.detail(userId),
          {
            ...profileData,
            isBlocked: true,
            // ブロック時に双方向フォロー解除が発生するため楽観反映する
            following: false,
            requested: false,
          }
        );
      }
    },

    onSettled: (_data, _error, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.search.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.blocks });
    },
  });
}

/**
 * ユーザーのブロックを解除するミューテーション。
 *
 * DELETE /api/v1/users/{id}/block（冪等）。
 *
 * onSuccess: users.detail(userId) の isBlocked=false を setQueryData で即時反映する。
 * onSettled: users.blocks / posts.feed / search を invalidate する。
 */
export function useUnblockUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<BlockResponse, Error, BlockUserParams>({
    mutationFn: async ({ userId }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/users/{id}/block', {
        params: { path: { id: userId } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error unblocking user');
      }
      return data;
    },

    onSuccess: (_response, { userId }) => {
      const profileData = queryClient.getQueryData<components['schemas']['UserProfileResponse']>(
        queryKeys.users.detail(userId)
      );
      if (profileData !== undefined) {
        queryClient.setQueryData<components['schemas']['UserProfileResponse']>(
          queryKeys.users.detail(userId),
          { ...profileData, isBlocked: false }
        );
      }
    },

    onSettled: (_data, _error, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.blocks });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.search.all });
    },
  });
}

// ---------------------------------------------------------------------------
// ミュート
// ---------------------------------------------------------------------------

export type MuteUserParams = {
  userId: string;
};

/**
 * ユーザーをミュートするミューテーション。
 *
 * POST /api/v1/users/{id}/mute（冪等）。フォロー関係は変更しない。
 *
 * onSuccess: users.detail(userId) の isMuted=true を setQueryData で即時反映する。
 * onSettled: posts.feed / notifications / search / users.mutes を invalidate する。
 */
export function useMuteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<MuteResponse, Error, MuteUserParams>({
    mutationFn: async ({ userId }) => {
      const { data, error } = await apiClient.POST('/api/v1/users/{id}/mute', {
        params: { path: { id: userId } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error muting user');
      }
      return data;
    },

    onSuccess: (_response, { userId }) => {
      const profileData = queryClient.getQueryData<components['schemas']['UserProfileResponse']>(
        queryKeys.users.detail(userId)
      );
      if (profileData !== undefined) {
        queryClient.setQueryData<components['schemas']['UserProfileResponse']>(
          queryKeys.users.detail(userId),
          { ...profileData, isMuted: true }
        );
      }
    },

    onSettled: (_data, _error, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.search.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.mutes });
    },
  });
}

/**
 * ユーザーのミュートを解除するミューテーション。
 *
 * DELETE /api/v1/users/{id}/mute（冪等）。
 *
 * onSuccess: users.detail(userId) の isMuted=false を setQueryData で即時反映する。
 * onSettled: users.mutes / posts.feed / notifications を invalidate する。
 */
export function useUnmuteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<MuteResponse, Error, MuteUserParams>({
    mutationFn: async ({ userId }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/users/{id}/mute', {
        params: { path: { id: userId } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error unmuting user');
      }
      return data;
    },

    onSuccess: (_response, { userId }) => {
      const profileData = queryClient.getQueryData<components['schemas']['UserProfileResponse']>(
        queryKeys.users.detail(userId)
      );
      if (profileData !== undefined) {
        queryClient.setQueryData<components['schemas']['UserProfileResponse']>(
          queryKeys.users.detail(userId),
          { ...profileData, isMuted: false }
        );
      }
    },

    onSettled: (_data, _error, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.mutes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// ---------------------------------------------------------------------------
// 通報
// ---------------------------------------------------------------------------

export type ReportParams = {
  /** 通報対象種別（MVP: post / comment / user） */
  targetType: 'post' | 'comment' | 'user';
  /** 通報対象 ID */
  targetId: string;
  /** 通報理由 */
  reason: 'spam' | 'inappropriate' | 'harassment' | 'copyright' | 'other';
  /** 詳細説明（任意・最大 1000 文字） */
  description?: string;
};

/** 通報成功レスポンス型。 */
export type ReportSuccessResponse = components['schemas']['SuccessResponse'];

/**
 * コンテンツ・ユーザーを通報するミューテーション。
 *
 * POST /api/v1/reports。通報はキャッシュ変更なし（サーバー側でモデレーション処理される）。
 *
 * 呼び出し側（ReportDialog）が個別処理するエラーコード:
 *   409 CONFLICT → ERR_REPORT_DUPLICATE（重複通報）
 *   404 NOT_FOUND → ERR_REPORT_TARGET_NOT_FOUND（通報対象消失）
 *   429 RATE_LIMITED → ERR_RATE_LIMIT
 * 上記以外（400 を含む）は ERR_REPORT_FAILED にフォールバックする。
 */
export function useReportMutation() {
  return useMutation<ReportSuccessResponse, Error, ReportParams>({
    mutationFn: async ({ targetType, targetId, reason, description }) => {
      const { data, error } = await apiClient.POST('/api/v1/reports', {
        body: { targetType, targetId, reason, description },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error submitting report');
      }
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// ブロックリスト / ミュートリスト（無限スクロール）
// ---------------------------------------------------------------------------

/**
 * ブロック中ユーザー一覧（無限スクロール）。
 *
 * GET /api/v1/users/me/blocks。カーソルベースページネーション。
 * item の型: UserMinimalWithBio（id / nickname / avatarUrl / bio）。
 */
export function useBlockedUsersQuery() {
  return useInfiniteQuery({
    queryKey: queryKeys.users.blocks,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/me/blocks', {
        params: {
          query: {
            cursor: typeof pageParam === 'string' ? pageParam : undefined,
            limit: USERS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching blocked users');
      }
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: UserMinimalListResponse) =>
      lastPage.nextCursor ?? undefined,
  });
}

/**
 * ミュート中ユーザー一覧（無限スクロール）。
 *
 * GET /api/v1/users/me/mutes。カーソルベースページネーション。
 * item の型: UserMinimalWithBio（id / nickname / avatarUrl / bio）。
 */
export function useMutedUsersQuery() {
  return useInfiniteQuery({
    queryKey: queryKeys.users.mutes,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/me/mutes', {
        params: {
          query: {
            cursor: typeof pageParam === 'string' ? pageParam : undefined,
            limit: USERS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching muted users');
      }
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: UserMinimalListResponse) =>
      lastPage.nextCursor ?? undefined,
  });
}
