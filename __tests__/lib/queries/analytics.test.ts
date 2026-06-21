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
import { useAnalyticsSummaryQuery } from '@/lib/queries/analytics';
import type { AnalyticsDays } from '@/lib/queries/keys';

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

    const { result } = renderHook(
      () => useAnalyticsSummaryQuery('7' as AnalyticsDays),
      { wrapper: Wrapper }
    );

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

    const { result } = renderHook(
      () => useAnalyticsSummaryQuery('90' as AnalyticsDays),
      { wrapper: Wrapper }
    );

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
