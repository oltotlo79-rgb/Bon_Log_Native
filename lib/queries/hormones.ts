/**
 * @module lib/queries/hormones
 * 植物ホルモンのクエリフック。
 * 一覧は全件返却（カーソルなし）。詳細は slug 指定。ゲスト可。
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_MASTER } from '@/lib/constants/query';
import type { components } from '@/lib/api/generated/schema.d.ts';
import type { paths } from '@/lib/api/client';

export type HormoneDetail = components['schemas']['HormoneDetail'];

type HormonesResponse =
  paths['/api/v1/hormones']['get']['responses']['200']['content']['application/json'];

export function useHormonesQuery(category?: string) {
  return useQuery<HormonesResponse, Error>({
    queryKey: queryKeys.hormones.list(category),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/hormones', {
        params: {
          query: { category: category ?? undefined },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormones');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
  });
}

export function useHormoneDetailQuery(slug: string) {
  return useQuery<HormoneDetail, Error>({
    queryKey: queryKeys.hormones.detail(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/hormones/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching hormone detail');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
    enabled: slug.length > 0,
  });
}
