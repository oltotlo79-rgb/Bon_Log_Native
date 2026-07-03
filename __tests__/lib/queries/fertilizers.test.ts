/**
 * lib/queries/fertilizers のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useFertilizerNutrientsQuery,
  useFertilizerNutrientDetailQuery,
  useFertilizerCategoriesQuery,
  useFertilizerTreeSpeciesQuery,
  useFertilizationScheduleQuery,
  useFertilizerColumnsQuery,
  useFertilizerColumnDetailQuery,
} from '@/lib/queries/fertilizers';

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

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useFertilizerNutrientsQuery
// ---------------------------------------------------------------------------

describe('useFertilizerNutrientsQuery', () => {
  it('成功で栄養素一覧が返る', async () => {
    const data = [
      { id: 'n1', slug: 'nitrogen', name: '窒素', symbol: 'N', category: 'primary' },
      { id: 'n2', slug: 'phosphorus', name: 'リン', symbol: 'P', category: 'primary' },
    ];
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerNutrientsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('category フィルタで API を呼び出す', async () => {
    mockApiClientGet.mockResolvedValue({ data: [], error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizerNutrientsQuery('primary'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/fertilizers/nutrients',
      expect.objectContaining({
        params: { query: { category: 'primary' } },
      })
    );
  });

  it('空配列で isSuccess になる', async () => {
    mockApiClientGet.mockResolvedValue({ data: [], error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerNutrientsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerNutrientsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerNutrientsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// useFertilizerNutrientDetailQuery
// ---------------------------------------------------------------------------

describe('useFertilizerNutrientDetailQuery', () => {
  it('成功で栄養素詳細が返る', async () => {
    const data = {
      id: 'n1',
      slug: 'nitrogen',
      name: '窒素',
      nameEn: 'Nitrogen',
      symbol: 'N',
      category: 'primary',
      description: '窒素は葉の成長に不可欠です。',
      deficiencySymptoms: '葉が黄色くなる',
      excessSymptoms: '徒長する',
      sources: ['油粕', '魚粉'],
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizerNutrientDetailQuery('nitrogen'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('nitrogen');
    expect(result.current.data?.name).toBe('窒素');
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizerNutrientDetailQuery(''),
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
      () => useFertilizerNutrientDetailQuery('unknown'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });
});

// ---------------------------------------------------------------------------
// useFertilizerCategoriesQuery
// ---------------------------------------------------------------------------

describe('useFertilizerCategoriesQuery', () => {
  it('成功でカテゴリ一覧が返る', async () => {
    const data = [
      { code: 'organic', slug: 'organic', name: '有機肥料', description: null, merit: null, demerit: null, bonsaiUsage: null },
      { code: 'chemical', slug: 'chemical', name: '化学肥料', description: null, merit: null, demerit: null, bonsaiUsage: null },
    ];
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerCategoriesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerCategoriesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useFertilizerTreeSpeciesQuery
// ---------------------------------------------------------------------------

describe('useFertilizerTreeSpeciesQuery', () => {
  it('成功で樹種一覧が返る', async () => {
    const data = [
      { id: 'ts1', slug: 'kuromatsu', name: '黒松', category: '松柏類', fertilizingPolicy: null },
      { id: 'ts2', slug: 'keyaki', name: '欅', category: '雑木類', fertilizingPolicy: null },
    ];
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerTreeSpeciesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('category フィルタで API を呼び出す', async () => {
    mockApiClientGet.mockResolvedValue({ data: [], error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizerTreeSpeciesQuery('松柏類'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/fertilizers/tree-species',
      expect.objectContaining({
        params: { query: { category: '松柏類' } },
      })
    );
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerTreeSpeciesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useFertilizationScheduleQuery
// ---------------------------------------------------------------------------

describe('useFertilizationScheduleQuery', () => {
  it('成功でスケジュールが返る', async () => {
    const data = {
      months: [
        { month: 3, action: 'moderate', nitrogenLevel: 'high', phosphorusLevel: null, potassiumLevel: null, recommendedType: '油粕', description: '春の施肥' },
        { month: 9, action: 'light', nitrogenLevel: 'low', phosphorusLevel: null, potassiumLevel: null, recommendedType: null, description: '秋の施肥' },
      ],
    };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizationScheduleQuery('kuromatsu'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.months).toHaveLength(2);
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizationScheduleQuery(''),
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
      () => useFertilizationScheduleQuery('unknown'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizationScheduleQuery('kuromatsu'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// useFertilizerColumnsQuery
// ---------------------------------------------------------------------------

describe('useFertilizerColumnsQuery', () => {
  it('成功でコラム items が返る（category なし）', async () => {
    const page = {
      items: [{ id: 'fc1', slug: 'col-1', title: '肥料コラム1' }],
      nextCursor: null,
    };
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerColumnsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items[0].title).toBe('肥料コラム1');
  });

  it('category 引数ありのときクエリに category が渡される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: { items: [], nextCursor: null },
      error: undefined,
    });
    const { Wrapper } = createWrapper();

    renderHook(() => useFertilizerColumnsQuery('nitrogen'), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/fertilizers/columns',
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({ category: 'nitrogen' }),
          }),
        })
      )
    );
  });

  it('category なしと category ありで別キャッシュキーになる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: { items: [], nextCursor: null },
      error: undefined,
    });
    const queryClient = createTestQueryClient();
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result: r1 } = renderHook(() => useFertilizerColumnsQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(r1.current.isSuccess).toBe(true));

    mockApiClientGet.mockResolvedValue({
      data: { items: [{ id: 'fc2', slug: 'col-2', title: 'コラム2' }], nextCursor: null },
      error: undefined,
    });

    const { result: r2 } = renderHook(
      () => useFertilizerColumnsQuery('nitrogen'),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));

    expect(r1.current.data?.pages[0].items).toHaveLength(0);
    expect(r2.current.data?.pages[0].items).toHaveLength(1);
  });

  it('nextCursor があるとき hasNextPage が true', async () => {
    mockApiClientGet.mockResolvedValue({
      data: { items: [{ id: 'fc1', slug: 'col-1', title: 'コラム1' }], nextCursor: 'cursor-y' },
      error: undefined,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerColumnsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFertilizerColumnsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useFertilizerColumnDetailQuery
// ---------------------------------------------------------------------------

describe('useFertilizerColumnDetailQuery', () => {
  it('成功でコラム詳細が返る', async () => {
    const data = { id: 'fc1', slug: 'col-1', title: '肥料コラム1', body: '本文' };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizerColumnDetailQuery('col-1'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('col-1');
  });

  it('slug をパスに渡す', async () => {
    mockApiClientGet.mockResolvedValue({ data: { id: 'fc1', slug: 'col-1' }, error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useFertilizerColumnDetailQuery('col-1'), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockApiClientGet).toHaveBeenCalledWith(
        '/api/v1/fertilizers/columns/{slug}',
        expect.objectContaining({
          params: expect.objectContaining({ path: { slug: 'col-1' } }),
        })
      )
    );
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useFertilizerColumnDetailQuery(''),
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
      () => useFertilizerColumnDetailQuery('unknown'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
