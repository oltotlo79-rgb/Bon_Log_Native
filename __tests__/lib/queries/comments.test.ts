/**
 * lib/queries/comments のユニットテスト。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useCommentsQuery, useCommentRepliesQuery } from '@/lib/queries/comments';
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

function makeCommentsPage(ids: string[], nextCursor: string | null) {
  return {
    items: ids.map((id) => ({
      id,
      postId: 'post-1',
      userId: 'user-1',
      parentId: null,
      content: 'コメントです',
      createdAt: '2025-06-01T10:00:00Z',
      updatedAt: '2025-06-01T10:00:00Z',
      isDeleted: false,
      isBlockedUser: false,
      likeCount: 0,
      replyCount: 0,
      isLiked: false,
      user: { id: 'user-1', nickname: '松の匠', avatarUrl: null },
      media: [],
    })),
    nextCursor,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCommentsQuery', () => {
  it('成功で items が返る', async () => {
    const page = makeCommentsPage(['comment-1', 'comment-2'], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentsQuery('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('空レスポンスで hasNextPage が false', async () => {
    const page = makeCommentsPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentsQuery('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor が string の場合は hasNextPage が true', async () => {
    const page = makeCommentsPage(['comment-1'], 'cursor-xyz');
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentsQuery('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('次ページ取得が実行される', async () => {
    const page1 = makeCommentsPage(['comment-1'], 'cursor-xyz');
    const page2 = makeCommentsPage(['comment-2'], null);
    mockApiClientGet
      .mockResolvedValueOnce({ data: page1, error: undefined })
      .mockResolvedValueOnce({ data: page2, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentsQuery('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.fetchNextPage();
    });

    await waitFor(
      () => {
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.data?.pages).toHaveLength(2);
      },
      { timeout: 5000 }
    );
  });

  it('postId が空文字の場合はフェッチしない（enabled=false）', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentsQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('403 ACCOUNT_SUSPENDED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('ACCOUNT_SUSPENDED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentsQuery('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentsQuery('post-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useCommentRepliesQuery
// ---------------------------------------------------------------------------

describe('useCommentRepliesQuery', () => {
  it('成功で返信 items が返る', async () => {
    const page = makeCommentsPage(['reply-1', 'reply-2'], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentRepliesQuery('comment-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
    expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/comments/{id}/replies', {
      params: {
        path: { id: 'comment-1' },
        query: { cursor: undefined, limit: expect.any(Number) },
      },
    });
  });

  it('commentId が空文字の場合はフェッチしない（enabled=false）', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCommentRepliesQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  describe('キャッシュ分離', () => {
    it('異なる commentId は独立したキャッシュキーを持つ', async () => {
      const pageA = makeCommentsPage(['reply-a'], null);
      const pageB = makeCommentsPage(['reply-b'], null);
      mockApiClientGet
        .mockResolvedValueOnce({ data: pageA, error: undefined })
        .mockResolvedValueOnce({ data: pageB, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      const { result: resultA } = renderHook(() => useCommentRepliesQuery('comment-a'), {
        wrapper: Wrapper,
      });
      const { result: resultB } = renderHook(() => useCommentRepliesQuery('comment-b'), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(resultA.current.isSuccess).toBe(true));
      await waitFor(() => expect(resultB.current.isSuccess).toBe(true));

      expect(resultA.current.data?.pages[0].items[0]?.id).toBe('reply-a');
      expect(resultB.current.data?.pages[0].items[0]?.id).toBe('reply-b');

      // キャッシュキーが commentId ごとに分離されていることを直接確認する
      expect(
        queryClient.getQueryData(queryKeys.comments.replies('comment-a'))
      ).not.toEqual(queryClient.getQueryData(queryKeys.comments.replies('comment-b')));
    });
  });

  describe('404 伝播', () => {
    it('404 NOT_FOUND で ApiError が isError/error に伝播する', async () => {
      mockApiClientGet.mockResolvedValue({
        data: undefined,
        error: makeApiError('NOT_FOUND', 404),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useCommentRepliesQuery('comment-1'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('NOT_FOUND');
        expect(result.current.error.status).toBe(404);
      }
    });
  });
});
