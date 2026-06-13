/**
 * @module lib/queries/comments
 * コメント一覧の無限スクロールクエリフック。
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { COMMENTS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type CommentItem = components['schemas']['CommentsListResponse']['items'][number];

/**
 * 投稿に対するコメント一覧の無限スクロールクエリ。
 * postId が空文字の場合はフェッチを行わない（enabled=false）。
 */
export function useCommentsQuery(postId: string) {
  return useInfiniteQuery({
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
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: postId.length > 0,
  });
}
