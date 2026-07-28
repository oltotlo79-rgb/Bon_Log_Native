/**
 * @module lib/queries/legal
 * 法的文章（特定商取引法表記・利用規約・プライバシーポリシー）のクエリフック。
 * 変更頻度が低いため STALE_TIME_MASTER を適用する。ゲスト可。
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_MASTER } from '@/lib/constants/query';
import { CURRENT_TERMS_VERSION } from '@/lib/constants/terms';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type LegalListResponse = components['schemas']['LegalListResponse'];
export type LegalDocumentResponse = components['schemas']['LegalDocumentResponse'];

/** 法的文章の slug は 3 種類のみ（サーバー側でそれ以外は 400 を返す）。 */
export type LegalSlug = 'tokushoho' | 'terms' | 'privacy';

export function useLegalListQuery() {
  return useQuery<LegalListResponse, Error>({
    queryKey: queryKeys.legal.list,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/legal');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching legal list');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
  });
}

export function useLegalDocumentQuery(slug: LegalSlug) {
  return useQuery<LegalDocumentResponse, Error>({
    queryKey: queryKeys.legal.document(slug),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/legal/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching legal document');
      }
      return data;
    },
    staleTime: STALE_TIME_MASTER,
  });
}

export type TermsVersionResult = {
  /** Google 新規登録の termsVersion に送信する値。 */
  version: string;
  /** true ならサーバーの現行値、false なら CURRENT_TERMS_VERSION フォールバック。 */
  isFromServer: boolean;
};

/**
 * Google 新規登録に送る規約バージョンを解決するフック。
 * サーバーの updatedAt（GET /api/v1/legal/terms）を正とし、
 * 未取得（初回ロード中・オフライン・エラー・未配備）時のみ CURRENT_TERMS_VERSION にフォールバックする。
 * 内部の useLegalDocumentQuery はバックグラウンド取得のため、呼び出し元（同意モーダル等）を待たせない。
 */
export function useTermsVersion(): TermsVersionResult {
  const { data } = useLegalDocumentQuery('terms');

  if (data !== undefined) {
    return { version: data.updatedAt, isFromServer: true };
  }

  return { version: CURRENT_TERMS_VERSION, isFromServer: false };
}
