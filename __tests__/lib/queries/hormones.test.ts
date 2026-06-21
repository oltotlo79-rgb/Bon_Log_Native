/**
 * lib/queries/hormones のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useHormonesQuery, useHormoneDetailQuery } from '@/lib/queries/hormones';

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

function makeHormoneList() {
  return [
    { id: 'h1', slug: 'auxin', name: 'オーキシン', nameEn: 'Auxin', category: '成長促進', chemicalFormula: null, description: null },
    { id: 'h2', slug: 'gibberellin', name: 'ジベレリン', nameEn: 'Gibberellin', category: '成長促進', chemicalFormula: null, description: null },
    { id: 'h3', slug: 'cytokinin', name: 'サイトカイニン', nameEn: 'Cytokinin', category: '分裂促進', chemicalFormula: null, description: null },
  ];
}

function makeHormoneDetail(slug: string) {
  return {
    id: 'h1',
    slug,
    name: `${slug}ホルモン`,
    nameEn: slug,
    category: '成長促進',
    description: 'ホルモンの説明文',
    function: '機能の説明',
    applicationNotes: '適用方法',
    seasonalLevels: [
      { month: 3, level: 'high' },
      { month: 6, level: 'moderate' },
      { month: 9, level: 'low' },
      { month: 12, level: 'minimal' },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useHormonesQuery
// ---------------------------------------------------------------------------

describe('useHormonesQuery', () => {
  it('成功でホルモン一覧が返る', async () => {
    const data = makeHormoneList();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useHormonesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0].name).toBe('オーキシン');
  });

  it('category フィルタで API を呼び出す', async () => {
    mockApiClientGet.mockResolvedValue({ data: [], error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useHormonesQuery('成長促進'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/hormones',
      expect.objectContaining({
        params: { query: { category: '成長促進' } },
      })
    );
  });

  it('空レスポンス（[]）で空状態になる', async () => {
    mockApiClientGet.mockResolvedValue({ data: [], error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useHormonesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('エラー時に isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useHormonesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useHormonesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('category なしで undefined が API に渡らない', async () => {
    mockApiClientGet.mockResolvedValue({ data: { items: [] }, error: undefined });
    const { Wrapper } = createWrapper();

    renderHook(() => useHormonesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(mockApiClientGet).toHaveBeenCalled());
    const callArgs = mockApiClientGet.mock.calls[0][1];
    expect(callArgs.params.query.category).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// useHormoneDetailQuery
// ---------------------------------------------------------------------------

describe('useHormoneDetailQuery', () => {
  it('成功でホルモン詳細が返る', async () => {
    const data = makeHormoneDetail('auxin');
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useHormoneDetailQuery('auxin'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('auxin');
    expect(result.current.data?.seasonalLevels).toHaveLength(4);
  });

  it('seasonalLevels が空配列でも成功する', async () => {
    const data = { ...makeHormoneDetail('auxin'), seasonalLevels: [] };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useHormoneDetailQuery('auxin'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.seasonalLevels).toHaveLength(0);
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useHormoneDetailQuery(''),
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
      () => useHormoneDetailQuery('unknown'),
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
      () => useHormoneDetailQuery('auxin'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
