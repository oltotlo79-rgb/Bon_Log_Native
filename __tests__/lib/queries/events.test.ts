/**
 * lib/queries/events のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  useEventsListQuery,
  useEventDetailQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} from '@/lib/queries/events';
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

type EventItemDetail = components['schemas']['EventItemDetail'];
type EventListResponse = components['schemas']['EventListResponse'];
type EventItemCreate = components['schemas']['EventItemCreate'];

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

function makeEventItem(id: string): EventItemDetail {
  return {
    id,
    title: '盆栽展示会',
    startDate: '2025-09-01',
    endDate: null,
    prefecture: '東京都',
    city: null,
    venue: '東京都立庭園美術館',
    organizer: null,
    admissionFee: '無料',
    hasSales: false,
    externalUrl: null,
    description: '秋の盆栽展示会です。',
    createdAt: '2025-06-01T00:00:00Z',
    creator: null,
  };
}

function makeEventListPage(items: EventItemDetail[]): InfiniteData<EventListResponse> {
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
// useEventsListQuery
// ---------------------------------------------------------------------------

describe('useEventsListQuery', () => {
  it('正常系: イベント一覧が返される', async () => {
    const page: EventListResponse = {
      items: [makeEventItem('event-1'), makeEventItem('event-2')],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEventsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('空一覧: items が空配列', async () => {
    const page: EventListResponse = { items: [], nextCursor: null };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEventsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(0);
  });

  it('filter=region で地域フィルタが API に渡される', async () => {
    const page: EventListResponse = { items: [], nextCursor: null };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useEventsListQuery({ region: '関東' }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/events',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ region: '関東' }),
        }),
      })
    );
  });

  it('filter=showPast=true のとき showPast="true" が渡される', async () => {
    const page: EventListResponse = { items: [], nextCursor: null };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useEventsListQuery({ showPast: true }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/events',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ showPast: 'true' }),
        }),
      })
    );
  });

  it('fetchNextPage: nextCursor がある場合に次ページを取得できる', async () => {
    const firstPage: EventListResponse = {
      items: [makeEventItem('event-1')],
      nextCursor: 'cursor-abc',
    };
    const secondPage: EventListResponse = {
      items: [makeEventItem('event-2')],
      nextCursor: null,
    };
    mockApiClientGet
      .mockResolvedValueOnce({ data: firstPage, error: undefined })
      .mockResolvedValueOnce({ data: secondPage, error: undefined });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useEventsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });

  it('エラー系: isError=true になる', async () => {
    const err = makeApiError('INTERNAL_ERROR', 500);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEventsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useEventDetailQuery
// ---------------------------------------------------------------------------

describe('useEventDetailQuery', () => {
  it('正常系: 詳細が返される', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeEventItem('event-1'), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEventDetailQuery('event-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('event-1');
  });

  it('id が空文字のときフェッチしない（enabled=false）', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEventDetailQuery(''), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND で isError=true になる', async () => {
    const err = makeApiError('NOT_FOUND', 404);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEventDetailQuery('event-999'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('403 GUEST_NOT_ALLOWED で isError=true になる（403 は伝播する）', async () => {
    const err = makeApiError('GUEST_NOT_ALLOWED', 403);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEventDetailQuery('event-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
    }
  });
});

// ---------------------------------------------------------------------------
// useCreateEventMutation
// ---------------------------------------------------------------------------

describe('useCreateEventMutation', () => {
  it('正常系: POST を呼び成功する', async () => {
    const created: EventItemCreate = makeEventItem('event-new');
    mockApiClientPost.mockResolvedValue({ data: created, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        title: '新イベント',
        startDate: '2025-10-01',
        hasSales: false,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/events', expect.anything());
  });

  it('onSettled: events.all が invalidate される', async () => {
    const created: EventItemCreate = makeEventItem('event-new');
    mockApiClientPost.mockResolvedValue({ data: created, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.events.list({}), makeEventListPage([]));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ title: 'テスト', startDate: '2025-10-01', hasSales: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.events.all })
    );
  });

  it('エラー系: AUTH_REQUIRED で isError=true になる', async () => {
    const err = makeApiError('AUTH_REQUIRED', 401);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ title: 'テスト', startDate: '2025-10-01', hasSales: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useUpdateEventMutation
// ---------------------------------------------------------------------------

describe('useUpdateEventMutation', () => {
  it('正常系: PATCH を呼び成功する', async () => {
    mockApiClientPatch.mockResolvedValue({ data: makeEventItem('event-1'), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'event-1', title: '更新タイトル' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPatch).toHaveBeenCalledWith('/api/v1/events/{id}', expect.anything());
  });

  it('onSettled: events.detail(id) と events.all が invalidate される', async () => {
    mockApiClientPatch.mockResolvedValue({ data: makeEventItem('event-1'), error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'event-1', title: '更新' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.events.detail('event-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.events.all })
    );
  });

  it('403 GUEST_NOT_ALLOWED（作成者でない）で isError=true になる', async () => {
    const err = makeApiError('GUEST_NOT_ALLOWED', 403);
    mockApiClientPatch.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'event-1', title: '不正更新' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('404 NOT_FOUND で isError=true になる', async () => {
    const err = makeApiError('NOT_FOUND', 404);
    mockApiClientPatch.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'event-999', title: '不在更新' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useDeleteEventMutation
// ---------------------------------------------------------------------------

describe('useDeleteEventMutation', () => {
  it('正常系: DELETE を呼び成功する（void）', async () => {
    mockApiClientDelete.mockResolvedValue({ error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'event-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/events/{id}', expect.anything());
  });

  it('onSettled: events.all が invalidate される', async () => {
    mockApiClientDelete.mockResolvedValue({ error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'event-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.events.all })
    );
  });

  it('403 GUEST_NOT_ALLOWED（作成者でない）が伝播する', async () => {
    const err = makeApiError('GUEST_NOT_ALLOWED', 403);
    mockApiClientDelete.mockResolvedValue({ error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteEventMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'event-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
    }
  });
});
