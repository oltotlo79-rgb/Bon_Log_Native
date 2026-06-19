/**
 * @module lib/queries/posts
 * 投稿詳細クエリフックおよび投稿 CRUD ミューテーションフック。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type PostDetail = components['schemas']['PostResponse'];
export type PostResponse = components['schemas']['PostResponse'];
export type SuccessResponse = components['schemas']['SuccessResponse'];

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

/**
 * 投稿詳細クエリ。
 * 不可視・ブロック済み投稿はサーバーが 404 を返す（一律）。
 * id が空文字の場合はフェッチを行わない（enabled=false）。
 */
export function usePostQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/posts/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching post');
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

export type CreatePostParams = {
  content: string;
  genreIds: string[];
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
};

/**
 * 投稿を作成するミューテーション。
 *
 * 楽観更新しない（ファイルアップロード後の複合操作のため送信中 UI を出す）。
 * onSettled: posts.feed() と自分の users.detail(currentUserId) を invalidate する。
 * currentUserId は onSettled コールバック外から渡す必要があるため、
 * frontend は onSuccess/onSettled フックで queryClient を使って追加 invalidate できる。
 *
 * invalidation-map.md 参照: 投稿作成 → posts.feed() / users.detail(userId)。
 */
export function useCreatePostMutation(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation<PostResponse, Error, CreatePostParams>({
    mutationFn: async ({ content, genreIds, mediaUrls, mediaTypes }) => {
      const { data, error } = await apiClient.POST('/api/v1/posts', {
        body: { content, genreIds, mediaUrls, mediaTypes },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating post');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
      if (currentUserId.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(currentUserId),
        });
      }
    },
  });
}

export type UpdatePostParams = {
  id: string;
  content: string;
  genreIds: string[];
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
};

/**
 * 投稿を編集するミューテーション（所有者のみ）。
 *
 * 楽観更新しない（メディア差し替え等の複合操作のため送信中 UI を出す）。
 * onSettled: posts.detail(id) と posts.feed() を invalidate する。
 *
 * invalidation-map.md 参照: 投稿更新 → posts.detail(id) / posts.feed()。
 */
export function useUpdatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation<PostResponse, Error, UpdatePostParams>({
    mutationFn: async ({ id, content, genreIds, mediaUrls, mediaTypes }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/posts/{id}', {
        params: { path: { id } },
        body: { content, genreIds, mediaUrls, mediaTypes },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating post');
      }
      return data;
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
    },
  });
}

export type DeletePostParams = {
  id: string;
};

/**
 * 投稿を削除するミューテーション（所有者のみ）。
 *
 * onSettled: posts.all（投稿系一括）と自分の users.detail(currentUserId) を invalidate する。
 *
 * invalidation-map.md 参照: 投稿削除 → posts.all / users.detail(userId)。
 */
export function useDeletePostMutation(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation<SuccessResponse, Error, DeletePostParams>({
    mutationFn: async ({ id }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/posts/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting post');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      if (currentUserId.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(currentUserId),
        });
      }
    },
  });
}
