/**
 * @module __tests__/lib/queries/comments-mutations
 * useCreateCommentMutation / useDeleteCommentMutation のテスト。
 * invalidation-map.md: コメント作成/削除 → comments.byPost(postId) / posts.detail(postId)。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
} from '@/lib/queries/comments';
import { queryKeys } from '@/lib/queries/keys';

const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: (...args: unknown[]) => mockApiPost(...args),
    PATCH: jest.fn(),
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

async function actAndExpectError(fn: () => Promise<unknown>): Promise<void> {
  await act(async () => {
    try {
      await fn();
    } catch {
      // expected
    }
  });
}

const POST_ID = 'post-1';
const COMMENT_ID = 'comment-1';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useCreateCommentMutation
// ---------------------------------------------------------------------------

describe('useCreateCommentMutation', () => {
  const createParams = {
    postId: POST_ID,
    content: 'テストコメントです。',
    mediaUrls: [],
    mediaTypes: [] as ('image' | 'video')[],
  };

  const commentResponse = {
    id: COMMENT_ID,
    content: 'テストコメントです。',
    postId: POST_ID,
    userId: 'user-1',
    parentId: null,
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    user: { id: 'user-1', nickname: '盆栽太郎', avatarUrl: null, isBlocked: false, isMuted: false },
    media: [],
    likeCount: 0,
    isLiked: false,
    isDeleted: false,
    replies: [],
  };

  it('成功で CommentResponse が返る', async () => {
    mockApiPost.mockResolvedValue({ data: commentResponse, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCommentMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(createParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(COMMENT_ID);
  });

  it('成功後に comments.byPost(postId) が invalidate される', async () => {
    mockApiPost.mockResolvedValue({ data: commentResponse, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCommentMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(createParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.comments.byPost(POST_ID) })
      );
    });
  });

  it('成功後に posts.detail(postId) が invalidate される', async () => {
    mockApiPost.mockResolvedValue({ data: commentResponse, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCommentMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(createParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.detail(POST_ID) })
      );
    });
  });

  it('parentId を指定したリプライコメントが送信される', async () => {
    mockApiPost.mockResolvedValue({ data: commentResponse, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCommentMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        ...createParams,
        parentId: 'parent-comment-1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/posts/{id}/comments',
      expect.objectContaining({
        body: expect.objectContaining({ parentId: 'parent-comment-1' }),
      })
    );
  });

  it('400 VALIDATION_ERROR で ApiError が throw される', async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCommentMutation(), { wrapper: Wrapper });

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

    const { result } = renderHook(() => useCreateCommentMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(createParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
      expect(result.current.error.status).toBe(429);
    }
  });

  it('error が undefined の場合は汎用エラーが throw される', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateCommentMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(createParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error creating comment');
  });

  it('エラー時も comments.byPost(postId) が invalidate される（onSettled 経由）', async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCommentMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(createParams));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.comments.byPost(POST_ID) })
      );
    });
  });
});

// ---------------------------------------------------------------------------
// useDeleteCommentMutation
// ---------------------------------------------------------------------------

describe('useDeleteCommentMutation', () => {
  const deleteParams = { postId: POST_ID, commentId: COMMENT_ID };

  it('成功で SuccessResponse が返る', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCommentMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(deleteParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('成功後に comments.byPost(postId) が invalidate される', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteCommentMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(deleteParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.comments.byPost(POST_ID) })
      );
    });
  });

  it('成功後に posts.detail(postId) が invalidate される', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteCommentMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(deleteParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.detail(POST_ID) })
      );
    });
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCommentMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(deleteParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('403 NOT_FOUND で ApiError が throw される', async () => {
    mockApiDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCommentMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(deleteParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('error が undefined の場合は汎用エラーが throw される', async () => {
    mockApiDelete.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteCommentMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(deleteParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error deleting comment');
  });

  it('エラー時も comments.byPost(postId) と posts.detail(postId) が invalidate される', async () => {
    mockApiDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteCommentMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(deleteParams));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.comments.byPost(POST_ID) })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.detail(POST_ID) })
      );
    });
  });
});
