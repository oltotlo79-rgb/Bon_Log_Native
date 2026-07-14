/**
 * lib/queries/analytics のユニットテスト。
 * 403 PREMIUM_REQUIRED の error 伝播・retry:false を重点的に検証する。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useAnalyticsSummaryQuery,
  useAnalyticsPostsQuery,
  useAnalyticsLikesQuery,
  useAnalyticsQuotesQuery,
  useAnalyticsKeywordsQuery,
  useAnalyticsEngagementTrendQuery,
  useAnalyticsGenrePerformanceQuery,
  useAnalyticsFollowerGrowthQuery,
  useAnalyticsPeriodComparisonQuery,
} from '@/lib/queries/analytics';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientGet = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
    POST: jest.fn(),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function makeApiError(code: MobileApiErrorCode, status: number): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

function makeAnalyticsSummary() {
  return {
    posts: {
      total: 42,
      totalLikes: 200,
      totalComments: 50,
      avgEngagement: 4.5,
      topPosts: [
        { id: 'p1', content: '黒松の春管理', likeCount: 30, commentCount: 10 },
        { id: 'p2', content: '五葉松の剪定', likeCount: 25, commentCount: 8 },
      ],
    },
    followers: {
      current: 150,
      newInPeriod: 10,
      growth: [
        { date: '2025-05-01', newFollowers: 2 },
        { date: '2025-05-08', newFollowers: 3 },
      ],
    },
    engagementTrend: [
      { date: '2025-05-01', engagement: 15 },
      { date: '2025-05-08', engagement: 20 },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useAnalyticsSummaryQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsSummaryQuery', () => {
  it('デフォルト期間（30日）で成功する', async () => {
    const data = makeAnalyticsSummary();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.posts.total).toBe(42);
    expect(result.current.data?.followers.current).toBe(150);
  });

  it('期間 7 日でクエリが成功する', async () => {
    const data = makeAnalyticsSummary();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery('7'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/analytics/summary',
      expect.objectContaining({ params: { query: { days: '7' } } })
    );
  });

  it('期間 90 日でクエリが成功する', async () => {
    const data = makeAnalyticsSummary();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery('90'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/analytics/summary',
      expect.objectContaining({ params: { query: { days: '90' } } })
    );
  });

  it('403 PREMIUM_REQUIRED が error として伝播する（リトライしない）', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
      expect(result.current.error.status).toBe(403);
    }
    // retry:false のため API 呼び出しは 1 回のみ
    expect(mockApiClientGet).toHaveBeenCalledTimes(1);
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('500 INTERNAL_ERROR で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('topPosts が空配列のデータも正常に返る', async () => {
    const data = {
      ...makeAnalyticsSummary(),
      posts: {
        total: 0,
        totalLikes: 0,
        totalComments: 0,
        avgEngagement: 0,
        topPosts: [],
      },
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.posts.topPosts).toHaveLength(0);
  });

  it('followers.growth が空配列でも成功する', async () => {
    const data = {
      ...makeAnalyticsSummary(),
      followers: { current: 50, newInPeriod: 0, growth: [] },
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsSummaryQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.followers.growth).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// データファクトリ（8フック共通）
// ---------------------------------------------------------------------------

function makeAnalyticsPostsResponse() {
  return {
    totalPosts: 10,
    totalLikes: 50,
    totalComments: 20,
    avgEngagement: 7.0,
    topPosts: [
      { id: 'post-1', content: '黒松の春管理', createdAt: '2025-06-01T10:00:00Z', likeCount: 10, commentCount: 5 },
    ],
    posts: [
      { id: 'post-1', content: '黒松の春管理', createdAt: '2025-06-01T10:00:00Z', likeCount: 10, commentCount: 5 },
    ],
  };
}

function makeAnalyticsLikesResponse() {
  return {
    totalLikes: 100,
    hourlyData: Array.from({ length: 24 }, (_, i) => i),
    weekdayData: [10, 15, 12, 18, 20, 25, 22],
    dailyData: [{ date: '2025-06-01', count: 5 }],
    peakHour: 20,
    peakWeekday: 5,
  };
}

function makeAnalyticsQuotesResponse() {
  return {
    totalQuotes: 3,
    totalReposts: 7,
    quotes: [
      {
        id: 'quote-1',
        content: '引用投稿です',
        user: { id: 'user-2', nickname: '盆栽花子', avatarUrl: null },
        originalPostId: 'post-1',
        originalContent: '元の投稿',
        likeCount: 2,
        commentCount: 0,
        createdAt: '2025-06-01T10:00:00Z',
      },
    ],
  };
}

function makeAnalyticsKeywordsResponse() {
  return {
    keywords: [
      { word: '黒松', count: 15 },
      { word: '剪定', count: 10 },
    ],
    totalWords: 200,
    uniqueWords: 80,
  };
}

function makeAnalyticsEngagementTrendResponse() {
  return {
    trend: [
      { date: '2025-06-01', posts: 2, likes: 10, comments: 5, engagement: 15 },
      { date: '2025-06-02', posts: 0, likes: 0, comments: 0, engagement: 0 },
    ],
  };
}

function makeAnalyticsGenrePerformanceResponse() {
  return {
    genres: [
      { name: '松柏類', postCount: 5, avgLikes: 8.0, avgComments: 3.0, avgEngagement: 11.0 },
      { name: '雑木類', postCount: 3, avgLikes: 4.0, avgComments: 2.0, avgEngagement: 6.0 },
    ],
  };
}

function makeAnalyticsFollowerGrowthResponse() {
  return {
    currentFollowers: 150,
    totalNewInPeriod: 10,
    growth: [
      { date: '2025-06-01', newFollowers: 2, totalFollowers: 148 },
      { date: '2025-06-02', newFollowers: 3, totalFollowers: 151 },
    ],
  };
}

function makeAnalyticsPeriodComparisonResponse() {
  return {
    posts: { current: 10, previous: 8, change: 25 },
    likes: { current: 50, previous: 40, change: 25 },
    comments: { current: 20, previous: 15, change: 33 },
    followers: { current: 5, previous: 3, change: 67 },
  };
}

// ---------------------------------------------------------------------------
// useAnalyticsPostsQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsPostsQuery', () => {
  it('成功でデータが返る', async () => {
    const data = makeAnalyticsPostsResponse();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsPostsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPosts).toBe(10);
    expect(result.current.data?.topPosts).toHaveLength(1);
  });

  it('days=7 を渡すと API クエリに days: "7" が含まれる', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsPostsResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsPostsQuery(7), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [, options] = mockApiClientGet.mock.calls[0];
    expect(options?.params?.query?.days).toBe('7');
  });

  it('days=90 を渡すと API クエリに days: "90" が含まれる', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsPostsResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsPostsQuery(90), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [, options] = mockApiClientGet.mock.calls[0];
    expect(options?.params?.query?.days).toBe('90');
  });

  it('403 PREMIUM_REQUIRED エラーがそのまま伝播する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsPostsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
      expect(result.current.error.status).toBe(403);
    }
  });
});

// ---------------------------------------------------------------------------
// useAnalyticsLikesQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsLikesQuery', () => {
  it('成功でデータが返る', async () => {
    const data = makeAnalyticsLikesResponse();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsLikesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalLikes).toBe(100);
    expect(result.current.data?.hourlyData).toHaveLength(24);
    expect(result.current.data?.weekdayData).toHaveLength(7);
  });

  it('days=7 を渡すと API クエリに days: "7" が含まれる', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsLikesResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsLikesQuery(7), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [, options] = mockApiClientGet.mock.calls[0];
    expect(options?.params?.query?.days).toBe('7');
  });

  it('403 PREMIUM_REQUIRED エラーがそのまま伝播する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsLikesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useAnalyticsQuotesQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsQuotesQuery', () => {
  it('成功でデータが返る', async () => {
    const data = makeAnalyticsQuotesResponse();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsQuotesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalQuotes).toBe(3);
    expect(result.current.data?.totalReposts).toBe(7);
    expect(result.current.data?.quotes).toHaveLength(1);
  });

  it('days パラメータを API に渡さない（全期間集計）', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsQuotesResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsQuotesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [endpoint, options] = mockApiClientGet.mock.calls[0];
    expect(endpoint).toBe('/api/v1/analytics/quotes');
    // quotes エンドポイントは days パラメータを受け付けない（全期間集計）
    const queryParams = options?.params?.query;
    expect(queryParams?.days).toBeUndefined();
  });

  it('403 PREMIUM_REQUIRED エラーがそのまま伝播する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsQuotesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useAnalyticsKeywordsQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsKeywordsQuery', () => {
  it('成功でデータが返る', async () => {
    const data = makeAnalyticsKeywordsResponse();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsKeywordsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.keywords).toHaveLength(2);
    expect(result.current.data?.keywords[0].word).toBe('黒松');
    expect(result.current.data?.totalWords).toBe(200);
  });

  it('days=30 を渡すと API クエリに days: "30" が含まれる', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsKeywordsResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsKeywordsQuery(30), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [, options] = mockApiClientGet.mock.calls[0];
    expect(options?.params?.query?.days).toBe('30');
  });

  it('403 PREMIUM_REQUIRED エラーがそのまま伝播する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsKeywordsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useAnalyticsEngagementTrendQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsEngagementTrendQuery', () => {
  it('成功でデータが返る', async () => {
    const data = makeAnalyticsEngagementTrendResponse();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsEngagementTrendQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.trend).toHaveLength(2);
    expect(result.current.data?.trend[0].date).toBe('2025-06-01');
  });

  it('days=7 を渡すと API クエリに days: "7" が含まれる', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsEngagementTrendResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsEngagementTrendQuery(7), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [, options] = mockApiClientGet.mock.calls[0];
    expect(options?.params?.query?.days).toBe('7');
  });

  it('403 PREMIUM_REQUIRED エラーがそのまま伝播する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsEngagementTrendQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useAnalyticsGenrePerformanceQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsGenrePerformanceQuery', () => {
  it('成功でデータが返る', async () => {
    const data = makeAnalyticsGenrePerformanceResponse();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsGenrePerformanceQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.genres).toHaveLength(2);
    expect(result.current.data?.genres[0].name).toBe('松柏類');
  });

  it('days=90 を渡すと API クエリに days: "90" が含まれる', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsGenrePerformanceResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsGenrePerformanceQuery(90), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [, options] = mockApiClientGet.mock.calls[0];
    expect(options?.params?.query?.days).toBe('90');
  });

  it('403 PREMIUM_REQUIRED エラーがそのまま伝播する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsGenrePerformanceQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useAnalyticsFollowerGrowthQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsFollowerGrowthQuery', () => {
  it('成功でデータが返る', async () => {
    const data = makeAnalyticsFollowerGrowthResponse();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsFollowerGrowthQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.currentFollowers).toBe(150);
    expect(result.current.data?.totalNewInPeriod).toBe(10);
    expect(result.current.data?.growth).toHaveLength(2);
  });

  it('days=30 を渡すと API クエリに days: "30" が含まれる', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsFollowerGrowthResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsFollowerGrowthQuery(30), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [, options] = mockApiClientGet.mock.calls[0];
    expect(options?.params?.query?.days).toBe('30');
  });

  it('403 PREMIUM_REQUIRED エラーがそのまま伝播する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsFollowerGrowthQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useAnalyticsPeriodComparisonQuery
// ---------------------------------------------------------------------------

describe('useAnalyticsPeriodComparisonQuery', () => {
  it('成功でデータが返る', async () => {
    const data = makeAnalyticsPeriodComparisonResponse();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsPeriodComparisonQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.posts.current).toBe(10);
    expect(result.current.data?.likes.change).toBe(25);
    expect(result.current.data?.followers.previous).toBe(3);
  });

  it('days=7 を渡すと API クエリに days: "7" が含まれる', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeAnalyticsPeriodComparisonResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useAnalyticsPeriodComparisonQuery(7), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const [, options] = mockApiClientGet.mock.calls[0];
    expect(options?.params?.query?.days).toBe('7');
  });

  it('change が null の場合もデータとして受け取れる（前期・現期ともに 0 のケース）', async () => {
    const data = {
      posts: { current: 0, previous: 0, change: null },
      likes: { current: 0, previous: 0, change: null },
      comments: { current: 0, previous: 0, change: null },
      followers: { current: 0, previous: 0, change: null },
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsPeriodComparisonQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.posts.change).toBeNull();
    expect(result.current.data?.likes.change).toBeNull();
  });

  it('403 PREMIUM_REQUIRED エラーがそのまま伝播する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('PREMIUM_REQUIRED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAnalyticsPeriodComparisonQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});
