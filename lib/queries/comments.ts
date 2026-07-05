/**
 * @module lib/queries/comments
 * コメント一覧の無限スクロールクエリフックおよびコメント CRUD ミューテーションフック。
 */

import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import {
  COMMENTS_PAGE_SIZE,
  USER_COMMENTS_PAGE_SIZE,
  COMMENT_REPLIES_PAGE_SIZE,
} from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type CommentItem = components['schemas']['CommentsListResponse']['items'][number];
export type CommentResponse = components['schemas']['CommentResponse'];
export type SuccessResponse = components['schemas']['SuccessResponse'];
export type LikeResponse = components['schemas']['LikeResponse'];

type CommentsListResponse = components['schemas']['CommentsListResponse'];

export type UserCommentItem = components['schemas']['UserCommentsListResponse']['items'][number];

type UserCommentsListResponse = components['schemas']['UserCommentsListResponse'];

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

/**
 * コメントへの返信一覧の無限スクロールクエリ（GET /api/v1/comments/{id}/replies）。
 * 親コメントが非表示・削除済み・閲覧不可（非公開・停止著者等）の場合はサーバーが空リストを返す
 * （404 にはしない）。commentId が空文字の場合はフェッチを行わない（enabled=false）。
 */
export function useCommentRepliesQuery(commentId: string) {
  return useInfiniteQuery<
    CommentsListResponse,
    Error,
    InfiniteData<CommentsListResponse>,
    ReturnType<typeof queryKeys.comments.replies>,
    string | undefined
  >({
    queryKey: queryKeys.comments.replies(commentId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/comments/{id}/replies', {
        params: {
          path: { id: commentId },
          query: {
            cursor: pageParam ?? undefined,
            limit: COMMENT_REPLIES_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching comment replies');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: commentId.length > 0,
  });
}

/**
 * 指定ユーザーが投稿したコメント一覧の無限スクロールクエリ。
 *
 * GET /api/v1/users/{id}/comments。item の post は { id, content } のみ
 * （Post に slug/title は存在しないため、遷移は post.id で GET /api/v1/posts/{id} を叩く）。
 * レート制限は timeline 区分のためポーリング等は行わない。
 * userId が空文字の場合はフェッチを行わない（enabled=false）。
 */
export function useUserCommentsQuery(userId: string) {
  return useInfiniteQuery<
    UserCommentsListResponse,
    Error,
    InfiniteData<UserCommentsListResponse>,
    ReturnType<typeof queryKeys.users.comments>,
    string | undefined
  >({
    queryKey: queryKeys.users.comments(userId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/{id}/comments', {
        params: {
          path: { id: userId },
          query: {
            cursor: pageParam ?? undefined,
            limit: USER_COMMENTS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching user comments');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: userId.length > 0,
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
 * コメントを作成するミューテーション。parentId を指定すると返信になる。
 *
 * 楽観更新しない（確定後 invalidate でリストを更新する）。
 * onSettled: comments.byPost(postId) と posts.detail(postId) を invalidate する。
 * parentId 指定時（返信作成）は comments.replies(parentId) も invalidate する。
 *
 * invalidation-map.md 参照: コメント作成 → comments.byPost(postId) / posts.detail(postId) /
 * （返信時）comments.replies(parentId)。
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

    onSettled: (_data, _error, { postId, parentId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      if (parentId !== undefined && parentId.length > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.comments.replies(parentId) });
      }
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

// ---------------------------------------------------------------------------
// コメントいいね
// ---------------------------------------------------------------------------

export type ToggleCommentLikeParams = {
  commentId: string;
  /** 操作前のいいね状態。true → 解除(DELETE)、false → 付与(POST) */
  liked: boolean;
  /**
   * 対象コメントが返信の場合の親コメント ID。
   * 指定すると onSettled で comments.replies(parentId) も invalidate する。
   */
  parentId?: string;
};

/** 楽観更新のロールバック用スナップショット型（コメントいいね） */
type CommentLikeSnapshot = {
  commentCaches: [QueryKey, InfiniteData<CommentsListResponse>][];
};

/**
 * コメントのいいねをトグルするミューテーション。
 * liked が false → POST（付与）、true → DELETE（解除）。投稿いいねと同じ設計。
 *
 * postId は comments.byPost(postId) キャッシュを特定するための引数。
 * 対象コメントは返信一覧キャッシュ（comments.replies）にも存在し得るため、
 * onMutate/onError では comments 配下の全キャッシュ（byPost + replies、prefix match）を
 * 走査して該当 commentId の isLiked / likeCount を更新・ロールバックする。
 *
 * invalidation-map.md 参照: コメントいいね/解除 → 楽観更新 + comments.byPost(postId) を onSettled invalidate。
 * parentId 指定時（返信一覧を表示中）は comments.replies(parentId) も invalidate する。
 */
export function useToggleCommentLikeMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<LikeResponse, Error, ToggleCommentLikeParams, CommentLikeSnapshot>({
    mutationFn: async ({ commentId, liked }) => {
      if (liked) {
        const { data, error } = await apiClient.DELETE('/api/v1/comments/{id}/like', {
          params: { path: { id: commentId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error removing comment like');
        }
        return data;
      } else {
        const { data, error } = await apiClient.POST('/api/v1/comments/{id}/like', {
          params: { path: { id: commentId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error adding comment like');
        }
        return data;
      }
    },

    onMutate: async ({ commentId, liked }) => {
      // comments 配下の全キャッシュ（byPost + replies）を対象に楽観更新するため prefix でキャンセルする
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.all });

      const allCommentCaches = queryClient.getQueriesData<InfiniteData<CommentsListResponse>>({
        queryKey: queryKeys.comments.all,
      });
      const commentCaches: [QueryKey, InfiniteData<CommentsListResponse>][] = allCommentCaches
        .filter((entry): entry is [QueryKey, InfiniteData<CommentsListResponse>] => entry[1] !== undefined);

      const likedDelta = liked ? -1 : 1;

      for (const [key, data] of commentCaches) {
        queryClient.setQueryData<InfiniteData<CommentsListResponse>>(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === commentId
                ? { ...item, isLiked: !liked, likeCount: item.likeCount + likedDelta }
                : item
            ),
          })),
        });
      }

      return { commentCaches };
    },

    onError: (_error, _params, snapshot) => {
      if (snapshot === undefined) return;
      for (const [key, data] of snapshot.commentCaches) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: (_data, _error, { parentId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
      if (parentId !== undefined && parentId.length > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.comments.replies(parentId) });
      }
    },
  });
}
