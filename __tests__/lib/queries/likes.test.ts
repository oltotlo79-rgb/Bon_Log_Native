/**
 * lib/queries/likes のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { useToggleLikeMutation } from '@/lib/queries/likes';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientPost = jest.fn();
const mockApiClientDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: (...args: unknown[]) => mockApiClientPost(...args),
    DELETE: (...args: unknown[]) => mockApiClientDelete(...args),
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
type SearchPostsResponse = components['schemas']['SearchPostsResponse'];

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

// invalidateQueries 後もキャッシュが残るよう gcTime を Infinity に設定する
// （gcTime: 0 だと invalidate 後に即座にキャッシュが削除され setQueryData の確認ができない）
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

function makeFeedItem(id: string, isLiked: boolean, likeCount: number): FeedResponse['items'][number] {
  return {
    id,
    content: '盆栽の記録',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null },
    media: [],
    genres: [],
    likeCount,
    commentCount: 0,
    repostCount: 0,
    isLiked,
    isBookmarked: false,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    mentionedUsers: [],
  };
}

function makeFeedPage(items: FeedResponse['items']): InfiniteData<FeedResponse> {
  return {
    pages: [{ items, nextCursor: null, isGuest: false }],
    pageParams: [undefined],
  };
}

function makePostDetail(id: string, isLiked: boolean, likeCount: number): PostResponse {
  return {
    id,
    content: '盆栽詳細',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null },
    media: [],
    genres: [],
    likeCount,
    commentCount: 0,
    repostCount: 0,
    isLiked,
    isBookmarked: false,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    mentionedUsers: [],
  };
}

function makeSearchPostsPage(items: SearchPostsResponse['items']): InfiniteData<SearchPostsResponse> {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

function makeSearchPostItem(id: string, isLiked: boolean, likeCount: number): SearchPostsResponse['items'][number] {
  return {
    id,
    content: '検索結果の投稿',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null },
    media: [],
    genres: [],
    likeCount,
    commentCount: 0,
    repostCount: 0,
    isLiked,
    isBookmarked: false,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    mentionedUsers: [],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useToggleLikeMutation
// ---------------------------------------------------------------------------

describe('useToggleLikeMutation', () => {
  describe('POST/DELETE 出し分け', () => {
    it('currentlyLiked=false のとき POST を呼ぶ', async () => {
      mockApiClientPost.mockResolvedValue({ data: { liked: true, likeCount: 6 }, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/posts/{id}/like', {
        params: { path: { id: 'post-1' } },
      });
      expect(mockApiClientDelete).not.toHaveBeenCalled();
    });

    it('currentlyLiked=true のとき DELETE を呼ぶ', async () => {
      mockApiClientDelete.mockResolvedValue({ data: { liked: false, likeCount: 4 }, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/posts/{id}/like', {
        params: { path: { id: 'post-1' } },
      });
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });

  describe('楽観更新', () => {
    it('onMutate でフィードキャッシュが即時トグルされる', async () => {
      mockApiClientPost.mockResolvedValue({ data: { liked: true, likeCount: 6 }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      // フィードキャッシュを事前にセット
      const feedData = makeFeedPage([makeFeedItem('post-1', false, 5)]);
      queryClient.setQueryData(queryKeys.posts.feed(), feedData);

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      // onMutate が同期的にキャッシュを変更するので、mutate 後に確認する
      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed());
        const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
        expect(item?.isLiked).toBe(true);
        expect(item?.likeCount).toBe(6);
      });
    });

    it('onMutate で詳細キャッシュが即時トグルされる', async () => {
      mockApiClientPost.mockResolvedValue({ data: { liked: true, likeCount: 6 }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.posts.detail('post-1'), makePostDetail('post-1', false, 5));

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail('post-1'));
        expect(cached?.isLiked).toBe(true);
        expect(cached?.likeCount).toBe(6);
      });
    });

    it('onMutate で検索キャッシュが即時トグルされる', async () => {
      mockApiClientPost.mockResolvedValue({ data: { liked: true, likeCount: 6 }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      const searchData = makeSearchPostsPage([makeSearchPostItem('post-1', false, 5)]);
      queryClient.setQueryData(queryKeys.search.posts('松'), searchData);

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<SearchPostsResponse>>(
          queryKeys.search.posts('松')
        );
        const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
        expect(item?.isLiked).toBe(true);
        expect(item?.likeCount).toBe(6);
      });
    });
  });

  describe('onError ロールバック', () => {
    it('エラー時にフィードキャッシュが元に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();

      const feedData = makeFeedPage([makeFeedItem('post-1', false, 5)]);
      queryClient.setQueryData(queryKeys.posts.feed(), feedData);

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      // isError になった時点でロールバック済みのため、キャッシュを確認する
      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed());
        const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
        // ロールバックで元の値に戻る
        expect(item?.isLiked).toBe(false);
        expect(item?.likeCount).toBe(5);
      });
    });

    it('エラー時に詳細キャッシュが元に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientDelete.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.posts.detail('post-1'), makePostDetail('post-1', true, 6));

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: true });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail('post-1'));
        expect(cached?.isLiked).toBe(true);
        expect(cached?.likeCount).toBe(6);
      });
    });
  });

  describe('onSuccess 確定反映', () => {
    it('成功時にサーバー応答の liked/likeCount で詳細キャッシュを上書きする', async () => {
      mockApiClientPost.mockResolvedValue({ data: { liked: true, likeCount: 10 }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.posts.detail('post-1'), makePostDetail('post-1', false, 5));

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      // setQueryData の確定値が書き込まれるタイミングを待つ（invalidate後もgcTime:Infinityでキャッシュが残る）
      await waitFor(() => {
        const cached = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail('post-1'));
        expect(cached?.isLiked).toBe(true);
        expect(cached?.likeCount).toBe(10);
      });
    });

    it('成功時にサーバー応答の liked/likeCount でフィードキャッシュを上書きする', async () => {
      mockApiClientPost.mockResolvedValue({ data: { liked: true, likeCount: 10 }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      const feedData = makeFeedPage([makeFeedItem('post-1', false, 5)]);
      queryClient.setQueryData(queryKeys.posts.feed(), feedData);

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      // フィードは invalidate しないため setQueryData の値が残る
      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed());
        const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
        expect(item?.isLiked).toBe(true);
        expect(item?.likeCount).toBe(10);
      });
    });
  });

  describe('エラー種別', () => {
    it('403 GUEST_NOT_ALLOWED で ApiError が throw される', async () => {
      const err = makeApiError('GUEST_NOT_ALLOWED', 403);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
      }
    });

    it('404 NOT_FOUND で ApiError が throw される', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('NOT_FOUND');
      }
    });

    it('429 RATE_LIMITED で ApiError が throw される', async () => {
      const err = makeApiError('RATE_LIMITED', 429);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleLikeMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyLiked: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('RATE_LIMITED');
      }
    });
  });
});
