/**
 * @module __tests__/lib/queries/search-wave2
 * 波2フック（useSearchHashtagsQuery / useSearchPostsQuery filter 拡張）のユニットテスト。
 * lib/api/client をモック境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useSearchHashtagsQuery, useSearchPostsQuery } from '@/lib/queries/search';
import { queryKeys } from '@/lib/queries/keys';
import type { SearchPostsFilter } from '@/lib/queries/keys';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientGet = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
    POST: jest.fn(),
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

function makeHashtagPage(names: string[]) {
  return {
    items: names.map((name, i) => ({ id: `hashtag-${i}`, name, count: 10 + i })),
  };
}

function makeSearchPostsPage(ids: string[], nextCursor: string | null) {
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

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// useSearchHashtagsQuery
// ===========================================================================

describe('useSearchHashtagsQuery', () => {
  it('q でハッシュタグ候補 items が返る', async () => {
    const page = makeHashtagPage(['黒松', '五葉松', '真柏']);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSearchHashtagsQuery('松'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(3);
    expect(result.current.data?.items[0].name).toBe('黒松');
  });

  it('空文字 q の場合はフェッチしない（enabled=false）', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSearchHashtagsQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('limit パラメータが指定される場合は API へ渡る', async () => {
    const page = makeHashtagPage(['黒松']);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSearchHashtagsQuery('松', 5), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/search/hashtags',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ q: '松', limit: 5 }),
        }),
      })
    );
  });

  it('空レスポンス（items が空）でも正常終了する', async () => {
    const page = makeHashtagPage([]);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSearchHashtagsQuery('xyz'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(0);
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSearchHashtagsQuery('松'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('429 RATE_LIMITED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSearchHashtagsQuery('松'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
      expect(result.current.error.status).toBe(429);
    }
  });
});

// ===========================================================================
// useSearchPostsQuery — filter 拡張
// ===========================================================================

describe('useSearchPostsQuery filter 拡張', () => {
  describe('フィルタ別キャッシュ分離', () => {
    it('filter なしと filter あり（genreId 指定）は別キャッシュになる', () => {
      const keyNoFilter = queryKeys.search.posts('松');
      const keyWithFilter = queryKeys.search.posts('松', { genreId: 'genre-1' });
      expect(keyNoFilter).not.toEqual(keyWithFilter);
    });

    it('同じ filter 内容なら同一キャッシュキーになる', () => {
      const filterA: SearchPostsFilter = { genreId: 'genre-1', minLikes: 10 };
      const filterB: SearchPostsFilter = { genreId: 'genre-1', minLikes: 10 };
      expect(queryKeys.search.posts('松', filterA)).toEqual(
        queryKeys.search.posts('松', filterB)
      );
    });

    it('mediaType が異なると別キャッシュになる', () => {
      const keyImage = queryKeys.search.posts('松', { mediaType: 'image' });
      const keyVideo = queryKeys.search.posts('松', { mediaType: 'video' });
      expect(keyImage).not.toEqual(keyVideo);
    });
  });

  describe('各 filter 値が API クエリに渡る', () => {
    it('genreId フィルタが API クエリに渡る', async () => {
      const page = makeSearchPostsPage(['post-1'], null);
      mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useSearchPostsQuery('松', { genreId: 'genre-1' }),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/search/posts',
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({ genreId: 'genre-1' }),
          }),
        })
      );
    });

    it('dateFrom/dateTo フィルタが API クエリに渡る', async () => {
      const page = makeSearchPostsPage(['post-1'], null);
      mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useSearchPostsQuery('松', {
            dateFrom: '2025-01-01',
            dateTo: '2025-06-30',
          }),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/search/posts',
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({
              dateFrom: '2025-01-01',
              dateTo: '2025-06-30',
            }),
          }),
        })
      );
    });

    it('minLikes フィルタが API クエリに渡る', async () => {
      const page = makeSearchPostsPage(['post-1'], null);
      mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useSearchPostsQuery('松', { minLikes: 10 }),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/search/posts',
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({ minLikes: 10 }),
          }),
        })
      );
    });

    it('mediaType フィルタが API クエリに渡る', async () => {
      const page = makeSearchPostsPage(['post-1'], null);
      mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () => useSearchPostsQuery('松', { mediaType: 'image' }),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/search/posts',
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({ mediaType: 'image' }),
          }),
        })
      );
    });

    it('filter 未指定の場合はフィルタ値が undefined のまま渡される', async () => {
      const page = makeSearchPostsPage(['post-1'], null);
      mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useSearchPostsQuery('松'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const callArgs = mockApiClientGet.mock.calls[0][1] as {
        params: { query: Record<string, unknown> };
      };
      expect(callArgs.params.query.genreId).toBeUndefined();
      expect(callArgs.params.query.dateFrom).toBeUndefined();
      expect(callArgs.params.query.dateTo).toBeUndefined();
      expect(callArgs.params.query.minLikes).toBeUndefined();
      expect(callArgs.params.query.mediaType).toBeUndefined();
    });

    it('複数フィルタを同時に指定できる', async () => {
      const page = makeSearchPostsPage(['post-1'], null);
      mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useSearchPostsQuery('松', {
            genreId: 'genre-1',
            minLikes: 5,
            mediaType: 'image',
          }),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/search/posts',
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({
              genreId: 'genre-1',
              minLikes: 5,
              mediaType: 'image',
            }),
          }),
        })
      );
    });
  });

  describe('基本動作（filter なし）', () => {
    it('成功で投稿 items が返る', async () => {
      const page = makeSearchPostsPage(['post-1', 'post-2'], null);
      mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useSearchPostsQuery('松'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages[0].items).toHaveLength(2);
    });

    it('空文字 q の場合はフェッチしない（enabled=false）', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useSearchPostsQuery(''), { wrapper: Wrapper });

      expect(result.current.isPending).toBe(true);
      expect(mockApiClientGet).not.toHaveBeenCalled();
    });

    it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
      mockApiClientGet.mockResolvedValue({
        data: undefined,
        error: makeApiError('AUTH_REQUIRED', 401),
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useSearchPostsQuery('松'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('AUTH_REQUIRED');
      }
    });
  });
});
