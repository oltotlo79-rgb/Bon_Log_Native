/**
 * lib/queries/bookmarks のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { useToggleBookmarkMutation, useBookmarksQuery } from '@/lib/queries/bookmarks';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientGet = jest.fn();
const mockApiClientPost = jest.fn();
const mockApiClientDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
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
type BookmarksListResponse = components['schemas']['BookmarksListResponse'];
type BookmarkItem = BookmarksListResponse['items'][number];

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

function makeFeedItem(id: string, isBookmarked: boolean): FeedResponse['items'][number] {
  return {
    id,
    content: '盆栽の記録',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    bonsaiId: null,
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
    media: [],
    genres: [],
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    isLiked: false,
    isBookmarked,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    poll: null,
    mentionedUsers: [],
  };
}

function makeFeedPage(items: FeedResponse['items']): InfiniteData<FeedResponse> {
  return {
    pages: [{ items, nextCursor: null, isGuest: false }],
    pageParams: [undefined],
  };
}

function makePostDetail(id: string, isBookmarked: boolean): PostResponse {
  return {
    id,
    content: '盆栽詳細',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    bonsaiId: null,
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
    media: [],
    genres: [],
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    isLiked: false,
    isBookmarked,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    poll: null,
    mentionedUsers: [],
  };
}

function makeBookmarkItem(id: string): BookmarkItem {
  return {
    id,
    content: 'ブックマーク投稿',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    bonsaiId: null,
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
    media: [],
    genres: [],
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    isLiked: false,
    isBookmarked: true,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    poll: null,
    mentionedUsers: [],
  };
}

function makeBookmarksPage(items: BookmarkItem[]): InfiniteData<BookmarksListResponse> {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

function makeSearchItem(id: string, isBookmarked: boolean): SearchPostsResponse['items'][number] {
  return {
    id,
    content: '検索結果',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
    userId: 'user-1',
    bonsaiId: null,
    user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
    media: [],
    genres: [],
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    isLiked: false,
    isBookmarked,
    isReposted: false,
    quotePost: null,
    repostPost: null,
    poll: null,
    mentionedUsers: [],
  };
}

function makeSearchPage(items: SearchPostsResponse['items']): InfiniteData<SearchPostsResponse> {
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
// useToggleBookmarkMutation
// ---------------------------------------------------------------------------

describe('useToggleBookmarkMutation', () => {
  describe('POST/DELETE 出し分け', () => {
    it('currentlyBookmarked=false のとき POST を呼ぶ', async () => {
      mockApiClientPost.mockResolvedValue({ data: { bookmarked: true }, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/posts/{id}/bookmark', {
        params: { path: { id: 'post-1' } },
      });
      expect(mockApiClientDelete).not.toHaveBeenCalled();
    });

    it('currentlyBookmarked=true のとき DELETE を呼ぶ', async () => {
      mockApiClientDelete.mockResolvedValue({ data: { bookmarked: false }, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/posts/{id}/bookmark', {
        params: { path: { id: 'post-1' } },
      });
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });

  describe('楽観更新', () => {
    it('onMutate でフィードキャッシュの isBookmarked が即時トグルされる', async () => {
      mockApiClientPost.mockResolvedValue({ data: { bookmarked: true }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.posts.feed(), makeFeedPage([makeFeedItem('post-1', false)]));

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed());
        const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
        expect(item?.isBookmarked).toBe(true);
      });
    });

    it('onMutate で詳細キャッシュの isBookmarked が即時トグルされる', async () => {
      mockApiClientPost.mockResolvedValue({ data: { bookmarked: true }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.posts.detail('post-1'), makePostDetail('post-1', false));

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail('post-1'));
        expect(cached?.isBookmarked).toBe(true);
      });
    });

    it('onMutate でブックマーク解除時にブックマーク一覧から該当アイテムが除去される', async () => {
      mockApiClientDelete.mockResolvedValue({ data: { bookmarked: false }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(
        queryKeys.bookmarks.list(),
        makeBookmarksPage([makeBookmarkItem('post-1'), makeBookmarkItem('post-2')])
      );

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: true });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<BookmarksListResponse>>(
          queryKeys.bookmarks.list()
        );
        const ids = cached?.pages[0].items.map((i) => i.id);
        expect(ids).not.toContain('post-1');
        expect(ids).toContain('post-2');
      });
    });

    it('onMutate で検索キャッシュの isBookmarked が即時トグルされる', async () => {
      mockApiClientPost.mockResolvedValue({ data: { bookmarked: true }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(
        queryKeys.search.posts('松'),
        makeSearchPage([makeSearchItem('post-1', false)])
      );

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<SearchPostsResponse>>(
          queryKeys.search.posts('松')
        );
        const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
        expect(item?.isBookmarked).toBe(true);
      });
    });
  });

  describe('onError ロールバック', () => {
    it('エラー時にフィードキャッシュが元に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.posts.feed(), makeFeedPage([makeFeedItem('post-1', false)]));

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.posts.feed());
        const item = cached?.pages[0].items.find((i) => i.id === 'post-1');
        expect(item?.isBookmarked).toBe(false);
      });
    });

    it('エラー時に詳細キャッシュが元に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.posts.detail('post-1'), makePostDetail('post-1', false));

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail('post-1'));
        expect(cached?.isBookmarked).toBe(false);
      });
    });

    it('エラー時にブックマーク一覧キャッシュが元に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientDelete.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();

      const original = makeBookmarksPage([makeBookmarkItem('post-1')]);
      queryClient.setQueryData(queryKeys.bookmarks.list(), original);

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: true });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<BookmarksListResponse>>(
          queryKeys.bookmarks.list()
        );
        expect(cached?.pages[0].items).toHaveLength(1);
        expect(cached?.pages[0].items[0].id).toBe('post-1');
      });
    });
  });

  describe('onSettled invalidation', () => {
    it('成功後に posts.detail(postId) が invalidate される', async () => {
      mockApiClientPost.mockResolvedValue({ data: { bookmarked: true }, error: undefined });
      const { Wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.posts.detail('post-1') })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.bookmarks.list() })
      );
    });
  });

  describe('エラー種別', () => {
    it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
      const err = makeApiError('AUTH_REQUIRED', 401);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    it('429 RATE_LIMITED で ApiError が throw される', async () => {
      const err = makeApiError('RATE_LIMITED', 429);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleBookmarkMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ postId: 'post-1', currentlyBookmarked: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('RATE_LIMITED');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// useBookmarksQuery
// ---------------------------------------------------------------------------

describe('useBookmarksQuery', () => {
  it('正常系: ブックマーク一覧が返される', async () => {
    const page: BookmarksListResponse = {
      items: [makeBookmarkItem('post-1'), makeBookmarkItem('post-2')],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBookmarksQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('空一覧: items が空配列', async () => {
    const page: BookmarksListResponse = { items: [], nextCursor: null };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBookmarksQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(0);
  });

  it('fetchNextPage: nextCursor がある場合に次ページを取得できる', async () => {
    const firstPage: BookmarksListResponse = {
      items: [makeBookmarkItem('post-1')],
      nextCursor: 'cursor-abc',
    };
    const secondPage: BookmarksListResponse = {
      items: [makeBookmarkItem('post-2')],
      nextCursor: null,
    };
    mockApiClientGet
      .mockResolvedValueOnce({ data: firstPage, error: undefined })
      .mockResolvedValueOnce({ data: secondPage, error: undefined });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBookmarksQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.data?.pages[1].items[0].id).toBe('post-2');
  });

  it('エラー系: API がエラーを返すと isError=true になる', async () => {
    const err = makeApiError('AUTH_REQUIRED', 401);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBookmarksQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
