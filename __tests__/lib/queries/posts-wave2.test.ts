/**
 * @module __tests__/lib/queries/posts-wave2
 * 波2フック（useUserPostsQuery / useToggleRepostMutation / useQuotePostMutation /
 * useVotePollMutation / useCreatePostMutation poll 拡張）のユニットテスト。
 * lib/api/client をモック境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  useUserPostsQuery,
  useToggleRepostMutation,
  useQuotePostMutation,
  useVotePollMutation,
  useCreatePostMutation,
} from '@/lib/queries/posts';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { makePostResponse, makePollVoteResponse } from '@/__tests__/utils/data-factories';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiGet(...args),
    POST: (...args: unknown[]) => mockApiPost(...args),
    DELETE: (...args: unknown[]) => mockApiDelete(...args),
    PATCH: jest.fn(),
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

type FeedResponse = components['schemas']['FeedResponse'];
type PostResponse = components['schemas']['PostResponse'];
type UserPostsResponse = components['schemas']['UserPostsResponse'];

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/**
 * 楽観更新テストでは gcTime を Infinity にしてキャッシュが invalidate 後に即消えないようにする。
 * それ以外は createTestQueryClient のデフォルト（gcTime: 0）で十分。
 */
function createWrapper(gcTimeInfinity = false) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: gcTimeInfinity ? Infinity : 0,
      },
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

function makeUserPostsPage(
  ids: string[],
  nextCursor: string | null
): UserPostsResponse {
  return {
    items: ids.map((id) => ({
      id,
      content: '盆栽の記録',
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
    })),
    nextCursor,
  };
}

function makeFeedItem(
  id: string,
  isReposted: boolean,
  repostCount: number
): FeedResponse['items'][number] {
  return {
    id,
    content: '盆栽の記録',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
    media: [],
    genres: [],
    likeCount: 0,
    commentCount: 0,
    repostCount,
    isLiked: false,
    isBookmarked: false,
    isReposted,
    quotePost: null,
    repostPost: null,
    mentionedUsers: [],
  };
}

function makeFeedPage(
  items: FeedResponse['items']
): InfiniteData<FeedResponse> {
  return {
    pages: [{ items, nextCursor: null, isGuest: false }],
    pageParams: [undefined],
  };
}

function makeDetailPost(
  id: string,
  isReposted: boolean,
  repostCount: number
): PostResponse {
  return {
    ...makePostResponse({ id, isReposted, repostCount }),
  };
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

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// useUserPostsQuery
// ===========================================================================

describe('useUserPostsQuery', () => {
  it('userId 指定で items が返る', async () => {
    const page = makeUserPostsPage(['post-1', 'post-2'], null);
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserPostsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
    expect(result.current.data?.pages[0].items[0].id).toBe('post-1');
  });

  it('userId が空文字の場合はフェッチしない（enabled=false）', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserPostsQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('nextCursor で次ページが取得できる', async () => {
    const page1 = makeUserPostsPage(['post-1'], 'cursor-abc');
    const page2 = makeUserPostsPage(['post-2'], null);
    mockApiGet
      .mockResolvedValueOnce({ data: page1, error: undefined })
      .mockResolvedValueOnce({ data: page2, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserPostsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
      expect(result.current.data?.pages[1].items[0].id).toBe('post-2');
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  it('空ページで hasNextPage が false', async () => {
    const page = makeUserPostsPage([], null);
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserPostsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserPostsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('403 ACCOUNT_SUSPENDED で ApiError が throw される', async () => {
    mockApiGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('ACCOUNT_SUSPENDED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserPostsQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('ACCOUNT_SUSPENDED');
    }
  });
});

// ===========================================================================
// useToggleRepostMutation
// ===========================================================================

describe('useToggleRepostMutation', () => {
  describe('POST/DELETE 出し分け', () => {
    it('reposted=false のとき POST を呼ぶ', async () => {
      mockApiPost.mockResolvedValue({
        data: { reposted: true, repostCount: 1 },
        error: undefined,
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/posts/{id}/repost', {
        params: { path: { id: 'post-1' } },
      });
      expect(mockApiDelete).not.toHaveBeenCalled();
    });

    it('reposted=true のとき DELETE を呼ぶ', async () => {
      mockApiDelete.mockResolvedValue({
        data: { reposted: false, repostCount: 0 },
        error: undefined,
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', reposted: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiDelete).toHaveBeenCalledWith('/api/v1/posts/{id}/repost', {
        params: { path: { id: 'post-1' } },
      });
      expect(mockApiPost).not.toHaveBeenCalled();
    });
  });

  describe('楽観更新（onMutate）', () => {
    it('リポスト前に詳細キャッシュの isReposted/repostCount が即時変化する', async () => {
      mockApiPost.mockResolvedValue({
        data: { reposted: true, repostCount: 1 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper(true);

      queryClient.setQueryData(
        queryKeys.posts.detail('post-1'),
        makeDetailPost('post-1', false, 0)
      );

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<PostResponse>(
          queryKeys.posts.detail('post-1')
        );
        expect(cached?.isReposted).toBe(true);
        expect(cached?.repostCount).toBe(1);
      });
    });

    it('リポスト解除前に詳細キャッシュの isReposted/repostCount が即時変化する', async () => {
      mockApiDelete.mockResolvedValue({
        data: { reposted: false, repostCount: 0 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper(true);

      queryClient.setQueryData(
        queryKeys.posts.detail('post-1'),
        makeDetailPost('post-1', true, 1)
      );

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', reposted: true });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<PostResponse>(
          queryKeys.posts.detail('post-1')
        );
        expect(cached?.isReposted).toBe(false);
        expect(cached?.repostCount).toBe(0);
      });
    });

    it('フィードキャッシュの isReposted/repostCount が即時変化する', async () => {
      mockApiPost.mockResolvedValue({
        data: { reposted: true, repostCount: 1 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper(true);

      const feedData = makeFeedPage([makeFeedItem('post-1', false, 0)]);
      queryClient.setQueryData(queryKeys.posts.feed(), feedData);

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<FeedResponse>>(
          queryKeys.posts.feed()
        );
        const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
        expect(item?.isReposted).toBe(true);
        expect(item?.repostCount).toBe(1);
      });
    });
  });

  describe('onError ロールバック', () => {
    it('エラー時に詳細キャッシュが元の値に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper(true);

      queryClient.setQueryData(
        queryKeys.posts.detail('post-1'),
        makeDetailPost('post-1', false, 0)
      );

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      const cached = queryClient.getQueryData<PostResponse>(
        queryKeys.posts.detail('post-1')
      );
      expect(cached?.isReposted).toBe(false);
      expect(cached?.repostCount).toBe(0);
    });

    it('エラー時にフィードキャッシュが元の値に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper(true);

      const feedData = makeFeedPage([makeFeedItem('post-1', false, 0)]);
      queryClient.setQueryData(queryKeys.posts.feed(), feedData);

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      const cached = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        queryKeys.posts.feed()
      );
      const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
      expect(item?.isReposted).toBe(false);
      expect(item?.repostCount).toBe(0);
    });
  });

  describe('onSettled invalidation', () => {
    it('成功後に posts.detail(postId) が invalidate される', async () => {
      mockApiPost.mockResolvedValue({
        data: { reposted: true, repostCount: 1 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: queryKeys.posts.detail('post-1') })
        );
      });
    });

    it('エラー後（onSettled）も posts.detail(postId) が invalidate される', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.detail('post-1') })
      );
    });
  });

  describe('エラー種別', () => {
    it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
      mockApiPost.mockResolvedValue({
        data: undefined,
        error: makeApiError('AUTH_REQUIRED', 401),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('AUTH_REQUIRED');
      }
    });

    it('429 RATE_LIMITED で ApiError が throw される', async () => {
      mockApiPost.mockResolvedValue({
        data: undefined,
        error: makeApiError('RATE_LIMITED', 429),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleRepostMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', reposted: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('RATE_LIMITED');
        expect(result.current.error.status).toBe(429);
      }
    });
  });
});

// ===========================================================================
// useQuotePostMutation
// ===========================================================================

describe('useQuotePostMutation', () => {
  const quoteParams = {
    quotedPostId: 'post-original',
    content: '黒松の管理について引用します。',
    genreIds: ['松柏類'],
    mediaUrls: [],
    mediaTypes: [] as ('image' | 'video')[],
  };

  it('quote に content を送り PostResponse を返す', async () => {
    const post = makePostResponse({ id: 'post-new' });
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useQuotePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(quoteParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('post-new');
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/posts/{id}/quote',
      expect.objectContaining({
        params: { path: { id: 'post-original' } },
        body: expect.objectContaining({ content: '黒松の管理について引用します。' }),
      })
    );
  });

  it('成功後に posts.feed() が invalidate される', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useQuotePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(quoteParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.feed() })
      );
    });
  });

  it('成功後に users.posts(currentUserId) が invalidate される', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useQuotePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(quoteParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.users.posts('user-1') })
      );
    });
  });

  it('currentUserId が空文字の場合は users.posts を invalidate しない', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useQuotePostMutation(''), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(quoteParams);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.feed() })
      );
    });

    const userPostsCalls = invalidateSpy.mock.calls.filter(
      (call) =>
        JSON.stringify(call[0]) === JSON.stringify({ queryKey: queryKeys.users.posts('') })
    );
    expect(userPostsCalls.length).toBe(0);
  });

  it('400 VALIDATION_ERROR で ApiError が throw される', async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useQuotePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(quoteParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('404 NOT_FOUND（引用元投稿が存在しない）で ApiError が throw される', async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useQuotePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(quoteParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });

  it('429 RATE_LIMITED で ApiError が throw される', async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useQuotePostMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(quoteParams));

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
      expect(result.current.error.status).toBe(429);
    }
  });
});

// ===========================================================================
// useVotePollMutation
// ===========================================================================

describe('useVotePollMutation', () => {
  describe('投票成功', () => {
    it('optionId を送り PollVoteResponse を返す', async () => {
      const response = makePollVoteResponse({ userVoteOptionId: 'option-1' });
      mockApiPost.mockResolvedValue({ data: response, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useVotePollMutation(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          pollId: 'poll-1',
          optionId: 'option-1',
          postId: 'post-1',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.userVoteOptionId).toBe('option-1');
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/polls/{id}/vote', {
        params: { path: { id: 'poll-1' } },
        body: { optionId: 'option-1' },
      });
    });
  });

  describe('onSettled invalidation', () => {
    it('postId がある場合は posts.detail(postId) を invalidate する', async () => {
      const response = makePollVoteResponse();
      mockApiPost.mockResolvedValue({ data: response, error: undefined });
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useVotePollMutation(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          pollId: 'poll-1',
          optionId: 'option-1',
          postId: 'post-1',
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: queryKeys.posts.detail('post-1') })
        );
      });
    });

    it('postId がない場合は posts.all を invalidate する', async () => {
      const response = makePollVoteResponse();
      mockApiPost.mockResolvedValue({ data: response, error: undefined });
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useVotePollMutation(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          pollId: 'poll-1',
          optionId: 'option-1',
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: queryKeys.posts.all })
        );
      });
    });

    it('postId が空文字の場合も posts.all を invalidate する', async () => {
      const response = makePollVoteResponse();
      mockApiPost.mockResolvedValue({ data: response, error: undefined });
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useVotePollMutation(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          pollId: 'poll-1',
          optionId: 'option-1',
          postId: '',
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: queryKeys.posts.all })
        );
      });
    });
  });

  describe('エラー伝播', () => {
    it('400 VALIDATION_ERROR（二重投票・期限切れ等）がそのまま伝播する', async () => {
      mockApiPost.mockResolvedValue({
        data: undefined,
        error: makeApiError('VALIDATION_ERROR', 400),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useVotePollMutation(), { wrapper: Wrapper });

      await actAndExpectError(() =>
        result.current.mutateAsync({
          pollId: 'poll-1',
          optionId: 'option-1',
          postId: 'post-1',
        })
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('VALIDATION_ERROR');
        expect(result.current.error.status).toBe(400);
      }
    });

    it('404 NOT_FOUND でも ApiError がそのまま伝播する', async () => {
      mockApiPost.mockResolvedValue({
        data: undefined,
        error: makeApiError('NOT_FOUND', 404),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useVotePollMutation(), { wrapper: Wrapper });

      await actAndExpectError(() =>
        result.current.mutateAsync({
          pollId: 'poll-1',
          optionId: 'option-nonexistent',
          postId: 'post-1',
        })
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('NOT_FOUND');
      }
    });

    it('429 RATE_LIMITED で ApiError が throw される', async () => {
      mockApiPost.mockResolvedValue({
        data: undefined,
        error: makeApiError('RATE_LIMITED', 429),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useVotePollMutation(), { wrapper: Wrapper });

      await actAndExpectError(() =>
        result.current.mutateAsync({
          pollId: 'poll-1',
          optionId: 'option-1',
          postId: 'post-1',
        })
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('RATE_LIMITED');
        expect(result.current.error.status).toBe(429);
      }
    });
  });
});

// ===========================================================================
// useCreatePostMutation — poll 拡張
// ===========================================================================

describe('useCreatePostMutation poll 拡張', () => {
  it('poll を渡すと body に options と durationSeconds が乗る', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        content: '好きな松は？',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
        poll: {
          options: ['黒松', '五葉松', '真柏'],
          durationSeconds: 172800,
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/posts',
      expect.objectContaining({
        body: expect.objectContaining({
          poll: { options: ['黒松', '五葉松', '真柏'], durationSeconds: 172800 },
        }),
      })
    );
  });

  it('poll.durationSeconds 省略時はデフォルト 86400 が使われる', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        content: '好きな松は？',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
        poll: { options: ['黒松', '五葉松'] },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/posts',
      expect.objectContaining({
        body: expect.objectContaining({
          poll: { options: ['黒松', '五葉松'], durationSeconds: 86400 },
        }),
      })
    );
  });

  it('poll 未指定の場合は body に poll が含まれない（従来動作）', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        content: '黒松の春管理です。',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const callBody = mockApiPost.mock.calls[0][1].body as Record<string, unknown>;
    expect(callBody.poll).toBeUndefined();
  });

  it('poll あり投稿成功後も posts.feed() が invalidate される', async () => {
    const post = makePostResponse();
    mockApiPost.mockResolvedValue({ data: post, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePostMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        content: '好きな松は？',
        genreIds: [],
        mediaUrls: [],
        mediaTypes: [],
        poll: { options: ['黒松', '五葉松'] },
      });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.feed() })
      );
    });
  });
});
