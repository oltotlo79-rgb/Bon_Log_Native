/**
 * @module __tests__/lib/queries/comments-mutations
 * useCreateCommentMutation / useDeleteCommentMutation のテスト。
 * invalidation-map.md: コメント作成/削除 → comments.byPost(postId) / posts.detail(postId)。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useToggleCommentLikeMutation,
} from '@/lib/queries/comments';
import { queryKeys } from '@/lib/queries/keys';
import type { InfiniteData } from '@tanstack/react-query';

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

type CommentListItem = {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isBlockedUser: boolean;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  user: { id: string; nickname: string; avatarUrl: string | null };
  media: unknown[];
};

type CommentsListPage = { items: CommentListItem[]; nextCursor: string | null };

function makeCommentListItem(id: string, isLiked: boolean, likeCount: number): CommentListItem {
  return {
    id,
    postId: POST_ID,
    userId: 'user-1',
    parentId: null,
    content: 'コメントです',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    isDeleted: false,
    isBlockedUser: false,
    likeCount,
    replyCount: 0,
    isLiked,
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null },
    media: [],
  };
}

function makeCommentsListPage(items: CommentListItem[]): InfiniteData<CommentsListPage> {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

/**
 * キャッシュ内容を setQueryData 経由で直接検証するテスト専用の wrapper。
 * gcTime: 0（既定の createTestQueryClient）だと非アクティブなキャッシュが
 * 次tickで即座に GC されるため、Infinity にして検証可能にする。
 */
function createWrapperWithPersistentCache() {
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

// ---------------------------------------------------------------------------
// useToggleCommentLikeMutation
// ---------------------------------------------------------------------------

describe('useToggleCommentLikeMutation', () => {
  describe('POST/DELETE 出し分け', () => {
    it('liked=false のとき POST を呼ぶ', async () => {
      mockApiPost.mockResolvedValue({ data: { liked: true, likeCount: 1 }, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ commentId: COMMENT_ID, liked: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/comments/{id}/like', {
        params: { path: { id: COMMENT_ID } },
      });
      expect(mockApiDelete).not.toHaveBeenCalled();
    });

    it('liked=true のとき DELETE を呼ぶ', async () => {
      mockApiDelete.mockResolvedValue({ data: { liked: false, likeCount: 0 }, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ commentId: COMMENT_ID, liked: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiDelete).toHaveBeenCalledWith('/api/v1/comments/{id}/like', {
        params: { path: { id: COMMENT_ID } },
      });
      expect(mockApiPost).not.toHaveBeenCalled();
    });
  });

  describe('楽観更新', () => {
    it('onMutate で byPost キャッシュ内の isLiked/likeCount が即時トグルされる', async () => {
      mockApiPost.mockResolvedValue({ data: { liked: true, likeCount: 6 }, error: undefined });
      const { Wrapper, queryClient } = createWrapperWithPersistentCache();

      const listData = makeCommentsListPage([makeCommentListItem(COMMENT_ID, false, 5)]);
      queryClient.setQueryData(queryKeys.comments.byPost(POST_ID), listData);

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ commentId: COMMENT_ID, liked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<CommentsListPage>>(
          queryKeys.comments.byPost(POST_ID)
        );
        const item = cached?.pages[0].items.find((i) => i.id === COMMENT_ID);
        expect(item?.isLiked).toBe(true);
        expect(item?.likeCount).toBe(6);
      });
    });

    it('onMutate で返信一覧（replies）キャッシュも同時に更新される', async () => {
      mockApiPost.mockResolvedValue({ data: { liked: true, likeCount: 3 }, error: undefined });
      const { Wrapper, queryClient } = createWrapperWithPersistentCache();

      const repliesData = makeCommentsListPage([makeCommentListItem('reply-1', false, 2)]);
      queryClient.setQueryData(queryKeys.comments.replies('parent-1'), repliesData);

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ commentId: 'reply-1', liked: false, parentId: 'parent-1' });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<CommentsListPage>>(
          queryKeys.comments.replies('parent-1')
        );
        const item = cached?.pages[0].items.find((i) => i.id === 'reply-1');
        expect(item?.isLiked).toBe(true);
        expect(item?.likeCount).toBe(3);
      });
    });
  });

  describe('キャッシュ分離', () => {
    it('対象と異なる commentId のキャッシュエントリは更新されない', async () => {
      mockApiPost.mockResolvedValue({ data: { liked: true, likeCount: 6 }, error: undefined });
      const { Wrapper, queryClient } = createWrapperWithPersistentCache();

      const listData = makeCommentsListPage([
        makeCommentListItem(COMMENT_ID, false, 5),
        makeCommentListItem('other-comment', false, 9),
      ]);
      queryClient.setQueryData(queryKeys.comments.byPost(POST_ID), listData);

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ commentId: COMMENT_ID, liked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<CommentsListPage>>(
          queryKeys.comments.byPost(POST_ID)
        );
        const other = cached?.pages[0].items.find((i) => i.id === 'other-comment');
        expect(other?.isLiked).toBe(false);
        expect(other?.likeCount).toBe(9);
      });
    });

    it('異なる postId の byPost キャッシュは互いに独立している', async () => {
      mockApiPost.mockResolvedValue({ data: { liked: true, likeCount: 6 }, error: undefined });
      const { Wrapper, queryClient } = createWrapperWithPersistentCache();

      queryClient.setQueryData(
        queryKeys.comments.byPost('post-a'),
        makeCommentsListPage([makeCommentListItem('comment-in-a', false, 1)])
      );
      queryClient.setQueryData(
        queryKeys.comments.byPost('post-b'),
        makeCommentsListPage([makeCommentListItem('comment-in-b', false, 2)])
      );

      const { result } = renderHook(() => useToggleCommentLikeMutation('post-a'), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ commentId: 'comment-in-a', liked: false });
      });

      await waitFor(() => {
        const cachedA = queryClient.getQueryData<InfiniteData<CommentsListPage>>(
          queryKeys.comments.byPost('post-a')
        );
        expect(cachedA?.pages[0].items[0]?.isLiked).toBe(true);
      });

      const cachedB = queryClient.getQueryData<InfiniteData<CommentsListPage>>(
        queryKeys.comments.byPost('post-b')
      );
      expect(cachedB?.pages[0].items[0]?.isLiked).toBe(false);
      expect(cachedB?.pages[0].items[0]?.likeCount).toBe(2);
    });
  });

  describe('onError ロールバック', () => {
    it('エラー時に byPost キャッシュが元の isLiked/likeCount に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapperWithPersistentCache();

      const listData = makeCommentsListPage([makeCommentListItem(COMMENT_ID, false, 5)]);
      queryClient.setQueryData(queryKeys.comments.byPost(POST_ID), listData);

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ commentId: COMMENT_ID, liked: false });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const cached = queryClient.getQueryData<InfiniteData<CommentsListPage>>(
        queryKeys.comments.byPost(POST_ID)
      );
      const item = cached?.pages[0].items.find((i) => i.id === COMMENT_ID);
      expect(item?.isLiked).toBe(false);
      expect(item?.likeCount).toBe(5);
    });
  });

  describe('404 伝播', () => {
    it('404 NOT_FOUND で ApiError が isError/error に伝播する', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ commentId: COMMENT_ID, liked: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('NOT_FOUND');
        expect(result.current.error.status).toBe(404);
      }
    });
  });

  describe('onSettled invalidation', () => {
    it('成功後に comments.byPost(postId) が invalidate される', async () => {
      mockApiPost.mockResolvedValue({ data: { liked: true, likeCount: 1 }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ commentId: COMMENT_ID, liked: false });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: queryKeys.comments.byPost(POST_ID) })
        );
      });
    });

    it('parentId 指定時は comments.replies(parentId) も invalidate される', async () => {
      mockApiPost.mockResolvedValue({ data: { liked: true, likeCount: 1 }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useToggleCommentLikeMutation(POST_ID), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ commentId: 'reply-1', liked: false, parentId: 'parent-1' });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: queryKeys.comments.replies('parent-1') })
        );
      });
    });
  });
});
