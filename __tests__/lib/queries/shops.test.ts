/**
 * lib/queries/shops のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  useShopsListQuery,
  useShopDetailQuery,
  useShopReviewsQuery,
  useGenresQuery,
  useCreateShopMutation,
  useUpdateShopMutation,
  useCreateReviewMutation,
  useShopMapPinsQuery,
} from '@/lib/queries/shops';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientGet = jest.fn();
const mockApiClientPost = jest.fn();
const mockApiClientPatch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
    POST: (...args: unknown[]) => mockApiClientPost(...args),
    PATCH: (...args: unknown[]) => mockApiClientPatch(...args),
    DELETE: jest.fn(),
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

type ShopItem = components['schemas']['ShopItem'];
type ShopListResponse = components['schemas']['ShopListResponse'];
type ShopCreatedResponse = components['schemas']['ShopCreatedResponse'];
type ReviewItem = components['schemas']['ReviewItem'];
type ReviewListResponse = components['schemas']['ReviewListResponse'];
type GenreListResponse = components['schemas']['GenreListResponse'];

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

function makeShopItem(id: string): ShopItem {
  return {
    id,
    name: '松屋盆栽園',
    address: '東京都渋谷区1-1-1',
    phone: null,
    website: null,
    businessHours: null,
    closedDays: null,
    latitude: null,
    longitude: null,
    genres: [{ id: 'genre-1', name: '盆栽販売' }],
    averageRating: 4.2,
    reviewCount: 10,
    isOwner: false,
  };
}

function makeShopListPage(items: ShopItem[]): InfiniteData<ShopListResponse> {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

function makeReviewItem(id: string): ReviewItem {
  return {
    id,
    rating: 4,
    content: '素晴らしい盆栽が揃っています。',
    images: [],
    createdAt: '2025-06-01T00:00:00Z',
    user: { id: 'user-1', nickname: '盆栽愛好家', avatarUrl: null },
  };
}

function makeReviewListPage(items: ReviewItem[]): InfiniteData<ReviewListResponse> {
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
// useShopsListQuery
// ---------------------------------------------------------------------------

describe('useShopsListQuery', () => {
  it('正常系: 盆栽園一覧が返される', async () => {
    const page: ShopListResponse = {
      items: [makeShopItem('shop-1'), makeShopItem('shop-2')],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('空一覧: items が空配列', async () => {
    const page: ShopListResponse = { items: [], nextCursor: null };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(0);
  });

  it('params=sortBy で sortBy が API に渡される', async () => {
    const page: ShopListResponse = { items: [], nextCursor: null };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useShopsListQuery({ sortBy: 'rating' }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/shops',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ sortBy: 'rating' }),
        }),
      })
    );
  });

  it('fetchNextPage: nextCursor がある場合に次ページを取得できる', async () => {
    const firstPage: ShopListResponse = {
      items: [makeShopItem('shop-1')],
      nextCursor: 'cursor-abc',
    };
    const secondPage: ShopListResponse = {
      items: [makeShopItem('shop-2')],
      nextCursor: null,
    };
    mockApiClientGet
      .mockResolvedValueOnce({ data: firstPage, error: undefined })
      .mockResolvedValueOnce({ data: secondPage, error: undefined });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useShopsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });

  it('エラー系: isError=true になる', async () => {
    const err = makeApiError('INTERNAL_ERROR', 500);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useShopDetailQuery
// ---------------------------------------------------------------------------

describe('useShopDetailQuery', () => {
  it('正常系: 詳細が返される', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeShopItem('shop-1'), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopDetailQuery('shop-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('shop-1');
  });

  it('id が空文字のときフェッチしない（enabled=false）', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopDetailQuery(''), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND で isError=true になる', async () => {
    const err = makeApiError('NOT_FOUND', 404);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopDetailQuery('shop-999'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useShopReviewsQuery
// ---------------------------------------------------------------------------

describe('useShopReviewsQuery', () => {
  it('正常系: レビュー一覧が返される', async () => {
    const page: ReviewListResponse = {
      items: [makeReviewItem('review-1')],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopReviewsQuery('shop-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
  });

  it('shopId が空文字のときフェッチしない', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopReviewsQuery(''), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('fetchNextPage: nextCursor がある場合に次ページを取得できる', async () => {
    const firstPage: ReviewListResponse = {
      items: [makeReviewItem('review-1')],
      nextCursor: 'cursor-xyz',
    };
    const secondPage: ReviewListResponse = {
      items: [makeReviewItem('review-2')],
      nextCursor: null,
    };
    mockApiClientGet
      .mockResolvedValueOnce({ data: firstPage, error: undefined })
      .mockResolvedValueOnce({ data: secondPage, error: undefined });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useShopReviewsQuery('shop-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });
});

// ---------------------------------------------------------------------------
// useGenresQuery
// ---------------------------------------------------------------------------

describe('useGenresQuery', () => {
  it('正常系 type=shop: ジャンル一覧が返される', async () => {
    const genreList: GenreListResponse = {
      items: [{ id: 'genre-1', name: '盆栽販売' }],
    };
    mockApiClientGet.mockResolvedValue({ data: genreList, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGenresQuery('shop'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it('正常系 type=post: 投稿ジャンル一覧が返される', async () => {
    const genreList: GenreListResponse = {
      items: [{ id: 'genre-2', name: '松柏類' }],
    };
    mockApiClientGet.mockResolvedValue({ data: genreList, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGenresQuery('post'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].name).toBe('松柏類');
  });

  it('エラー系: isError=true になる', async () => {
    const err = makeApiError('INTERNAL_ERROR', 500);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGenresQuery('shop'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useCreateShopMutation
// ---------------------------------------------------------------------------

describe('useCreateShopMutation', () => {
  it('正常系: POST を呼び成功する', async () => {
    const created: ShopCreatedResponse = { id: 'shop-new' };
    mockApiClientPost.mockResolvedValue({ data: created, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateShopMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        name: '新盆栽園',
        address: '東京都新宿区1-1-1',
        genreIds: ['genre-1'],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/shops', expect.anything());
  });

  it('onSettled: shops.all が invalidate される', async () => {
    const created: ShopCreatedResponse = { id: 'shop-new' };
    mockApiClientPost.mockResolvedValue({ data: created, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.shops.list({}), makeShopListPage([]));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateShopMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ name: '新盆栽園', address: '東京', genreIds: [] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.shops.all })
    );
  });

  it('409 CONFLICT（同一住所重複）で isError=true になる', async () => {
    const err = makeApiError('CONFLICT', 409);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateShopMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ name: '重複', address: '既存住所', genreIds: [] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('CONFLICT');
    }
  });
});

// ---------------------------------------------------------------------------
// useUpdateShopMutation
// ---------------------------------------------------------------------------

describe('useUpdateShopMutation', () => {
  it('正常系: PATCH を呼び成功する', async () => {
    mockApiClientPatch.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateShopMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'shop-1', name: '更新盆栽園' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPatch).toHaveBeenCalledWith('/api/v1/shops/{id}', expect.anything());
  });

  it('onSettled: shops.detail(id) と shops.all が invalidate される', async () => {
    mockApiClientPatch.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateShopMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'shop-1', name: '更新' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.shops.detail('shop-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.shops.all })
    );
  });

  it('403 GUEST_NOT_ALLOWED で isError=true になる', async () => {
    const err = makeApiError('GUEST_NOT_ALLOWED', 403);
    mockApiClientPatch.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateShopMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: 'shop-1', name: '不正更新' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useCreateReviewMutation
// ---------------------------------------------------------------------------

describe('useCreateReviewMutation', () => {
  it('正常系: POST を呼び成功する', async () => {
    mockApiClientPost.mockResolvedValue({ data: makeReviewItem('review-new'), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateReviewMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ shopId: 'shop-1', rating: 5, mediaUrls: [] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/shops/{id}/reviews', expect.anything());
  });

  it('onSettled: shops.reviews(shopId) と shops.detail(shopId) が invalidate される', async () => {
    mockApiClientPost.mockResolvedValue({ data: makeReviewItem('review-new'), error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.shops.reviews('shop-1'), makeReviewListPage([]));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateReviewMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ shopId: 'shop-1', rating: 4, mediaUrls: [] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.shops.reviews('shop-1') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.shops.detail('shop-1') })
    );
  });

  it('409 CONFLICT（二重投稿）で isError=true になる', async () => {
    const err = makeApiError('CONFLICT', 409);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateReviewMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ shopId: 'shop-1', rating: 4, mediaUrls: [] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('CONFLICT');
    }
  });

  it('400 VALIDATION_ERROR（評価値不正）で isError=true になる', async () => {
    const err = makeApiError('VALIDATION_ERROR', 400);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateReviewMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ shopId: 'shop-1', rating: 0, mediaUrls: [] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

// ---------------------------------------------------------------------------
// useShopMapPinsQuery
// ---------------------------------------------------------------------------

describe('useShopMapPinsQuery', () => {
  it('成功でマップピン一覧が返る', async () => {
    const data = {
      items: [
        {
          id: 'shop-1',
          name: '盆栽園A',
          latitude: 35.6762,
          longitude: 139.6503,
          address: '東京都千代田区',
          averageRating: 4.5,
          reviewCount: 10,
        },
      ],
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopMapPinsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].name).toBe('盆栽園A');
  });

  it('/api/v1/shops/map-pins を呼ぶ', async () => {
    mockApiClientGet.mockResolvedValue({ data: { items: [] }, error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useShopMapPinsQuery(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/shops/map-pins')
    );
  });

  it('items が空でも isSuccess になる', async () => {
    mockApiClientGet.mockResolvedValue({ data: { items: [] }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopMapPinsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(0);
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useShopMapPinsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
