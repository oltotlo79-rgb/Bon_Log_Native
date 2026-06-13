/**
 * lib/queries/notifications のユニットテスト。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useNotificationsQuery, useUnreadCountQuery } from '@/lib/queries/notifications';

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

function makeNotificationsPage(ids: string[], nextCursor: string | null) {
  return {
    items: ids.map((id) => ({
      id,
      type: 'LIKE',
      isRead: false,
      createdAt: '2025-06-01T10:00:00Z',
      actorId: 'user-2',
      postId: 'post-1',
      commentId: null,
      actor: { id: 'user-2', nickname: 'フォロワー', avatarUrl: null },
      post: { id: 'post-1', content: '黒松の記録' },
      comment: null,
    })),
    nextCursor,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useNotificationsQuery
// ---------------------------------------------------------------------------

describe('useNotificationsQuery', () => {
  it('成功で notifications が返る', async () => {
    const page = makeNotificationsPage(['notif-1', 'notif-2'], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('空レスポンスで hasNextPage が false', async () => {
    const page = makeNotificationsPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor が string の場合は hasNextPage が true', async () => {
    const page = makeNotificationsPage(['notif-1'], 'cursor-abc');
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('次ページ取得が実行される', async () => {
    const page1 = makeNotificationsPage(['notif-1'], 'cursor-abc');
    const page2 = makeNotificationsPage(['notif-2'], null);
    mockApiClientGet
      .mockResolvedValueOnce({ data: page1, error: undefined })
      .mockResolvedValueOnce({ data: page2, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

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

  it('403 GUEST_NOT_ALLOWED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('GUEST_NOT_ALLOWED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('GUEST_NOT_ALLOWED');
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useUnreadCountQuery
// ---------------------------------------------------------------------------

describe('useUnreadCountQuery', () => {
  it('成功で未読件数が返る', async () => {
    mockApiClientGet.mockResolvedValue({ data: { count: 5 }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(5);
  });

  it('未読なし（count: 0）', async () => {
    mockApiClientGet.mockResolvedValue({ data: { count: 0 }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(0);
  });

  it('403 GUEST_NOT_ALLOWED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('GUEST_NOT_ALLOWED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('GUEST_NOT_ALLOWED');
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
