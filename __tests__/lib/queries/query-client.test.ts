/**
 * createQueryClient の設定値と retry 判定ロジックのユニットテスト。
 */

import { createQueryClient } from '@/lib/queries/query-client';
import {
  STALE_TIME_STANDARD,
  GC_TIME,
  RETRY_COUNT,
} from '@/lib/constants/query';
import { ApiError } from '@/lib/api/errors';

describe('createQueryClient', () => {
  it('QueryClient インスタンスを返す', () => {
    const client = createQueryClient();
    expect(client).toBeDefined();
    expect(typeof client.getQueryCache).toBe('function');
  });

  describe('defaultOptions.queries', () => {
    it('staleTime が STALE_TIME_STANDARD に設定されている', () => {
      const client = createQueryClient();
      const opts = client.getDefaultOptions().queries;
      expect(opts?.staleTime).toBe(STALE_TIME_STANDARD);
    });

    it('gcTime が GC_TIME に設定されている', () => {
      const client = createQueryClient();
      const opts = client.getDefaultOptions().queries;
      expect(opts?.gcTime).toBe(GC_TIME);
    });

    it('retry が関数として設定されている', () => {
      const client = createQueryClient();
      const opts = client.getDefaultOptions().queries;
      expect(typeof opts?.retry).toBe('function');
    });

    it('retryDelay が関数として設定されている', () => {
      const client = createQueryClient();
      const opts = client.getDefaultOptions().queries;
      expect(typeof opts?.retryDelay).toBe('function');
    });
  });

  describe('defaultOptions.mutations', () => {
    it('ミューテーションの retry が false に設定されている', () => {
      const client = createQueryClient();
      const opts = client.getDefaultOptions().mutations;
      expect(opts?.retry).toBe(false);
    });
  });

  describe('retry 判定ロジック', () => {
    let retryFn: (failureCount: number, error: Error) => boolean;

    beforeEach(() => {
      const client = createQueryClient();
      const retry = client.getDefaultOptions().queries?.retry;
      if (typeof retry !== 'function') throw new Error('retry is not a function');
      retryFn = retry;
    });

    it('RETRY_COUNT 未満の失敗 + ネットワークエラーはリトライする', () => {
      const networkError = new Error('Network request failed');
      expect(retryFn(0, networkError)).toBe(true);
      expect(retryFn(1, networkError)).toBe(true);
    });

    it('RETRY_COUNT 以上の失敗はリトライしない', () => {
      const networkError = new Error('Network request failed');
      expect(retryFn(RETRY_COUNT, networkError)).toBe(false);
      expect(retryFn(RETRY_COUNT + 1, networkError)).toBe(false);
    });

    it('ApiError 4xx はリトライしない（400）', () => {
      const badRequest = new ApiError({ code: 'VALIDATION_ERROR', status: 400, message: 'Bad Request' });
      expect(retryFn(0, badRequest)).toBe(false);
    });

    it('ApiError 4xx はリトライしない（401）', () => {
      const unauthorized = new ApiError({ code: 'AUTH_TOKEN_EXPIRED', status: 401, message: 'Unauthorized' });
      expect(retryFn(0, unauthorized)).toBe(false);
    });

    it('ApiError 4xx はリトライしない（403）', () => {
      const forbidden = new ApiError({ code: 'ACCOUNT_SUSPENDED', status: 403, message: 'Forbidden' });
      expect(retryFn(0, forbidden)).toBe(false);
    });

    it('ApiError 4xx はリトライしない（404）', () => {
      const notFound = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'Not Found' });
      expect(retryFn(0, notFound)).toBe(false);
    });

    it('ApiError 4xx はリトライしない（429）', () => {
      const rateLimit = new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'Too Many Requests', retryAfter: 30 });
      expect(retryFn(0, rateLimit)).toBe(false);
    });

    it('ApiError 5xx は RETRY_COUNT 未満であればリトライする', () => {
      const serverError = new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'Internal Server Error' });
      expect(retryFn(0, serverError)).toBe(true);
      expect(retryFn(1, serverError)).toBe(true);
    });

    it('ApiError 5xx は RETRY_COUNT 以上でリトライしない', () => {
      const serverError = new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'Internal Server Error' });
      expect(retryFn(RETRY_COUNT, serverError)).toBe(false);
    });

    it('ApiError でない Error はリトライする（ネットワークエラー等）', () => {
      const error = new Error('Network request failed');
      expect(retryFn(0, error)).toBe(true);
    });

    it('ApiError でない Error でも RETRY_COUNT 未満であればリトライする', () => {
      expect(retryFn(0, new Error('plain error'))).toBe(true);
    });
  });

  describe('retryDelay 指数バックオフ', () => {
    let retryDelayFn: (attempt: number, error: Error) => number;

    beforeEach(() => {
      const client = createQueryClient();
      const retryDelay = client.getDefaultOptions().queries?.retryDelay;
      if (typeof retryDelay !== 'function') throw new Error('retryDelay is not a function');
      retryDelayFn = retryDelay;
    });

    it('attempt 1 は 1000ms', () => {
      expect(retryDelayFn(1, new Error())).toBe(1000);
    });

    it('attempt 2 は 2000ms', () => {
      expect(retryDelayFn(2, new Error())).toBe(2000);
    });

    it('attempt 3 は 4000ms', () => {
      expect(retryDelayFn(3, new Error())).toBe(4000);
    });
  });

  it('createQueryClient を複数回呼ぶと独立したインスタンスを返す', () => {
    const client1 = createQueryClient();
    const client2 = createQueryClient();
    expect(client1).not.toBe(client2);
  });
});
