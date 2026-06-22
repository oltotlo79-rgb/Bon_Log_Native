/**
 * lib/queries/bonsai のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  useBonsaiListQuery,
  useBonsaiDetailQuery,
  useBonsaiRecordsQuery,
  useCreateBonsaiMutation,
  useUpdateBonsaiMutation,
  useDeleteBonsaiMutation,
  useCreateBonsaiRecordMutation,
  useUpdateBonsaiRecordMutation,
  useDeleteBonsaiRecordMutation,
} from '@/lib/queries/bonsai';
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

type BonsaiDetail = components['schemas']['BonsaiDetail'];
type BonsaiListResponse = components['schemas']['BonsaiListResponse'];
type BonsaiRecordListResponse = components['schemas']['BonsaiRecordListResponse'];
type SuccessResponse = components['schemas']['SuccessResponse'];

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

function makeBonsaiItem(id: string): BonsaiListResponse['items'][number] {
  return {
    id,
    name: '黒松',
    species: 'Pinus thunbergii',
    acquiredAt: '2020-01-01',
    description: null,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    recordCount: 5,
    latestRecord: null,
  };
}

function makeBonsaiDetail(id: string): BonsaiDetail {
  return {
    id,
    name: '黒松詳細',
    species: 'Pinus thunbergii',
    acquiredAt: '2020-01-01',
    description: null,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    recordCount: 5,
  };
}

function makeBonsaiListPage(items: BonsaiListResponse['items']): InfiniteData<BonsaiListResponse> {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

function makeBonsaiRecord(id: string): BonsaiRecordListResponse['items'][number] {
  return {
    id,
    content: '春の芽出し',
    recordAt: '2025-04-01T00:00:00Z',
    images: [],
  };
}

function makeBonsaiRecordsPage(items: BonsaiRecordListResponse['items']): InfiniteData<BonsaiRecordListResponse> {
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
// useBonsaiListQuery
// ---------------------------------------------------------------------------

describe('useBonsaiListQuery', () => {
  it('正常系: 盆栽一覧が返される', async () => {
    const page: BonsaiListResponse = {
      items: [makeBonsaiItem('bonsai-1'), makeBonsaiItem('bonsai-2')],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBonsaiListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('空一覧: items が空配列', async () => {
    const page: BonsaiListResponse = { items: [], nextCursor: null };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBonsaiListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(0);
  });

  it('fetchNextPage: nextCursor がある場合に次ページを取得できる', async () => {
    const firstPage: BonsaiListResponse = {
      items: [makeBonsaiItem('bonsai-1')],
      nextCursor: 'cursor-abc',
    };
    const secondPage: BonsaiListResponse = {
      items: [makeBonsaiItem('bonsai-2')],
      nextCursor: null,
    };
    mockApiClientGet
      .mockResolvedValueOnce({ data: firstPage, error: undefined })
      .mockResolvedValueOnce({ data: secondPage, error: undefined });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBonsaiListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });

  it('エラー系: isError=true になる', async () => {
    const err = makeApiError('AUTH_REQUIRED', 401);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBonsaiListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useBonsaiDetailQuery
// ---------------------------------------------------------------------------

describe('useBonsaiDetailQuery', () => {
  it('正常系: 詳細が返される', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeBonsaiDetail('bonsai-1'), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBonsaiDetailQuery('bonsai-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('bonsai-1');
  });

  it('id が空文字のときフェッチを実行しない（enabled=false）', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBonsaiDetailQuery(''), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND で isError=true になる', async () => {
    const err = makeApiError('NOT_FOUND', 404);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBonsaiDetailQuery('bonsai-999'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useBonsaiRecordsQuery
// ---------------------------------------------------------------------------

describe('useBonsaiRecordsQuery', () => {
  it('正常系: 成長記録一覧が返される', async () => {
    const page: BonsaiRecordListResponse = {
      items: [makeBonsaiRecord('record-1')],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBonsaiRecordsQuery('bonsai-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
  });

  it('bonsaiId が空文字のときフェッチしない', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBonsaiRecordsQuery(''), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('fetchNextPage で次ページを取得できる', async () => {
    const firstPage: BonsaiRecordListResponse = {
      items: [makeBonsaiRecord('record-1')],
      nextCursor: 'cursor-xyz',
    };
    const secondPage: BonsaiRecordListResponse = {
      items: [makeBonsaiRecord('record-2')],
      nextCursor: null,
    };
    mockApiClientGet
      .mockResolvedValueOnce({ data: firstPage, error: undefined })
      .mockResolvedValueOnce({ data: secondPage, error: undefined });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBonsaiRecordsQuery('bonsai-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });
});

// ---------------------------------------------------------------------------
// useCreateBonsaiMutation
// ---------------------------------------------------------------------------

describe('useCreateBonsaiMutation', () => {
  it('正常系: POST を呼び成功する', async () => {
    const created = makeBonsaiDetail('bonsai-new');
    mockApiClientPost.mockResolvedValue({ data: created, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateBonsaiMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ name: '五葉松', species: 'Pinus parviflora' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/bonsai', expect.anything());
  });

  it('onSettled: bonsai.list が invalidate される', async () => {
    mockApiClientPost.mockResolvedValue({ data: makeBonsaiDetail('bonsai-new'), error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.bonsai.list(), makeBonsaiListPage([]));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateBonsaiMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ name: '五葉松' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.list() })
    );
  });

  it('エラー系: isError=true になる', async () => {
    const err = makeApiError('AUTH_REQUIRED', 401);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateBonsaiMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ name: '五葉松' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useUpdateBonsaiMutation
// ---------------------------------------------------------------------------

describe('useUpdateBonsaiMutation', () => {
  it('正常系: PATCH を呼び成功する', async () => {
    const updated = makeBonsaiDetail('bonsai-1');
    mockApiClientPatch.mockResolvedValue({ data: updated, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateBonsaiMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'bonsai-1', name: '黒松（更新）' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPatch).toHaveBeenCalledWith('/api/v1/bonsai/{id}', expect.anything());
  });

  it('onSettled: bonsai.detail(id) と bonsai.list が invalidate される', async () => {
    mockApiClientPatch.mockResolvedValue({ data: makeBonsaiDetail('bonsai-1'), error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateBonsaiMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'bonsai-1', name: '更新名' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.detail('bonsai-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.list() })
    );
  });
});

// ---------------------------------------------------------------------------
// useDeleteBonsaiMutation
// ---------------------------------------------------------------------------

describe('useDeleteBonsaiMutation', () => {
  it('正常系: DELETE を呼び成功する', async () => {
    const successResp: SuccessResponse = { success: true };
    mockApiClientDelete.mockResolvedValue({ data: successResp, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteBonsaiMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'bonsai-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/bonsai/{id}', expect.anything());
  });

  it('onSettled: bonsai.list が invalidate される', async () => {
    const successResp: SuccessResponse = { success: true };
    mockApiClientDelete.mockResolvedValue({ data: successResp, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteBonsaiMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'bonsai-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.list() })
    );
  });

  it('404 NOT_FOUND で isError=true になる', async () => {
    const err = makeApiError('NOT_FOUND', 404);
    mockApiClientDelete.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteBonsaiMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'bonsai-999' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useCreateBonsaiRecordMutation
// ---------------------------------------------------------------------------

describe('useCreateBonsaiRecordMutation', () => {
  it('正常系: POST を呼び成功する', async () => {
    mockApiClientPost.mockResolvedValue({ data: makeBonsaiDetail('bonsai-1'), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateBonsaiRecordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        bonsaiId: 'bonsai-1',
        recordAt: '2025-04-01T00:00:00Z',
        mediaUrls: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/bonsai/{id}/records', expect.anything());
  });

  it('onSettled: bonsai.records / bonsai.detail / bonsai.list が invalidate される', async () => {
    mockApiClientPost.mockResolvedValue({ data: makeBonsaiDetail('bonsai-1'), error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateBonsaiRecordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        bonsaiId: 'bonsai-1',
        recordAt: '2025-04-01T00:00:00Z',
        mediaUrls: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.records('bonsai-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.detail('bonsai-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.list() })
    );
  });
});

// ---------------------------------------------------------------------------
// useUpdateBonsaiRecordMutation
// ---------------------------------------------------------------------------

describe('useUpdateBonsaiRecordMutation', () => {
  it('正常系: PATCH を呼び成功する', async () => {
    mockApiClientPatch.mockResolvedValue({ data: makeBonsaiDetail('bonsai-1'), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateBonsaiRecordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ bonsaiId: 'bonsai-1', recordId: 'record-1', content: '更新内容' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPatch).toHaveBeenCalledWith(
      '/api/v1/bonsai/{id}/records/{recordId}',
      expect.anything()
    );
  });

  it('onSettled: bonsai.records(bonsaiId) と bonsai.detail(bonsaiId) が invalidate される', async () => {
    mockApiClientPatch.mockResolvedValue({ data: makeBonsaiDetail('bonsai-1'), error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateBonsaiRecordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ bonsaiId: 'bonsai-1', recordId: 'record-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.records('bonsai-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.detail('bonsai-1') })
    );
  });
});

// ---------------------------------------------------------------------------
// useDeleteBonsaiRecordMutation
// ---------------------------------------------------------------------------

describe('useDeleteBonsaiRecordMutation', () => {
  it('正常系: DELETE を呼び成功する', async () => {
    const successResp: SuccessResponse = { success: true };
    mockApiClientDelete.mockResolvedValue({ data: successResp, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteBonsaiRecordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ bonsaiId: 'bonsai-1', recordId: 'record-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientDelete).toHaveBeenCalledWith(
      '/api/v1/bonsai/{id}/records/{recordId}',
      expect.anything()
    );
  });

  it('onSettled: bonsai.records と bonsai.detail が invalidate される', async () => {
    const successResp: SuccessResponse = { success: true };
    mockApiClientDelete.mockResolvedValue({ data: successResp, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteBonsaiRecordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ bonsaiId: 'bonsai-1', recordId: 'record-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.records('bonsai-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.detail('bonsai-1') })
    );
  });

  it('エラー系: 404 NOT_FOUND で isError=true になる', async () => {
    const err = makeApiError('NOT_FOUND', 404);
    mockApiClientDelete.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteBonsaiRecordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ bonsaiId: 'bonsai-1', recordId: 'record-999' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
