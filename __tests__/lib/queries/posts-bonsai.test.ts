/**
 * @module __tests__/lib/queries/posts-bonsai
 * useCreatePostMutation / useUpdatePostMutation の bonsaiId 引き回しのテスト。
 * 作成時の省略/指定、更新時の三値制御（キー省略=維持／null=解除／文字列=設定）が
 * apiClient に渡るリクエストボディへ正しく反映されることと、bonsaiId 指定時の
 * 404 NOT_FOUND 伝播を検証する。モック境界は lib/api/client（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { makePostResponse } from '@/__tests__/utils/data-factories';
import { useCreatePostMutation, useUpdatePostMutation } from '@/lib/queries/posts';

async function actAndExpectError(fn: () => Promise<unknown>): Promise<void> {
  await act(async () => {
    try {
      await fn();
    } catch {
      // expected
    }
  });
}

const mockApiPost = jest.fn();
const mockApiPatch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: (...args: unknown[]) => mockApiPost(...args),
    PATCH: (...args: unknown[]) => mockApiPatch(...args),
    DELETE: jest.fn(),
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

const baseCreateParams = {
  content: '黒松の春管理です。',
  genreIds: [] as string[],
  mediaUrls: [] as string[],
  mediaTypes: [] as ('image' | 'video')[],
};

const baseUpdateParams = {
  id: 'post-1',
  content: '更新後の内容',
  genreIds: [] as string[],
  mediaUrls: [] as string[],
  mediaTypes: [] as ('image' | 'video')[],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useCreatePostMutation — bonsaiId
// ---------------------------------------------------------------------------

describe('useCreatePostMutation bonsaiId', () => {
  it('bonsaiId を省略した場合、リクエストボディの bonsaiId は undefined になる', async () => {
    mockApiPost.mockResolvedValue({ data: makePostResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(baseCreateParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/posts',
      expect.objectContaining({ body: expect.objectContaining({ bonsaiId: undefined }) })
    );
    expect(mockApiPost.mock.calls[0]?.[1]?.body?.bonsaiId).toBeUndefined();
  });

  it('bonsaiId を指定した場合、リクエストボディにそのまま反映される', async () => {
    mockApiPost.mockResolvedValue({ data: makePostResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ...baseCreateParams, bonsaiId: 'bonsai-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPost.mock.calls[0]?.[1]?.body?.bonsaiId).toBe('bonsai-1');
  });

  it('bonsaiId に null を指定した場合、リクエストボディに null がそのまま反映される', async () => {
    mockApiPost.mockResolvedValue({ data: makePostResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ...baseCreateParams, bonsaiId: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPost.mock.calls[0]?.[1]?.body?.bonsaiId).toBeNull();
  });

  it('bonsaiId 指定時に 404 NOT_FOUND で ApiError(NOT_FOUND) が throw される（他人所有・不存在の盆栽）', async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() =>
      result.current.mutateAsync({ ...baseCreateParams, bonsaiId: 'bonsai-other' })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });
});

// ---------------------------------------------------------------------------
// useUpdatePostMutation — bonsaiId（三値制御）
// ---------------------------------------------------------------------------

describe('useUpdatePostMutation bonsaiId（三値制御）', () => {
  it('bonsaiId キーを省略した場合、リクエストボディの bonsaiId は undefined になる（現状維持）', async () => {
    mockApiPatch.mockResolvedValue({ data: makePostResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePostMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(baseUpdateParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPatch.mock.calls[0]?.[1]?.body?.bonsaiId).toBeUndefined();
  });

  it('bonsaiId に null を指定した場合、リクエストボディに null が渡る（紐付け解除）', async () => {
    mockApiPatch.mockResolvedValue({ data: makePostResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePostMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ...baseUpdateParams, bonsaiId: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPatch.mock.calls[0]?.[1]?.body?.bonsaiId).toBeNull();
  });

  it('bonsaiId に文字列を指定した場合、リクエストボディにその値が渡る（紐付け設定）', async () => {
    mockApiPatch.mockResolvedValue({ data: makePostResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePostMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ...baseUpdateParams, bonsaiId: 'bonsai-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPatch.mock.calls[0]?.[1]?.body?.bonsaiId).toBe('bonsai-2');
  });

  it('bonsaiId 指定時に 404 NOT_FOUND で ApiError(NOT_FOUND) が throw される（他人所有・不存在の盆栽）', async () => {
    mockApiPatch.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePostMutation(), { wrapper: Wrapper });

    await actAndExpectError(() =>
      result.current.mutateAsync({ ...baseUpdateParams, bonsaiId: 'bonsai-other' })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });
});
