/**
 * lib/queries/legal のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useLegalListQuery, useLegalDocumentQuery, useTermsVersion } from '@/lib/queries/legal';
import type { LegalSlug } from '@/lib/queries/legal';
import { CURRENT_TERMS_VERSION } from '@/lib/constants/terms';

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

function makeLegalList() {
  return {
    items: [
      { slug: 'tokushoho', title: '特定商取引法に基づく表記', updatedAt: '2025-01-01T00:00:00Z' },
      { slug: 'terms', title: '利用規約', updatedAt: '2025-01-01T00:00:00Z' },
      { slug: 'privacy', title: 'プライバシーポリシー', updatedAt: '2025-01-01T00:00:00Z' },
    ],
  };
}

function makeLegalDocument(slug: string) {
  return {
    slug,
    title: `${slug} の文章`,
    updatedAt: '2025-01-01T00:00:00Z',
    sections: [
      { heading: 'はじめに', body: 'この文書はテスト用です。' },
      { heading: '第1条', body: '詳細はサーバー側で決定されます。' },
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
// useLegalListQuery
// ---------------------------------------------------------------------------

describe('useLegalListQuery', () => {
  it('成功で items（3件）が返る', async () => {
    const data = makeLegalList();
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLegalListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(3);
    expect(result.current.data?.items[0].slug).toBe('tokushoho');
  });

  it('空レスポンス（items: []）で isSuccess かつ空配列', async () => {
    mockApiClientGet.mockResolvedValue({ data: { items: [] }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLegalListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(0);
  });

  it('ネットワークエラーで isError になる', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLegalListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLegalListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// useLegalDocumentQuery
// ---------------------------------------------------------------------------

describe('useLegalDocumentQuery', () => {
  it('terms slug で成功する', async () => {
    const data = makeLegalDocument('terms');
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useLegalDocumentQuery('terms' as LegalSlug),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('terms');
    expect(result.current.data?.sections).toHaveLength(2);
  });

  it('privacy slug で成功する', async () => {
    const data = makeLegalDocument('privacy');
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useLegalDocumentQuery('privacy' as LegalSlug),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('privacy');
  });

  it('tokushoho slug で成功する', async () => {
    const data = makeLegalDocument('tokushoho');
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useLegalDocumentQuery('tokushoho' as LegalSlug),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe('tokushoho');
  });

  it('sections が空配列でも成功する（空状態）', async () => {
    const data = { ...makeLegalDocument('terms'), sections: [] };
    mockApiClientGet.mockResolvedValue({ data, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useLegalDocumentQuery('terms' as LegalSlug),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sections).toHaveLength(0);
  });

  it('404 NOT_FOUND で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useLegalDocumentQuery('terms' as LegalSlug),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });

  it('500 INTERNAL_ERROR で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useLegalDocumentQuery('terms' as LegalSlug),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('data・error が両方 undefined のとき汎用 Error が throw される', async () => {
    mockApiClientGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useLegalDocumentQuery('terms' as LegalSlug),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// useTermsVersion
// ---------------------------------------------------------------------------

describe('useTermsVersion', () => {
  it('呼び出し元をブロックしない: データ未取得の初回レンダーでも即座に CURRENT_TERMS_VERSION を返す', () => {
    // pending のまま解決しない Promise にして「取得前」の状態を固定する
    mockApiClientGet.mockReturnValue(new Promise(() => {}));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTermsVersion(), { wrapper: Wrapper });

    // waitFor を使わず、レンダー直後の同期的な戻り値を検証する
    expect(result.current.version).toBe(CURRENT_TERMS_VERSION);
    expect(result.current.isFromServer).toBe(false);
  });

  it('サーバーから updatedAt を取得できた場合、その値が version に反映され isFromServer は true', async () => {
    mockApiClientGet.mockResolvedValue({
      data: makeLegalDocument('terms'),
      error: undefined,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTermsVersion(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isFromServer).toBe(true));
    expect(result.current.version).toBe('2025-01-01T00:00:00Z');
  });

  it('サーバーの updatedAt が CURRENT_TERMS_VERSION と異なっていてもサーバー値をそのまま採用する', async () => {
    mockApiClientGet.mockResolvedValue({
      data: { ...makeLegalDocument('terms'), updatedAt: '2026-12-31T00:00:00Z' },
      error: undefined,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTermsVersion(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isFromServer).toBe(true));
    expect(result.current.version).toBe('2026-12-31T00:00:00Z');
    expect(result.current.version).not.toBe(CURRENT_TERMS_VERSION);
  });

  it('取得失敗（ネットワークエラー・オフライン相当）のとき CURRENT_TERMS_VERSION にフォールバックし isFromServer は false', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('INTERNAL_ERROR', 500),
    });
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useTermsVersion(), { wrapper: Wrapper });

    await waitFor(() => {
      const query = queryClient.getQueryCache().find({ queryKey: ['legal', 'document', 'terms'] });
      expect(query?.state.status).toBe('error');
    });

    expect(result.current.version).toBe(CURRENT_TERMS_VERSION);
    expect(result.current.isFromServer).toBe(false);
  });

  it('未配備（404 NOT_FOUND）のとき CURRENT_TERMS_VERSION にフォールバックし isFromServer は false', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useTermsVersion(), { wrapper: Wrapper });

    await waitFor(() => {
      const query = queryClient.getQueryCache().find({ queryKey: ['legal', 'document', 'terms'] });
      expect(query?.state.status).toBe('error');
    });

    expect(result.current.version).toBe(CURRENT_TERMS_VERSION);
    expect(result.current.isFromServer).toBe(false);
  });
});
