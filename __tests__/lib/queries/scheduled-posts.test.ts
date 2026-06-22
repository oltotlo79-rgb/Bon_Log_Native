/**
 * lib/queries/scheduled-posts のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 * 403 PREMIUM_REQUIRED / 400 上限超過の伝播を検証する。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  useScheduledPostsQuery,
  useScheduledPostDetailQuery,
  useCreateScheduledPostMutation,
  useUpdateScheduledPostMutation,
  useDeleteScheduledPostMutation,
  useCancelScheduledPostMutation,
} from '@/lib/queries/scheduled-posts';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientGet = jest.fn();
const mockApiClientPost = jest.fn();
const mockApiClientPatch = jest.fn();
const mockApiClientDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
    POST: (...args: unknown[]) => mockApiClientPost(...args),
    PATCH: (...args: unknown[]) => mockApiClientPatch(...args),
    DELETE: (...args: unknown[]) => mockApiClientDelete(...args),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

// ---------------------------------------------------------------------------
// 型エイリアス
// ---------------------------------------------------------------------------

type ScheduledPostItem = components['schemas']['ScheduledPostItem'];
type ScheduledPostListResponse = components['schemas']['ScheduledPostListResponse'];
type ScheduledPostCreatedResponse = components['schemas']['ScheduledPostCreatedResponse'];

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function makeApiError(code: MobileApiErrorCode, status: number): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

function makeScheduledPostItem(id: string, status: ScheduledPostItem['status'] = 'pending'): ScheduledPostItem {
  return {
    id,
    content: '予約投稿テスト',
    scheduledAt: '2025-09-01T10:00:00Z',
    status,
    media: [],
    genres: [],
    publishedPostId: null,
    createdAt: '2025-06-01T00:00:00Z',
  };
}

function makeScheduledPostsPage(items: ScheduledPostItem[]): InfiniteData<ScheduledPostListResponse> {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useScheduledPostsQuery
// ---------------------------------------------------------------------------

describe('useScheduledPostsQuery', () => {
  it('正常系: 予約投稿一覧が返される', async () => {
    const page: ScheduledPostListResponse = {
      items: [makeScheduledPostItem('sp-1'), makeScheduledPostItem('sp-2')],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useScheduledPostsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('空一覧: items が空配列', async () => {
    const page: ScheduledPostListResponse = { items: [], nextCursor: null };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useScheduledPostsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(0);
  });

  it('fetchNextPage: nextCursor がある場合に次ページを取得できる', async () => {
    const firstPage: ScheduledPostListResponse = {
      items: [makeScheduledPostItem('sp-1')],
      nextCursor: 'cursor-abc',
    };
    const secondPage: ScheduledPostListResponse = {
      items: [makeScheduledPostItem('sp-2')],
      nextCursor: null,
    };
    mockApiClientGet
      .mockResolvedValueOnce({ data: firstPage, error: undefined })
      .mockResolvedValueOnce({ data: secondPage, error: undefined });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledPostsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });

  it('403 PREMIUM_REQUIRED で isError=true になる（リトライなし）', async () => {
    const err = makeApiError('PREMIUM_REQUIRED', 403);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useScheduledPostsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useScheduledPostDetailQuery
// ---------------------------------------------------------------------------

describe('useScheduledPostDetailQuery', () => {
  it('正常系: 詳細が返される', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeScheduledPostItem('sp-1'), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useScheduledPostDetailQuery('sp-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('sp-1');
  });

  it('id が空文字のときフェッチしない（enabled=false）', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useScheduledPostDetailQuery(''), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('403 PREMIUM_REQUIRED で isError=true になる', async () => {
    const err = makeApiError('PREMIUM_REQUIRED', 403);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useScheduledPostDetailQuery('sp-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });

  it('404 NOT_FOUND で isError=true になる', async () => {
    const err = makeApiError('NOT_FOUND', 404);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useScheduledPostDetailQuery('sp-999'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useCreateScheduledPostMutation
// ---------------------------------------------------------------------------

describe('useCreateScheduledPostMutation', () => {
  it('正常系: POST を呼び成功する', async () => {
    const created: ScheduledPostCreatedResponse = { id: 'sp-new' };
    mockApiClientPost.mockResolvedValue({ data: created, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        content: '予約投稿テスト',
        scheduledAt: '2025-09-01T10:00:00Z',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/scheduled-posts', expect.anything());
  });

  it('onSettled: scheduledPosts.list が invalidate される', async () => {
    const created: ScheduledPostCreatedResponse = { id: 'sp-new' };
    mockApiClientPost.mockResolvedValue({ data: created, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.scheduledPosts.list(), makeScheduledPostsPage([]));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        content: 'テスト',
        scheduledAt: '2025-09-01T10:00:00Z',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.scheduledPosts.list() })
    );
  });

  it('403 PREMIUM_REQUIRED で isError=true になる', async () => {
    const err = makeApiError('PREMIUM_REQUIRED', 403);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        content: 'テスト',
        scheduledAt: '2025-09-01T10:00:00Z',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });

  it('400 VALIDATION_ERROR（上限超過）で isError=true になる', async () => {
    const err = makeApiError('VALIDATION_ERROR', 400);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        content: 'テスト',
        scheduledAt: '2025-09-01T10:00:00Z',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

// ---------------------------------------------------------------------------
// useUpdateScheduledPostMutation
// ---------------------------------------------------------------------------

describe('useUpdateScheduledPostMutation', () => {
  it('正常系: PATCH を呼び成功する', async () => {
    mockApiClientPatch.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        id: 'sp-1',
        content: '更新テスト',
        scheduledAt: '2025-10-01T10:00:00Z',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPatch).toHaveBeenCalledWith(
      '/api/v1/scheduled-posts/{id}',
      expect.anything()
    );
  });

  it('onSettled: scheduledPosts.detail(id) と scheduledPosts.list が invalidate される', async () => {
    mockApiClientPatch.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        id: 'sp-1',
        content: '更新',
        scheduledAt: '2025-10-01T10:00:00Z',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.scheduledPosts.detail('sp-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.scheduledPosts.list() })
    );
  });

  it('403 PREMIUM_REQUIRED で isError=true になる', async () => {
    const err = makeApiError('PREMIUM_REQUIRED', 403);
    mockApiClientPatch.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        id: 'sp-1',
        content: '更新',
        scheduledAt: '2025-10-01T10:00:00Z',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// useDeleteScheduledPostMutation
// ---------------------------------------------------------------------------

describe('useDeleteScheduledPostMutation', () => {
  it('正常系: DELETE を呼び成功する', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'sp-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientDelete).toHaveBeenCalledWith(
      '/api/v1/scheduled-posts/{id}',
      expect.anything()
    );
  });

  it('onSettled: scheduledPosts.list が invalidate される', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'sp-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.scheduledPosts.list() })
    );
  });

  it('400 VALIDATION_ERROR（published 状態の削除不可）で isError=true になる', async () => {
    const err = makeApiError('VALIDATION_ERROR', 400);
    mockApiClientDelete.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'sp-published' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

// ---------------------------------------------------------------------------
// useCancelScheduledPostMutation
// ---------------------------------------------------------------------------

describe('useCancelScheduledPostMutation', () => {
  it('正常系: POST /cancel を呼び成功する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCancelScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'sp-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith(
      '/api/v1/scheduled-posts/{id}/cancel',
      expect.anything()
    );
  });

  it('onSettled: scheduledPosts.detail(id) と scheduledPosts.list が invalidate される', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCancelScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'sp-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.scheduledPosts.detail('sp-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.scheduledPosts.list() })
    );
  });

  it('400 VALIDATION_ERROR（pending 以外のキャンセル不可）で isError=true になる', async () => {
    const err = makeApiError('VALIDATION_ERROR', 400);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCancelScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'sp-published' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('403 PREMIUM_REQUIRED で isError=true になる', async () => {
    const err = makeApiError('PREMIUM_REQUIRED', 403);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCancelScheduledPostMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'sp-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('PREMIUM_REQUIRED');
    }
  });
});
