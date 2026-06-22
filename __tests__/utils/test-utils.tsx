/**
 * @module __tests__/utils/test-utils
 * テスト共通ユーティリティ。
 * TanStack Query Provider を wrap した render を提供する。
 * testing.md 規約: テストごとに新しい QueryClient（retry: false）を生成する。
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

/** テスト用 QueryClient。retry を無効化して即座に失敗を確認できるようにする。 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

type RenderWithProvidersOptions = {
  queryClient?: QueryClient;
};

export function renderWithProviders(
  ui: ReactElement,
  { queryClient }: RenderWithProvidersOptions = {}
) {
  const client = queryClient ?? createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    // QueryClientProvider のアンマウント時にキャッシュとタイマーを全解除する。
    // refetchInterval 等のポーリングタイマーを残留させないために useEffect の cleanup で実行する。
    React.useEffect(() => {
      return () => {
        client.getQueryCache().clear();
        client.getMutationCache().clear();
        client.clear();
      };
    }, []);

    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
