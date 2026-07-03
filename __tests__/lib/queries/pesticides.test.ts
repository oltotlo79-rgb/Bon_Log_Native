/**
 * lib/queries/pesticides のユニットテスト。
 * 3 カタログ（病害虫・農薬製品・有効成分）の infinite クエリ + 詳細クエリを検証する。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  usePesticideDiseasePestsQuery,
  usePesticideDiseasePestDetailQuery,
  usePesticideProductsQuery,
  usePesticideProductDetailQuery,
  usePesticideIngredientsQuery,
  usePesticideIngredientDetailQuery,
  useSpreaderTypesQuery,
  useSpreaderTypeDetailQuery,
  useSpreaderProductsQuery,
  usePesticideColumnsQuery,
  usePesticideColumnDetailQuery,
  useFormulationTypesQuery,
  useMixingDataQuery,
} from '@/lib/queries/pesticides';

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

function makeDiseasePestPage(
  items: { id: string; slug: string; name: string }[],
  nextCursor: string | null
) {
  return {
    items: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      nameEn: null,
      category: '害虫',
      shortDescription: '説明',
    })),
    nextCursor,
  };
}

function makePesticideProductPage(
  items: { id: string; slug: string; name: string }[],
  nextCursor: string | null
) {
  return {
    items: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      type: '殺虫剤',
      formulationTypeCode: 'EC',
    })),
    nextCursor,
  };
}

function makeIngredientPage(
  items: { id: string; slug: string; name: string }[],
  nextCursor: string | null
) {
  return {
    items: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      nameEn: null,
      type: '殺虫',
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
// usePesticideDiseasePestsQuery
// ---------------------------------------------------------------------------

describe('usePesticideDiseasePestsQuery', () => {
  it('成功で病害虫 items が返る', async () => {
    const page = makeDiseasePestPage(
      [{ id: 'dp1', slug: 'aphid', name: 'アブラムシ' }],
      null
    );
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideDiseasePestsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
    expect(result.current.data?.pages[0].items[0].name).toBe('アブラムシ');
  });

  it('空レスポンスで hasNextPage が false', async () => {
    const page = makeDiseasePestPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideDiseasePestsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor が string の場合は hasNextPage が true', async () => {
    const page = makeDiseasePestPage(
      [{ id: 'dp1', slug: 'aphid', name: 'アブラムシ' }],
      'cursor-abc'
    );
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideDiseasePestsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('fetchNextPage で次ページが読み込まれる', async () => {
    const page1 = makeDiseasePestPage(
      [{ id: 'dp1', slug: 'aphid', name: 'アブラムシ' }],
      'cursor-abc'
    );
    const page2 = makeDiseasePestPage(
      [{ id: 'dp2', slug: 'spider-mite', name: 'ハダニ' }],
      null
    );
    mockApiClientGet
      .mockResolvedValueOnce({ data: page1, error: undefined })
      .mockResolvedValueOnce({ data: page2, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideDiseasePestsQuery(), { wrapper: Wrapper });

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
    expect(result.current.data?.pages[1].items[0].name).toBe('ハダニ');
  });

  it('search フィルタで API を呼び出す', async () => {
    const page = makeDiseasePestPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideDiseasePestsQuery({ search: 'アブラ' }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/pesticides/disease-pests',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ search: 'アブラ' }),
        }),
      })
    );
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideDiseasePestsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// usePesticideDiseasePestDetailQuery
// ---------------------------------------------------------------------------

describe('usePesticideDiseasePestDetailQuery', () => {
  it('成功で病害虫詳細が返る', async () => {
    const data = {
      id: 'dp1',
      slug: 'aphid',
      name: 'アブラムシ',
      nameEn: 'Aphid',
      category: '害虫',
      description: 'アブラムシの説明',
      symptoms: '葉が縮れる',
      preventionMethods: ['天敵を活用する'],
      suitablePesticides: [],
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideDiseasePestDetailQuery('aphid'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('aphid');
    expect(result.current.data?.name).toBe('アブラムシ');
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideDiseasePestDetailQuery(''),
      { wrapper: Wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideDiseasePestDetailQuery('unknown'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// usePesticideProductsQuery
// ---------------------------------------------------------------------------

describe('usePesticideProductsQuery', () => {
  it('成功で農薬製品 items が返る', async () => {
    const page = makePesticideProductPage(
      [{ id: 'pp1', slug: 'sumithion', name: 'スミチオン乳剤' }],
      null
    );
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideProductsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
  });

  it('空レスポンスで hasNextPage が false', async () => {
    const page = makePesticideProductPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideProductsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideProductsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideProductsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// usePesticideProductDetailQuery
// ---------------------------------------------------------------------------

describe('usePesticideProductDetailQuery', () => {
  it('成功で農薬製品詳細が返る', async () => {
    const data = {
      id: 'pp1',
      slug: 'sumithion',
      name: 'スミチオン乳剤',
      type: '殺虫剤',
      formulationTypeCode: 'EC',
      description: '有機リン系殺虫剤',
      activeIngredients: [],
      targetPests: [],
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideProductDetailQuery('sumithion'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('sumithion');
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideProductDetailQuery(''),
      { wrapper: Wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideProductDetailQuery('unknown'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// usePesticideIngredientsQuery
// ---------------------------------------------------------------------------

describe('usePesticideIngredientsQuery', () => {
  it('成功で有効成分 items が返る', async () => {
    const page = makeIngredientPage(
      [{ id: 'i1', slug: 'fenitrothion', name: 'フェニトロチオン' }],
      null
    );
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideIngredientsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
  });

  it('nextCursor が string の場合は hasNextPage が true', async () => {
    const page = makeIngredientPage(
      [{ id: 'i1', slug: 'fenitrothion', name: 'フェニトロチオン' }],
      'cursor-next'
    );
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideIngredientsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('search フィルタで API を呼び出す', async () => {
    const page = makeIngredientPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideIngredientsQuery({ search: 'フェニ' }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/pesticides/ingredients',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ search: 'フェニ' }),
        }),
      })
    );
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideIngredientsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// usePesticideIngredientDetailQuery
// ---------------------------------------------------------------------------

describe('usePesticideIngredientDetailQuery', () => {
  it('成功で有効成分詳細が返る', async () => {
    const data = {
      id: 'i1',
      slug: 'fenitrothion',
      name: 'フェニトロチオン',
      nameEn: 'Fenitrothion',
      type: '殺虫',
      description: '有機リン系',
      products: [],
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideIngredientDetailQuery('fenitrothion'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('fenitrothion');
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideIngredientDetailQuery(''),
      { wrapper: Wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideIngredientDetailQuery('unknown'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideIngredientDetailQuery('some-slug'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// useSpreaderTypesQuery
// ---------------------------------------------------------------------------

describe('useSpreaderTypesQuery', () => {
  it('成功で展着剤タイプ一覧が返る', async () => {
    const data = { items: [{ id: 'st1', slug: 'silicone', name: 'シリコン系' }] };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSpreaderTypesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].name).toBe('シリコン系');
  });

  it('/api/v1/pesticides/spreaders を呼ぶ', async () => {
    mockApiClientGet.mockResolvedValue({ data: { items: [] }, error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useSpreaderTypesQuery(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/pesticides/spreaders')
    );
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSpreaderTypesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useSpreaderTypeDetailQuery
// ---------------------------------------------------------------------------

describe('useSpreaderTypeDetailQuery', () => {
  it('成功で展着剤タイプ詳細が返る', async () => {
    const data = { id: 'st1', slug: 'silicone', name: 'シリコン系展着剤', description: '説明' };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useSpreaderTypeDetailQuery('silicone'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('silicone');
  });

  it('slug を path パラメータとして渡す', async () => {
    mockApiClientGet.mockResolvedValue({ data: { id: 'st1', slug: 'silicone' }, error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useSpreaderTypeDetailQuery('silicone'), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/pesticides/spreaders/{slug}',
        expect.objectContaining({
          params: expect.objectContaining({ path: { slug: 'silicone' } }),
        })
      )
    );
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useSpreaderTypeDetailQuery(''),
      { wrapper: Wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('エラー時に ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useSpreaderTypeDetailQuery('unknown'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useSpreaderProductsQuery
// ---------------------------------------------------------------------------

describe('useSpreaderProductsQuery', () => {
  it('成功で展着剤製品 items が返る', async () => {
    const page = {
      items: [{ id: 'sp1', slug: 'spreader-a', name: 'スプレッダーA' }],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSpreaderProductsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items[0].name).toBe('スプレッダーA');
  });

  it('nextCursor が null のとき hasNextPage が false', async () => {
    mockApiClientGet.mockResolvedValue({
      data: { items: [], nextCursor: null },
      error: undefined,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSpreaderProductsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSpreaderProductsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// usePesticideColumnsQuery
// ---------------------------------------------------------------------------

describe('usePesticideColumnsQuery', () => {
  it('成功でコラム items が返る', async () => {
    const page = {
      items: [{ id: 'pc1', slug: 'col-1', title: '農薬コラム1' }],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideColumnsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items[0].title).toBe('農薬コラム1');
  });

  it('nextCursor があるとき hasNextPage が true', async () => {
    mockApiClientGet.mockResolvedValue({
      data: { items: [{ id: 'pc1', slug: 'col-1', title: '農薬コラム1' }], nextCursor: 'next-cursor' },
      error: undefined,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideColumnsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePesticideColumnsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// usePesticideColumnDetailQuery
// ---------------------------------------------------------------------------

describe('usePesticideColumnDetailQuery', () => {
  it('成功でコラム詳細が返る', async () => {
    const data = { id: 'pc1', slug: 'col-1', title: '農薬コラム1', body: '本文' };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideColumnDetailQuery('col-1'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('col-1');
  });

  it('slug をパスに渡す', async () => {
    mockApiClientGet.mockResolvedValue({ data: { id: 'pc1', slug: 'col-1' }, error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => usePesticideColumnDetailQuery('col-1'), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/pesticides/columns/{slug}',
        expect.objectContaining({
          params: expect.objectContaining({ path: { slug: 'col-1' } }),
        })
      )
    );
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideColumnDetailQuery(''),
      { wrapper: Wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('エラー時に ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePesticideColumnDetailQuery('unknown'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useFormulationTypesQuery
// ---------------------------------------------------------------------------

describe('useFormulationTypesQuery', () => {
  it('成功で剤型マスタ一覧が返る', async () => {
    const data = { items: [{ id: 'ft1', code: 'EC', name: '乳剤', description: '説明' }] };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFormulationTypesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].code).toBe('EC');
  });

  it('/api/v1/pesticides/formulations を呼ぶ', async () => {
    mockApiClientGet.mockResolvedValue({ data: { items: [] }, error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useFormulationTypesQuery(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/pesticides/formulations')
    );
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFormulationTypesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useMixingDataQuery
// ---------------------------------------------------------------------------

describe('useMixingDataQuery', () => {
  it('成功で混用データが返る', async () => {
    const data = {
      pesticides: [
        { id: 'p1', slug: 'prod-a', name: '殺虫剤A', pesticideType: 'insecticide' as const },
      ],
      incompatibilities: [
        { pesticideId: 'p1', incompatibleWithId: 'p2' },
      ],
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMixingDataQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pesticides).toHaveLength(1);
    expect(result.current.data?.pesticides[0].slug).toBe('prod-a');
    expect(result.current.data?.incompatibilities).toHaveLength(1);
  });

  it('/api/v1/pesticides/mixing-data を呼ぶ', async () => {
    mockApiClientGet.mockResolvedValue({ data: { items: [] }, error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useMixingDataQuery(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/pesticides/mixing-data')
    );
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMixingDataQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
