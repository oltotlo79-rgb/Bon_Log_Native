/**
 * @module __tests__/lib/queries/posts-mutations
 * useCreatePostMutation / useUpdatePostMutation / useDeletePostMutation のテスト。
 * invalidation-map.md との整合・エラー伝播・レート制限(429)を網羅する。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} from '@/lib/queries/posts';
import { queryKeys } from '@/lib/queries/keys';

async function actAndExpectError(
  fn: () => Promise<unknown>
): Promise<void> {
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
const mockApiDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: (...args: unknown[]) => mockApiPost(...args),
    PATCH: (...args: unknown[]) => mockApiPatch(...args),
    DELETE: (...args: unknown[]) => mockApiDelete(...args),
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

function makePostResponse(id = 'post-1') {
  return {
    id,
    content: '黒松の春管理',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
    media: [],
    genres: [],
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    isLiked: false,
    isBookmarked: false,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    mentionedUsers: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useCreatePostMutation
// ---------------------------------------------------------------------------

describe('useCreatePostMutation', () => {
  const createParams = {
    content: '黒松の春管理です。',
    genreIds: ['松柏類'],
    mediaUrls: [],
    mediaTypes: [] as ('image' | 'video')[],
  };

  it('成功で PostResponse が返る', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(createParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('post-1');
    void queryClient;
  });

  it('成功後に posts.feed() が invalidate される', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(createParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.feed() })
      );
    });
  });

  it('成功後に users.detail(currentUserId) が invalidate される', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(createParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.users.detail('user-1') })
      );
    });
  });

  it('currentUserId が空文字の場合は users.detail を invalidate しない', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePostMutation(''), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(createParams);
    });

    await waitFor(() => {
      // feed は invalidate される
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.feed() })
      );
    });

    // users.detail は呼ばれない
    const detailCalls = invalidateSpy.mock.calls.filter(
      (call) => JSON.stringify(call[0]) === JSON.stringify({ queryKey: queryKeys.users.detail('') })
    );
    expect(detailCalls.length).toBe(0);
  });

  it('400 VALIDATION_ERROR で ApiError が throw される', async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(createParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('429 RATE_LIMITED で ApiError が throw される', async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(createParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
      expect(result.current.error.status).toBe(429);
    }
  });

  it('サーバーエラーで error が undefined の場合は汎用エラーが throw される', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(createParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error creating post');
  });
});

// ---------------------------------------------------------------------------
// useUpdatePostMutation
// ---------------------------------------------------------------------------

describe('useUpdatePostMutation', () => {
  const updateParams = {
    id: 'post-1',
    content: '更新後の内容',
    genreIds: ['雑木類'],
    mediaUrls: [],
    mediaTypes: [] as ('image' | 'video')[],
  };

  it('成功で PostResponse が返る', async () => {
    const post = makePostResponse();
    mockApiPatch.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePostMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(updateParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('成功後に posts.detail(id) と posts.feed() が invalidate される', async () => {
    const post = makePostResponse();
    mockApiPatch.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdatePostMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(updateParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.detail('post-1') })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.feed() })
      );
    });
  });

  it('403 FORBIDDEN で ApiError が throw される', async () => {
    mockApiPatch.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePostMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(updateParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useDeletePostMutation
// ---------------------------------------------------------------------------

describe('useDeletePostMutation', () => {
  const deleteParams = { id: 'post-1' };

  it('成功で SuccessResponse が返る', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeletePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(deleteParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('成功後に posts.all と users.detail(currentUserId) が invalidate される', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeletePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(deleteParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.all })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.users.detail('user-1') })
      );
    });
  });

  it('currentUserId が空文字の場合は users.detail を invalidate しない', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeletePostMutation(''), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(deleteParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.all })
      );
    });

    const detailCalls = invalidateSpy.mock.calls.filter(
      (call) => JSON.stringify(call[0]) === JSON.stringify({ queryKey: queryKeys.users.detail('') })
    );
    expect(detailCalls.length).toBe(0);
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeletePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(deleteParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('サーバーエラーで error が undefined の場合は汎用エラーが throw される', async () => {
    mockApiDelete.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeletePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(deleteParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error deleting post');
  });
});
