/**
 * lib/queries/posts のユニットテスト。
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { usePostQuery } from '@/lib/queries/posts';

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

function createWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper };
}

function makeApiError(code: MobileApiErrorCode, status: number): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

function makePostDetail() {
  return {
    id: 'post-1',
    content: '黒松の春管理',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null },
    media: [],
    genres: [],
    likeCount: 5,
    commentCount: 2,
    repostCount: 0,
    isLiked: false,
    isBookmarked: false,
    isReposted: false,
    quotePost: null,
    repostPost: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('usePostQuery', () => {
  it('成功で投稿詳細が返る', async () => {
    const post = makePostDetail();
    mockApiClientGet.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePostQuery('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('post-1');
    expect(result.current.data?.likeCount).toBe(5);
  });

  it('id が空文字の場合はフェッチしない（enabled=false）', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePostQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePostQuery('post-nonexistent'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('NOT_FOUND');
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePostQuery('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
