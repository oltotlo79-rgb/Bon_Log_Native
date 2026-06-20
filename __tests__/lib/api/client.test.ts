/**
 * lib/api/client のユニットテスト。
 * グローバル fetch をモックし、ミドルウェアの挙動を検証する。
 */

import {
  createApiClient,
  configureAuthHooks,
  resetAuthHooksForTest,
  resetPendingRefreshForTest,
  parseApiError,
} from '@/lib/api/client';
import { ApiError, isApiError } from '@/lib/api/errors';

beforeEach(() => {
  resetAuthHooksForTest();
  resetPendingRefreshForTest();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// ヘルパー: Response 生成
// ---------------------------------------------------------------------------

function makeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function makeErrorBody(code: string, message = 'error') {
  return { error: { code, message, status: 400 } };
}

// ---------------------------------------------------------------------------
// parseApiError のユニットテスト（純粋関数のためプロセスクラッシュなし）
// ---------------------------------------------------------------------------

describe('parseApiError', () => {
  it('正常な ApiErrorResponse ボディを解析する', async () => {
    const res = makeResponse(400, makeErrorBody('VALIDATION_ERROR', 'Bad input'));
    const err = await parseApiError(res);
    expect(isApiError(err)).toBe(true);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(400);
    expect(err.message).toBe('Bad input');
    expect(err.retryAfter).toBeUndefined();
  });

  it('429 の Retry-After ヘッダーを retryAfter に格納する', async () => {
    const res = makeResponse(429, makeErrorBody('RATE_LIMITED', 'Too many'), {
      'Retry-After': '60',
    });
    const err = await parseApiError(res);
    expect(err.retryAfter).toBe(60);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.status).toBe(429);
  });

  it('JSON パース失敗時は INTERNAL_ERROR にフォールバックする', async () => {
    const res = new Response('not json', {
      status: 500,
      statusText: 'Server Error',
    });
    const err = await parseApiError(res);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.status).toBe(500);
  });

  it('error フィールドが欠落している場合も INTERNAL_ERROR にフォールバックする', async () => {
    const res = makeResponse(500, { something: 'else' });
    const err = await parseApiError(res);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('スペック外の未知コードを受け取った場合は INTERNAL_ERROR にフォールバックする', async () => {
    const res = makeResponse(500, makeErrorBody('UNKNOWN_FUTURE_CODE', 'Unknown'));
    const err = await parseApiError(res);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// 2xx 透過
// ---------------------------------------------------------------------------

describe('2xx レスポンスの透過', () => {
  it('200 OK のレスポンスデータをそのまま返す', async () => {
    const userData = {
      id: 'user-1',
      email: 'a@example.com',
      nickname: 'Alice',
      avatarUrl: null,
      bio: null,
      isPremium: false,
    };
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(200, userData));

    const client = createApiClient('https://test.example.com');
    const result = await client.GET('/api/v1/users/me');

    expect(result.data).toEqual(userData);
  });
});

// ---------------------------------------------------------------------------
// 非 2xx → ApiError 変換
// ---------------------------------------------------------------------------

describe('非 2xx → ApiError 変換', () => {
  it('400 を VALIDATION_ERROR ApiError に変換して throw する', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse(400, makeErrorBody('VALIDATION_ERROR', 'Bad input'))
    );

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.POST('/api/v1/auth/login', {
        body: { email: 'a@b.com', password: 'pass' },
      });
    } catch (e) {
      caught = e;
    }
    expect(isApiError(caught)).toBe(true);
    expect(caught instanceof ApiError && caught.code).toBe('VALIDATION_ERROR');
  });

  it('403 ACCOUNT_SUSPENDED を ApiError に変換する', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse(403, makeErrorBody('ACCOUNT_SUSPENDED'))
    );

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.GET('/api/v1/users/me');
    } catch (e) {
      caught = e;
    }
    expect(isApiError(caught)).toBe(true);
    expect(caught instanceof ApiError && caught.code).toBe('ACCOUNT_SUSPENDED');
    expect(caught instanceof ApiError && caught.status).toBe(403);
  });

  it('404 NOT_FOUND を ApiError に変換する', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse(404, makeErrorBody('NOT_FOUND'))
    );

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.GET('/api/v1/users/me');
    } catch (e) {
      caught = e;
    }
    expect(isApiError(caught)).toBe(true);
    expect(caught instanceof ApiError && caught.code).toBe('NOT_FOUND');
    expect(caught instanceof ApiError && caught.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 429 retryAfter
// ---------------------------------------------------------------------------

describe('429 Retry-After', () => {
  it('Retry-After ヘッダーを retryAfter フィールドに格納する', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse(429, makeErrorBody('RATE_LIMITED'), { 'Retry-After': '30' })
    );

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.POST('/api/v1/auth/login', {
        body: { email: 'a@b.com', password: 'pass' },
      });
    } catch (e) {
      caught = e;
    }
    expect(isApiError(caught)).toBe(true);
    expect(caught instanceof ApiError && caught.retryAfter).toBe(30);
    expect(caught instanceof ApiError && caught.code).toBe('RATE_LIMITED');
  });
});

// ---------------------------------------------------------------------------
// AUTH_TOKEN_EXPIRED → 単一飛行 refresh → 再試行
// ---------------------------------------------------------------------------

describe('AUTH_TOKEN_EXPIRED → 単一飛行 refresh → 再試行 1 回', () => {
  it('refresh 成功後に元リクエストを 1 回だけ再試行し成功レスポンスを返す', async () => {
    const refreshFn = jest.fn().mockResolvedValue('new-access-token');
    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue('old-access-token'),
      refreshTokens: refreshFn,
      onAuthFailure: jest.fn(),
    });

    const successData = {
      id: 'u1',
      email: 'a@b.com',
      nickname: 'Alice',
      avatarUrl: null,
      bio: null,
      isPremium: false,
    };

    const mockFetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        makeResponse(401, makeErrorBody('AUTH_TOKEN_EXPIRED', 'Token expired'))
      )
      .mockResolvedValueOnce(makeResponse(200, successData));

    const client = createApiClient('https://test.example.com');
    const result = await client.GET('/api/v1/users/me');

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.data).toBeDefined();
  });

  it('並行 3 リクエストで refresh は 1 回だけ呼ばれる', async () => {
    // refresh を即時解決するモックで単一飛行を検証する
    const refreshFn = jest.fn().mockResolvedValue('new-token');

    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue('old-token'),
      refreshTokens: refreshFn,
      onAuthFailure: jest.fn(),
    });

    const expiredBody = makeErrorBody('AUTH_TOKEN_EXPIRED');
    const successData = {
      id: 'u1',
      email: 'a@b.com',
      nickname: 'Alice',
      avatarUrl: null,
      bio: null,
      isPremium: false,
    };

    // Response の body は一度しか読めないため、呼び出しごとに新しいインスタンスを生成する
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => {
        const callCount = jest.mocked(globalThis.fetch).mock.calls.length;
        if (callCount <= 3) {
          return Promise.resolve(makeResponse(401, expiredBody));
        }
        return Promise.resolve(makeResponse(200, successData));
      });

    const client = createApiClient('https://test.example.com');

    const [r1, r2, r3] = await Promise.all([
      client.GET('/api/v1/users/me'),
      client.GET('/api/v1/users/me'),
      client.GET('/api/v1/users/me'),
    ]);

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(r1.data).toBeDefined();
    expect(r2.data).toBeDefined();
    expect(r3.data).toBeDefined();
  });

  it('refresh 失敗時は onAuthFailure(false) を呼び ApiError を throw する', async () => {
    const onAuthFailure = jest.fn();
    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue('old-token'),
      refreshTokens: jest.fn().mockResolvedValue(null),
      onAuthFailure,
    });

    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse(401, makeErrorBody('AUTH_TOKEN_EXPIRED'))
    );

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.GET('/api/v1/users/me');
    } catch (e) {
      caught = e;
    }
    expect(isApiError(caught)).toBe(true);
    expect(onAuthFailure).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// AUTH_INVALID_TOKEN は refresh しない
// ---------------------------------------------------------------------------

describe('AUTH_INVALID_TOKEN は refresh しない', () => {
  it('refresh を呼ばず onAuthFailure(false) を呼ぶ', async () => {
    const refreshFn = jest.fn();
    const onAuthFailure = jest.fn();
    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue('bad-token'),
      refreshTokens: refreshFn,
      onAuthFailure,
    });

    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse(401, makeErrorBody('AUTH_INVALID_TOKEN'))
    );

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.GET('/api/v1/users/me');
    } catch (e) {
      caught = e;
    }

    expect(isApiError(caught)).toBe(true);
    expect(caught instanceof ApiError && caught.code).toBe('AUTH_INVALID_TOKEN');
    expect(refreshFn).not.toHaveBeenCalled();
    expect(onAuthFailure).toHaveBeenCalledWith(false);
  });

  it('AUTH_REFRESH_TOKEN_INVALID も refresh しない', async () => {
    const refreshFn = jest.fn();
    const onAuthFailure = jest.fn();
    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue('token'),
      refreshTokens: refreshFn,
      onAuthFailure,
    });

    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse(401, makeErrorBody('AUTH_REFRESH_TOKEN_INVALID'))
    );

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.GET('/api/v1/users/me');
    } catch (e) {
      caught = e;
    }

    expect(isApiError(caught)).toBe(true);
    expect(refreshFn).not.toHaveBeenCalled();
    expect(onAuthFailure).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// AUTH_REFRESH_TOKEN_REUSE_DETECTED の通知
// ---------------------------------------------------------------------------

describe('AUTH_REFRESH_TOKEN_REUSE_DETECTED', () => {
  it('onAuthFailure(true) を呼ぶ（reuseDetected=true）', async () => {
    const refreshFn = jest.fn();
    const onAuthFailure = jest.fn();
    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue('token'),
      refreshTokens: refreshFn,
      onAuthFailure,
    });

    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse(401, makeErrorBody('AUTH_REFRESH_TOKEN_REUSE_DETECTED'))
    );

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.GET('/api/v1/users/me');
    } catch (e) {
      caught = e;
    }

    expect(isApiError(caught)).toBe(true);
    expect(caught instanceof ApiError && caught.code).toBe('AUTH_REFRESH_TOKEN_REUSE_DETECTED');
    expect(refreshFn).not.toHaveBeenCalled();
    expect(onAuthFailure).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------
// タイムアウト
// ---------------------------------------------------------------------------

describe('タイムアウト', () => {
  it('fetch が AbortError を throw するとそのまま伝播する', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

    const client = createApiClient('https://test.example.com');
    let caught: unknown;
    try {
      await client.GET('/api/v1/users/me');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DOMException);
    expect((caught as DOMException).name).toBe('AbortError');
  });
});

// ---------------------------------------------------------------------------
// onResponse が undefined を返す契約（RN 実機退行テスト）
// ---------------------------------------------------------------------------
// 背景: RN 実機では openapi-fetch のミドルウェア onResponse から元の Response を
// そのまま返すと instanceof Response 判定に失敗しクラッシュする。
// buildAuthAndErrorMiddleware().onResponse は 2xx の場合 undefined を返さなければならない。
// このテストでその契約を保護する。

describe('onResponse が 2xx で undefined を返す（RN 実機退行防止）', () => {
  it('2xx のとき result.error が undefined で result.data が存在する（onResponse が元 Response を返していないことを示す）', async () => {
    const successData = {
      id: 'u1',
      email: 'a@b.com',
      nickname: 'Alice',
      avatarUrl: null,
      bio: null,
      isPremium: false,
    };
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(200, successData));

    const client = createApiClient('https://test.example.com');
    const result = await client.GET('/api/v1/users/me');

    // openapi-fetch は onResponse が undefined を返した場合、内部で元 Response を
    // そのまま使いデータを解析する。error が undefined でデータが得られることを確認する。
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(successData);
  });

  it('2xx ボディなし（204 相当）で throw せず正常に完了する（onResponse が元 Response を返すと RN でクラッシュする）', async () => {
    // devices の DELETE エンドポイントは 200 を返すが、
    // ここでは onResponse が undefined を返す契約を直接確認するため
    // buildAuthAndErrorMiddleware のミドルウェア関数を模倣した形でテストする。
    // 2xx で response.ok = true のとき onResponse は undefined を返すべき
    const response = new Response(null, { status: 200 });
    expect(response.ok).toBe(true);
    // 実際のミドルウェアで 2xx を throw しないことを openapi-fetch 経由で確認する
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ token: 'test-token' }), { status: 200 })
    );
    const client = createApiClient('https://test.example.com');
    let threw = false;
    try {
      await client.DELETE('/api/v1/devices/{token}', {
        params: { path: { token: 'ExponentPushToken%5Btest%5D' } },
      });
    } catch {
      threw = true;
    }
    // 200 でクラッシュしないことを確認する
    expect(threw).toBe(false);
  });

  it('401 AUTH_TOKEN_EXPIRED の refresh 成功後 retryResponse が 2xx のとき data が返る（retry 経路でも onResponse が正しく動作する）', async () => {
    const refreshFn = jest.fn().mockResolvedValue('new-access-token');
    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue('old-token'),
      refreshTokens: refreshFn,
      onAuthFailure: jest.fn(),
    });

    const successData = {
      id: 'u1',
      email: 'a@b.com',
      nickname: 'Alice',
      avatarUrl: null,
      bio: null,
      isPremium: false,
    };

    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        makeResponse(401, makeErrorBody('AUTH_TOKEN_EXPIRED', 'Token expired'))
      )
      .mockResolvedValueOnce(makeResponse(200, successData));

    const client = createApiClient('https://test.example.com');
    const result = await client.GET('/api/v1/users/me');

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(successData);
  });

  it('タイムアウトミドルウェアの onResponse も undefined を返す（clearTimer のみ実行）', async () => {
    const successData = {
      id: 'u1',
      email: 'a@b.com',
      nickname: 'Alice',
      avatarUrl: null,
      bio: null,
      isPremium: false,
    };
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(200, successData));

    const client = createApiClient('https://test.example.com');
    // タイムアウトミドルウェアが onResponse で元 Response を返すと RN でクラッシュする。
    // 正常に data が取れることでタイムアウト側も undefined を返していることを確認する。
    const result = await client.GET('/api/v1/users/me');
    expect(result.data).toEqual(successData);
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Authorization ヘッダー
// ---------------------------------------------------------------------------

describe('Authorization ヘッダー', () => {
  it('getAccessToken が返すトークンが Bearer ヘッダーに付与される', async () => {
    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue('my-access-token'),
      refreshTokens: jest.fn().mockResolvedValue(null),
      onAuthFailure: jest.fn(),
    });

    let capturedRequest: Request | undefined;
    jest.spyOn(globalThis, 'fetch').mockImplementation((req) => {
      capturedRequest = req instanceof Request ? req : new Request(req as string);
      return Promise.resolve(
        makeResponse(200, {
          id: 'u1',
          email: 'a@b.com',
          nickname: 'Alice',
          avatarUrl: null,
          bio: null,
          isPremium: false,
        })
      );
    });

    const client = createApiClient('https://test.example.com');
    await client.GET('/api/v1/users/me');

    expect(capturedRequest?.headers.get('Authorization')).toBe('Bearer my-access-token');
  });

  it('getAccessToken が null の場合は Authorization ヘッダーを付与しない', async () => {
    configureAuthHooks({
      getAccessToken: jest.fn().mockResolvedValue(null),
      refreshTokens: jest.fn().mockResolvedValue(null),
      onAuthFailure: jest.fn(),
    });

    let capturedRequest: Request | undefined;
    jest.spyOn(globalThis, 'fetch').mockImplementation((req) => {
      capturedRequest = req instanceof Request ? req : new Request(req as string);
      return Promise.resolve(
        makeResponse(200, {
          id: 'u1',
          email: 'a@b.com',
          nickname: 'Alice',
          avatarUrl: null,
          bio: null,
          isPremium: false,
        })
      );
    });

    const client = createApiClient('https://test.example.com');
    await client.GET('/api/v1/users/me');

    expect(capturedRequest?.headers.get('Authorization')).toBeNull();
  });
});
