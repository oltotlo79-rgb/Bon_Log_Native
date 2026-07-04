/**
 * lib/queries/comments の useUserCommentsQuery ユニットテスト。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useUserCommentsQuery } from '@/lib/queries/comments';

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

function makeUserCommentsPage(
  ids: string[],
  nextCursor: string | null,
  overridePost?: { id: string; content: string | null } | null
) {
  return {
    items: ids.map((id) => ({
      id,
      content: 'コメントです',
      createdAt: '2025-06-01T10:00:00Z',
      post: overridePost === undefined ? { id: 'post-1', content: '投稿本文' } : overridePost,
    })),
    nextCursor,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useUserCommentsQuery', () => {
  it('成功で items が返る', async () => {
    const page = makeUserCommentsPage(['comment-1', 'comment-2'], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('post が id と content のみで構成される', async () => {
    const page = makeUserCommentsPage(['comment-1'], null, { id: 'post-9', content: '本文テキスト' });
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const item = result.current.data?.pages[0].items[0];
    expect(item?.post).toEqual({ id: 'post-9', content: '本文テキスト' });
  });

  it('post.content が null でも取得できる', async () => {
    const page = makeUserCommentsPage(['comment-1'], null, { id: 'post-9', content: null });
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items[0].post.content).toBeNull();
  });

  it('空レスポンスで hasNextPage が false', async () => {
    const page = makeUserCommentsPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor が string の場合は hasNextPage が true', async () => {
    const page = makeUserCommentsPage(['comment-1'], 'cursor-xyz');
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('次ページ取得が実行される', async () => {
    const page1 = makeUserCommentsPage(['comment-1'], 'cursor-xyz');
    const page2 = makeUserCommentsPage(['comment-2'], null);
    mockApiClientGet
      .mockResolvedValueOnce({ data: page1, error: undefined })
      .mockResolvedValueOnce({ data: page2, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery('user-1'), { wrapper: Wrapper });

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

  it('userId が空文字の場合はフェッチしない（enabled=false）', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('403 ACCOUNT_SUSPENDED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('ACCOUNT_SUSPENDED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserCommentsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_REQUIRED');
    }
  });
});
