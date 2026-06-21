/**
 * lib/queries/dictionary のユニットテスト。
 * 無限スクロール（useInfiniteQuery）の fetchNextPage も検証する。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useDictionaryListQuery, useDictionaryDetailQuery } from '@/lib/queries/dictionary';

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

function makeDictionaryPage(
  items: { id: string; slug: string; term: string }[],
  nextCursor: string | null
) {
  return {
    items: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      term: item.term,
      reading: `${item.term}のよみ`,
      category: '樹木管理',
      shortDefinition: '短い説明',
    })),
    nextCursor,
  };
}

function makeDictionaryDetail(slug: string) {
  return {
    term: {
      id: 'dict-1',
      slug,
      term: `${slug}の用語`,
      reading: 'よみがな',
      category: '樹木管理',
      description: '詳細な定義テキスト',
    },
    prev: null,
    next: { id: 'dict-2', slug: 'next-term', term: '次の用語', reading: 'よみがな', category: '樹木管理' },
    related: [
      { id: 'rel-1', slug: 'related-1', term: '関連用語1', reading: 'よみがな', category: '樹木管理' },
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
// useDictionaryListQuery
// ---------------------------------------------------------------------------

describe('useDictionaryListQuery', () => {
  it('成功で items が返る', async () => {
    const page = makeDictionaryPage(
      [{ id: 'd1', slug: 'kokumotsu', term: '黒松' }],
      null
    );
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDictionaryListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
    expect(result.current.data?.pages[0].items[0].term).toBe('黒松');
  });

  it('空レスポンス（items: []、nextCursor: null）で hasNextPage が false', async () => {
    const page = makeDictionaryPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDictionaryListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.data?.pages[0].items).toHaveLength(0);
  });

  it('nextCursor が string の場合は hasNextPage が true', async () => {
    const page = makeDictionaryPage(
      [{ id: 'd1', slug: 'kokumotsu', term: '黒松' }],
      'cursor-abc'
    );
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDictionaryListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('fetchNextPage で次ページが読み込まれる', async () => {
    const page1 = makeDictionaryPage(
      [{ id: 'd1', slug: 'kokumotsu', term: '黒松' }],
      'cursor-abc'
    );
    const page2 = makeDictionaryPage(
      [{ id: 'd2', slug: 'goyoumatsu', term: '五葉松' }],
      null
    );
    mockApiClientGet
      .mockResolvedValueOnce({ data: page1, error: undefined })
      .mockResolvedValueOnce({ data: page2, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDictionaryListQuery(), { wrapper: Wrapper });

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
    expect(result.current.data?.pages[1].items[0].term).toBe('五葉松');
  });

  it('search パラメータを渡すと API に反映される', async () => {
    const page = makeDictionaryPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useDictionaryListQuery({ search: '松' }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/dictionary',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ search: '松' }),
        }),
      })
    );
  });

  it('category パラメータを渡すと API に反映される', async () => {
    const page = makeDictionaryPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useDictionaryListQuery({ category: '樹木管理' }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith(
      '/api/v1/dictionary',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ category: '樹木管理' }),
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

    const { result } = renderHook(() => useDictionaryListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDictionaryListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// useDictionaryDetailQuery
// ---------------------------------------------------------------------------

describe('useDictionaryDetailQuery', () => {
  it('成功で用語詳細が返る', async () => {
    const data = makeDictionaryDetail('kokumotsu');
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useDictionaryDetailQuery('kokumotsu'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.term.slug).toBe('kokumotsu');
    expect(result.current.data?.term.term).toBe('kokumotsuの用語');
  });

  it('関連用語が配列で返る', async () => {
    const data = makeDictionaryDetail('kokumotsu');
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useDictionaryDetailQuery('kokumotsu'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.related).toHaveLength(1);
  });

  it('slug が空文字のとき enabled=false でクエリが実行されない', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useDictionaryDetailQuery(''),
      { wrapper: Wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.isLoading).toBe(false);
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
      () => useDictionaryDetailQuery('unknown-slug'),
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
      () => useDictionaryDetailQuery('some-slug'),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
