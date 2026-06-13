/**
 * @module lib/queries/users
 * ユーザープロフィールクエリフック。
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type UserProfile = components['schemas']['UserProfileResponse'];

/**
 * 公開ユーザープロフィールクエリ（GET /api/v1/users/{id}）。
 * email 等の非公開フィールドは含まない（auth.ts の useCurrentUserQuery を使うこと）。
 * id が空文字の場合はフェッチを行わない（enabled=false）。
 */
export function useUserProfileQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/users/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching user profile');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    enabled: id.length > 0,
  });
}
