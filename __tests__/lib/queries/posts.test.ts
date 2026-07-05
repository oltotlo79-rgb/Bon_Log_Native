/**
 * lib/queries/posts のユニットテスト。
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { usePostQuery, useUserLikedPostsQuery } from '@/lib/queries/posts';
import { queryKeys } from '@/lib/queries/keys';

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
  return { Wrapper, queryClient };
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
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
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

// ---------------------------------------------------------------------------
// useUserLikedPostsQuery
// ---------------------------------------------------------------------------

describe('useUserLikedPostsQuery', () => {
  it('成功で items が返る', async () => {
    mockApiClientGet.mockResolvedValue({
      data: { items: [makePostDetail()], nextCursor: null },
      error: undefined,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserLikedPostsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
    expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/users/{id}/likes', {
      params: {
        path: { id: 'user-1' },
        query: { cursor: undefined, limit: expect.any(Number) },
      },
    });
  });

  it('userId が空文字の場合はフェッチしない（enabled=false）', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserLikedPostsQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  describe('キャッシュ分離', () => {
    it('異なる userId は独立したキャッシュキーを持つ', async () => {
      mockApiClientGet
        .mockResolvedValueOnce({
          data: { items: [{ ...makePostDetail(), id: 'liked-by-a' }], nextCursor: null },
          error: undefined,
        })
        .mockResolvedValueOnce({
          data: { items: [{ ...makePostDetail(), id: 'liked-by-b' }], nextCursor: null },
          error: undefined,
        });
      const { Wrapper, queryClient } = createWrapper();

      const { result: resultA } = renderHook(() => useUserLikedPostsQuery('user-a'), {
        wrapper: Wrapper,
      });
      const { result: resultB } = renderHook(() => useUserLikedPostsQuery('user-b'), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(resultA.current.isSuccess).toBe(true));
      await waitFor(() => expect(resultB.current.isSuccess).toBe(true));

      expect(resultA.current.data?.pages[0].items[0]?.id).toBe('liked-by-a');
      expect(resultB.current.data?.pages[0].items[0]?.id).toBe('liked-by-b');
      expect(
        queryClient.getQueryData(queryKeys.users.likes('user-a'))
      ).not.toEqual(queryClient.getQueryData(queryKeys.users.likes('user-b')));
    });
  });

  describe('404 伝播', () => {
    it('404 NOT_FOUND で ApiError が isError/error に伝播する', async () => {
      mockApiClientGet.mockResolvedValue({
        data: undefined,
        error: makeApiError('NOT_FOUND', 404),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useUserLikedPostsQuery('user-1'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('NOT_FOUND');
        expect(result.current.error.status).toBe(404);
      }
    });

    it('403（非公開アカウント）で ApiError の status=403 が伝播する', async () => {
      mockApiClientGet.mockResolvedValue({
        data: undefined,
        error: makeApiError('NOT_FOUND', 403),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useUserLikedPostsQuery('user-1'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.status).toBe(403);
      }
    });
  });
});
