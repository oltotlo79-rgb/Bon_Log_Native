/**
 * @module lib/queries/explore
 * 発見（explore）画面のクエリフック。
 * トレンドハッシュタグ・トレンドジャンル・おすすめユーザーの取得を担う。
 * ゲスト可（recommendedUsers はゲスト時に空配列を返す）。
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_REALTIME } from '@/lib/constants/query';
import {
  TRENDING_HASHTAGS_LIMIT,
  TRENDING_GENRES_LIMIT,
  RECOMMENDED_USERS_LIMIT,
} from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type TrendingHashtagsResponse = components['schemas']['TrendingHashtagsResponse'];
export type TrendingGenresResponse = components['schemas']['TrendingGenresResponse'];
export type RecommendedUsersResponse = components['schemas']['RecommendedUsersResponse'];

export function useTrendingHashtagsQuery() {
  return useQuery<TrendingHashtagsResponse, Error>({
    queryKey: queryKeys.explore.trendingHashtags,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/explore/trending-hashtags', {
        params: { query: { limit: TRENDING_HASHTAGS_LIMIT } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching trending hashtags');
      }
      return data;
    },
    staleTime: STALE_TIME_REALTIME,
  });
}

export function useTrendingGenresQuery() {
  return useQuery<TrendingGenresResponse, Error>({
    queryKey: queryKeys.explore.trendingGenres,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/explore/trending-genres', {
        params: { query: { limit: TRENDING_GENRES_LIMIT } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching trending genres');
      }
      return data;
    },
    staleTime: STALE_TIME_REALTIME,
  });
}

export function useRecommendedUsersQuery() {
  return useQuery<RecommendedUsersResponse, Error>({
    queryKey: queryKeys.explore.recommendedUsers,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/explore/recommended-users', {
        params: { query: { limit: RECOMMENDED_USERS_LIMIT } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching recommended users');
      }
      return data;
    },
    staleTime: STALE_TIME_REALTIME,
  });
}
