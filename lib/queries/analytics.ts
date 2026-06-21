/**
 * @module lib/queries/analytics
 * 投稿分析サマリのクエリフック（プレミアム会員限定）。
 * 403 PREMIUM_REQUIRED を error としてそのまま伝播させ、frontend が判別して
 * プレミアム誘導 UI を表示する（billing.md）。
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, type AnalyticsDays } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type AnalyticsSummaryResponse = components['schemas']['AnalyticsSummaryResponse'];

const ANALYTICS_DEFAULT_DAYS: AnalyticsDays = '30';

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
