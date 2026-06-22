/**
 * lib/queries/bonsai-care-logs のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useCareLogsQuery,
  useCreateCareLogMutation,
  useUpdateCareLogMutation,
  useDeleteCareLogMutation,
  BONSAI_CARE_TYPE,
} from '@/lib/queries/bonsai-care-logs';
import { queryKeys } from '@/lib/queries/keys';

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

function makeCareLogsPage(ids: string[], nextCursor: string | null) {
  return {
    items: ids.map((id) => ({
      id,
      type: 'other' as const,
      performedAt: '2025-06-01T00:00:00Z',
      note: null,
    })),
    nextCursor,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// BONSAI_CARE_TYPE 定数
// ---------------------------------------------------------------------------

describe('BONSAI_CARE_TYPE', () => {
  it('8種の手入れ種別定数が定義されている', () => {
    expect(BONSAI_CARE_TYPE.PESTICIDE).toBe('pesticide');
    expect(BONSAI_CARE_TYPE.SOLID_FERTILIZER).toBe('solid_fertilizer');
    expect(BONSAI_CARE_TYPE.LIQUID_FERTILIZER).toBe('liquid_fertilizer');
    expect(BONSAI_CARE_TYPE.ROTATE).toBe('rotate');
    expect(BONSAI_CARE_TYPE.SHADING).toBe('shading');
    expect(BONSAI_CARE_TYPE.MURO_IN).toBe('muro_in');
    expect(BONSAI_CARE_TYPE.MURO_OUT).toBe('muro_out');
    expect(BONSAI_CARE_TYPE.OTHER).toBe('other');
  });

  it('BONSAI_CARE_TYPE のキーが8つある', () => {
    expect(Object.keys(BONSAI_CARE_TYPE)).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// useCareLogsQuery
// ---------------------------------------------------------------------------

describe('useCareLogsQuery', () => {
  it('成功で items が返る', async () => {
    const page = makeCareLogsPage(['log-1', 'log-2'], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCareLogsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
    expect(result.current.data?.pages[0].items[0].id).toBe('log-1');
  });

  it('空レスポンス（items: []）で hasNextPage が false', async () => {
    const page = makeCareLogsPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCareLogsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.data?.pages[0].items).toHaveLength(0);
  });

  it('nextCursor が string の場合は hasNextPage が true', async () => {
    const page = makeCareLogsPage(['log-1'], 'cursor-abc');
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCareLogsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('fetchNextPage で次ページが取得できる', async () => {
    const page1 = makeCareLogsPage(['log-1'], 'cursor-abc');
    const page2 = makeCareLogsPage(['log-2'], null);
    mockApiClientGet
      .mockResolvedValueOnce({ data: page1, error: undefined })
      .mockResolvedValueOnce({ data: page2, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCareLogsQuery(), { wrapper: Wrapper });

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
    expect(result.current.data?.pages[1].items[0].id).toBe('log-2');
  });

  it('from/to フィルタ付きで queryKey に params が反映される', async () => {
    const page = makeCareLogsPage(['log-1'], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const params = { from: '2025-01-01', to: '2025-06-01' };
    const { result } = renderHook(() => useCareLogsQuery(params), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const expectedKey = queryKeys.bonsai.careLogs(params);
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/bonsai/care-logs',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({
            from: '2025-01-01',
            to: '2025-06-01',
          }),
        }),
      })
    );
    expect(expectedKey).toEqual(['bonsai', 'careLogs', params]);
  });

  it('params なしでもデフォルトで動作する', async () => {
    const page = makeCareLogsPage(['log-1'], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCareLogsQuery({}), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
  });

  it('401 AUTH_REQUIRED で isError が true になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCareLogsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('403 GUEST_NOT_ALLOWED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('GUEST_NOT_ALLOWED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCareLogsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
    }
  });

  it('400 VALIDATION_ERROR（期間超過）で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const params = { from: '2024-01-01', to: '2025-06-01' };
    const { result } = renderHook(() => useCareLogsQuery(params), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('data が undefined で error も undefined の場合 throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCareLogsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useCreateCareLogMutation
// ---------------------------------------------------------------------------

describe('useCreateCareLogMutation', () => {
  it('成功で id が返る', async () => {
    mockApiClientPost.mockResolvedValue({ data: { id: 'log-new-1' }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        type: BONSAI_CARE_TYPE.PESTICIDE,
        performedAt: '2025-06-01',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('log-new-1');
  });

  it('note を含めて作成できる', async () => {
    mockApiClientPost.mockResolvedValue({ data: { id: 'log-new-2' }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        type: BONSAI_CARE_TYPE.SOLID_FERTILIZER,
        performedAt: '2025-05-01',
        note: '有機肥料を施肥',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith(
      '/api/v1/bonsai/care-logs',
      expect.objectContaining({
        body: expect.objectContaining({
          type: 'solid_fertilizer',
          note: '有機肥料を施肥',
        }),
      })
    );
  });

  it('note なしで作成できる（undefined）', async () => {
    mockApiClientPost.mockResolvedValue({ data: { id: 'log-new-3' }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        type: BONSAI_CARE_TYPE.ROTATE,
        performedAt: '2025-04-01',
        note: undefined,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('成功後に bonsai.all を invalidate する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { id: 'log-new-4' }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        type: BONSAI_CARE_TYPE.OTHER,
        performedAt: '2025-06-01',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.all })
    );
  });

  it('400 VALIDATION_ERROR（必須フィールド欠落）で isError が true', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        type: BONSAI_CARE_TYPE.OTHER,
        performedAt: '2099-01-01',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('403 GUEST_NOT_ALLOWED で isError が true', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('GUEST_NOT_ALLOWED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        type: BONSAI_CARE_TYPE.OTHER,
        performedAt: '2025-06-01',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
    }
  });

  it('data と error が両方 undefined の場合 throw される', async () => {
    mockApiClientPost.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        type: BONSAI_CARE_TYPE.OTHER,
        performedAt: '2025-06-01',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('すべての BONSAI_CARE_TYPE で作成リクエストが送られる', async () => {
    const types = Object.values(BONSAI_CARE_TYPE);

    for (const type of types) {
      mockApiClientPost.mockResolvedValue({ data: { id: `log-${type}` }, error: undefined });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateCareLogMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ type, performedAt: '2025-06-01' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/api/v1/bonsai/care-logs',
        expect.objectContaining({
          body: expect.objectContaining({ type }),
        })
      );

      mockApiClientPost.mockClear();
    }
  });
});

// ---------------------------------------------------------------------------
// useUpdateCareLogMutation
// ---------------------------------------------------------------------------

describe('useUpdateCareLogMutation', () => {
  it('成功で { success: true } が返る', async () => {
    mockApiClientPatch.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        logId: 'log-1',
        type: BONSAI_CARE_TYPE.LIQUID_FERTILIZER,
        performedAt: '2025-06-02',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true });
  });

  it('note に null を渡してメモをクリアできる', async () => {
    mockApiClientPatch.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        logId: 'log-1',
        note: null,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPatch).toHaveBeenCalledWith(
      '/api/v1/bonsai/care-logs/{logId}',
      expect.objectContaining({
        params: { path: { logId: 'log-1' } },
        body: expect.objectContaining({ note: null }),
      })
    );
  });

  it('部分更新（type のみ）が可能', async () => {
    mockApiClientPatch.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        logId: 'log-2',
        type: BONSAI_CARE_TYPE.SHADING,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPatch).toHaveBeenCalledWith(
      '/api/v1/bonsai/care-logs/{logId}',
      expect.objectContaining({
        params: { path: { logId: 'log-2' } },
      })
    );
  });

  it('成功後に bonsai.all を invalidate する', async () => {
    mockApiClientPatch.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1', type: BONSAI_CARE_TYPE.OTHER });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.all })
    );
  });

  it('404 NOT_FOUND（所有者以外・不存在）で isError が true', async () => {
    mockApiClientPatch.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-999' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });

  it('400 VALIDATION_ERROR で isError が true', async () => {
    mockApiClientPatch.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1', performedAt: '2099-12-31' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('403 ACCOUNT_SUSPENDED で isError が true', async () => {
    mockApiClientPatch.mockResolvedValue({
      data: undefined,
      error: makeApiError('ACCOUNT_SUSPENDED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('data と error が両方 undefined の場合 throw される', async () => {
    mockApiClientPatch.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useDeleteCareLogMutation
// ---------------------------------------------------------------------------

describe('useDeleteCareLogMutation', () => {
  it('成功で { success: true } が返る', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true });
  });

  it('正しい path パラメータで DELETE が呼ばれる', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-abc' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientDelete).toHaveBeenCalledWith(
      '/api/v1/bonsai/care-logs/{logId}',
      expect.objectContaining({
        params: { path: { logId: 'log-abc' } },
      })
    );
  });

  it('成功後に bonsai.all を invalidate する', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.bonsai.all })
    );
  });

  it('404 NOT_FOUND（所有者以外・不存在）で isError が true', async () => {
    mockApiClientDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-999' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });

  it('403 GUEST_NOT_ALLOWED で isError が true', async () => {
    mockApiClientDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('GUEST_NOT_ALLOWED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
    }
  });

  it('401 AUTH_REQUIRED で isError が true', async () => {
    mockApiClientDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('data と error が両方 undefined の場合 throw される', async () => {
    mockApiClientDelete.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCareLogMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ logId: 'log-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
