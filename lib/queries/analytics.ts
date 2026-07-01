/**
 * @module lib/queries/analytics
 * 投稿分析クエリフック群（プレミアム会員限定）。
 * 403 PREMIUM_REQUIRED を error としてそのまま伝播させ、frontend が判別して
 * プレミアム誘導 UI を表示する（billing.md）。
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, type AnalyticsDays, type AnalyticsPeriod } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type AnalyticsSummaryResponse = components['schemas']['AnalyticsSummaryResponse'];
export type AnalyticsPostsResponse = components['schemas']['AnalyticsPostsResponse'];
export type AnalyticsLikesResponse = components['schemas']['AnalyticsLikesResponse'];
export type AnalyticsQuotesResponse = components['schemas']['AnalyticsQuotesResponse'];
export type AnalyticsKeywordsResponse = components['schemas']['AnalyticsKeywordsResponse'];
export type AnalyticsEngagementTrendResponse = components['schemas']['AnalyticsEngagementTrendResponse'];
export type AnalyticsGenrePerformanceResponse = components['schemas']['AnalyticsGenrePerformanceResponse'];
export type AnalyticsFollowerGrowthResponse = components['schemas']['AnalyticsFollowerGrowthResponse'];
export type AnalyticsPeriodComparisonResponse = components['schemas']['AnalyticsPeriodComparisonResponse'];

const ANALYTICS_DEFAULT_DAYS: AnalyticsDays = '30';
const ANALYTICS_DEFAULT_PERIOD: AnalyticsPeriod = 30;

/** AnalyticsPeriod（数値）を API クエリパラメータ用の AnalyticsDays（文字列）へ変換する。 */
function toAnalyticsDays(period: AnalyticsPeriod): AnalyticsDays {
  return String(period) as AnalyticsDays;
}

export function useAnalyticsSummaryQuery(days: AnalyticsDays = ANALYTICS_DEFAULT_DAYS) {
  return useQuery<AnalyticsSummaryResponse, Error>({
    queryKey: queryKeys.analytics.summary(days),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/summary', {
        params: { query: { days } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics summary');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    // 403 PREMIUM_REQUIRED を含む全エラーをそのまま伝播させる（握りつぶさない）
    retry: false,
  });
}

export function useAnalyticsPostsQuery(days: AnalyticsPeriod = ANALYTICS_DEFAULT_PERIOD) {
  const daysStr = toAnalyticsDays(days);
  return useQuery<AnalyticsPostsResponse, Error>({
    queryKey: queryKeys.analytics.posts(days),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/posts', {
        params: { query: { days: daysStr } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics posts');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    retry: false,
  });
}

export function useAnalyticsLikesQuery(days: AnalyticsPeriod = ANALYTICS_DEFAULT_PERIOD) {
  const daysStr = toAnalyticsDays(days);
  return useQuery<AnalyticsLikesResponse, Error>({
    queryKey: queryKeys.analytics.likes(days),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/likes', {
        params: { query: { days: daysStr } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics likes');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    retry: false,
  });
}

// quotes は全期間集計のため days パラメータなし（スキーマで query?: never）
export function useAnalyticsQuotesQuery() {
  return useQuery<AnalyticsQuotesResponse, Error>({
    queryKey: queryKeys.analytics.quotes,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/quotes', {});
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics quotes');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    retry: false,
  });
}

export function useAnalyticsKeywordsQuery(days: AnalyticsPeriod = ANALYTICS_DEFAULT_PERIOD) {
  const daysStr = toAnalyticsDays(days);
  return useQuery<AnalyticsKeywordsResponse, Error>({
    queryKey: queryKeys.analytics.keywords(days),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/keywords', {
        params: { query: { days: daysStr } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics keywords');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    retry: false,
  });
}

export function useAnalyticsEngagementTrendQuery(days: AnalyticsPeriod = ANALYTICS_DEFAULT_PERIOD) {
  const daysStr = toAnalyticsDays(days);
  return useQuery<AnalyticsEngagementTrendResponse, Error>({
    queryKey: queryKeys.analytics.engagementTrend(days),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/engagement-trend', {
        params: { query: { days: daysStr } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics engagement trend');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    retry: false,
  });
}

export function useAnalyticsGenrePerformanceQuery(days: AnalyticsPeriod = ANALYTICS_DEFAULT_PERIOD) {
  const daysStr = toAnalyticsDays(days);
  return useQuery<AnalyticsGenrePerformanceResponse, Error>({
    queryKey: queryKeys.analytics.genrePerformance(days),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/genre-performance', {
        params: { query: { days: daysStr } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics genre performance');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    retry: false,
  });
}

export function useAnalyticsFollowerGrowthQuery(days: AnalyticsPeriod = ANALYTICS_DEFAULT_PERIOD) {
  const daysStr = toAnalyticsDays(days);
  return useQuery<AnalyticsFollowerGrowthResponse, Error>({
    queryKey: queryKeys.analytics.followerGrowth(days),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/follower-growth', {
        params: { query: { days: daysStr } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics follower growth');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    retry: false,
  });
}

export function useAnalyticsPeriodComparisonQuery(days: AnalyticsPeriod = ANALYTICS_DEFAULT_PERIOD) {
  const daysStr = toAnalyticsDays(days);
  return useQuery<AnalyticsPeriodComparisonResponse, Error>({
    queryKey: queryKeys.analytics.periodComparison(days),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/analytics/period-comparison', {
        params: { query: { days: daysStr } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching analytics period comparison');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    retry: false,
  });
}
