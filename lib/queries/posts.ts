/**
 * @module lib/queries/posts
 * 投稿詳細クエリフック。
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type PostDetail = components['schemas']['PostResponse'];

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
