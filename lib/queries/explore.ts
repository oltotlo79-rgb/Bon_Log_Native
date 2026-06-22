/**
 * @module lib/queries/explore
 * 発見（explore）画面のクエリフック。
 * トレンドハッシュタグ・トレンドジャンル・おすすめユーザー・ハッシュタグ/ジャンル別投稿の取得を担う。
 * ゲスト可（recommendedUsers はゲスト時に空配列を返す）。
 */

import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_REALTIME } from '@/lib/constants/query';
import {
  TRENDING_HASHTAGS_LIMIT,
  TRENDING_GENRES_LIMIT,
  RECOMMENDED_USERS_LIMIT,
  EXPLORE_POSTS_PAGE_SIZE,
} from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';
import type { ExplorePostsParams } from '@/lib/queries/keys';

export type TrendingHashtagsResponse = components['schemas']['TrendingHashtagsResponse'];
export type TrendingGenresResponse = components['schemas']['TrendingGenresResponse'];
export type RecommendedUsersResponse = components['schemas']['RecommendedUsersResponse'];
export type ExplorePostsResponse = components['schemas']['ExplorePostsResponse'];

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

/**
 * ハッシュタグまたはジャンル別の投稿一覧を取得する無限スクロールクエリ（ゲスト可）。
 * params は { hashtag } か { genreId } のどちらか一方（排他）。
 * 両方指定 / 両方未指定はサーバーが 400 を返すためフック呼び出し側で保証すること。
 */
export function useExplorePostsQuery(params: ExplorePostsParams) {
  return useInfiniteQuery<
    ExplorePostsResponse,
    Error,
    InfiniteData<ExplorePostsResponse>,
    ReturnType<typeof queryKeys.explore.posts>,
    string | undefined
  >({
    queryKey: queryKeys.explore.posts(params),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/explore/posts', {
        params: {
          query: {
            hashtag: 'hashtag' in params ? params.hashtag : undefined,
            genreId: 'genreId' in params ? params.genreId : undefined,
            cursor: pageParam ?? undefined,
            limit: EXPLORE_POSTS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching explore posts');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_REALTIME,
  });
}
