/**
 * @module lib/queries/comments
 * コメント一覧の無限スクロールクエリフックおよびコメント CRUD ミューテーションフック。
 */

import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { COMMENTS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type CommentItem = components['schemas']['CommentsListResponse']['items'][number];
export type CommentResponse = components['schemas']['CommentResponse'];
export type SuccessResponse = components['schemas']['SuccessResponse'];

type CommentsListResponse = components['schemas']['CommentsListResponse'];

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

/**
 * 投稿に対するコメント一覧の無限スクロールクエリ。
 * postId が空文字の場合はフェッチを行わない（enabled=false）。
 */
export function useCommentsQuery(postId: string) {
  return useInfiniteQuery<CommentsListResponse, Error, InfiniteData<CommentsListResponse>, ReturnType<typeof queryKeys.comments.byPost>, string | undefined>({
    queryKey: queryKeys.comments.byPost(postId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/posts/{id}/comments', {
        params: {
          path: { id: postId },
          query: {
            cursor: pageParam ?? undefined,
            limit: COMMENTS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching comments');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: postId.length > 0,
  });
}

// ---------------------------------------------------------------------------
// ミューテーション
// ---------------------------------------------------------------------------

export type CreateCommentParams = {
  postId: string;
  content: string;
  parentId?: string;
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
};

/**
 * コメントを作成するミューテーション。
 *
 * 楽観更新しない（確定後 invalidate でリストを更新する）。
 * onSettled: comments.byPost(postId) と posts.detail(postId) を invalidate する。
 *
 * invalidation-map.md 参照: コメント作成 → comments.byPost(postId) / posts.detail(postId)。
 */
export function useCreateCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<CommentResponse, Error, CreateCommentParams>({
    mutationFn: async ({ postId, content, parentId, mediaUrls, mediaTypes }) => {
      const { data, error } = await apiClient.POST('/api/v1/posts/{id}/comments', {
        params: { path: { id: postId } },
        body: {
          content,
          parentId: parentId ?? null,
          mediaUrls,
          mediaTypes,
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating comment');
      }
      return data;
    },

    onSettled: (_data, _error, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}

export type DeleteCommentParams = {
  postId: string;
  commentId: string;
};

/**
 * コメントを削除するミューテーション（コメント所有者または投稿所有者）。
 *
 * onSettled: comments.byPost(postId) と posts.detail(postId) を invalidate する。
 *
 * invalidation-map.md 参照: コメント削除 → comments.byPost(postId) / posts.detail(postId)。
 */
export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<SuccessResponse, Error, DeleteCommentParams>({
    mutationFn: async ({ postId, commentId }) => {
      const { data, error } = await apiClient.DELETE(
        '/api/v1/posts/{id}/comments/{commentId}',
        {
          params: { path: { id: postId, commentId } },
        }
      );
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting comment');
      }
      return data;
    },

    onSettled: (_data, _error, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}
