/**
 * @sentry/react-native は setup.ts でモック済み。
 * beforeSend スクラブのテストは scrubSensitiveData をホワイトボックスで検証するため、
 * Sentry.init の呼び出し引数から beforeSend を取り出して直接実行する。
 */

import * as SentryRN from '@sentry/react-native';

// jest.mock のファクトリで参照する変数は外部スコープで宣言が必要
const mockInit = SentryRN.init as jest.Mock;
const mockCaptureException = SentryRN.captureException as jest.Mock;

// ---------------------------------------------------------------------------
// 型ヘルパー
// ---------------------------------------------------------------------------

type EventLike = Record<string, unknown>;
type BeforeSendFn = (event: EventLike, hint: unknown) => EventLike | null;

function extractBeforeSend(): BeforeSendFn {
  const callArg = mockInit.mock.calls[mockInit.mock.calls.length - 1][0] as {
    beforeSend: BeforeSendFn;
  };
  return callArg.beforeSend;
}

// ---------------------------------------------------------------------------
// DSN 設定時の初期化
// ---------------------------------------------------------------------------

describe('DSN 設定時', () => {
  const TEST_DSN = 'https://key@sentry.io/123';
  const originalEnv = process.env.EXPO_PUBLIC_SENTRY_DSN;

  beforeAll(() => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = TEST_DSN;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    } else {
      process.env.EXPO_PUBLIC_SENTRY_DSN = originalEnv;
    }
  });

  beforeEach(() => {
    mockInit.mockClear();
    mockCaptureException.mockClear();
  });

  it('initSentry は Sentry.init を DSN 付きで呼ぶ', () => {
    // sentry.ts はモジュールキャッシュ済みのため、DSN 設定時の状態をここで直接テストするには
    // モジュールを再評価する代わりに、DSN がある状態でインポートして検証する
    // 実装: DSN が設定されているか否かでガードするため、テスト環境では
    // モジュールを直接 require してテストする
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initSentry } = require('@/lib/monitoring/sentry') as {
        initSentry: () => void;
      };
      initSentry();
      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: TEST_DSN })
      );
    });
  });

  it('captureException は Sentry.captureException に例外を渡す', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureException } = require('@/lib/monitoring/sentry') as {
        captureException: (error: unknown) => void;
      };
      const err = new Error('boom');
      captureException(err);
      expect(mockCaptureException).toHaveBeenCalledWith(err);
    });
  });
});

// ---------------------------------------------------------------------------
// DSN 未設定時の no-op
// ---------------------------------------------------------------------------

describe('DSN 未設定時', () => {
  const originalEnv = process.env.EXPO_PUBLIC_SENTRY_DSN;

  beforeAll(() => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.EXPO_PUBLIC_SENTRY_DSN = originalEnv;
    }
  });

  beforeEach(() => {
    mockInit.mockClear();
    mockCaptureException.mockClear();
  });

  it('initSentry は Sentry.init を呼ばない', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initSentry } = require('@/lib/monitoring/sentry') as {
        initSentry: () => void;
      };
      initSentry();
      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  it('captureException は Sentry.captureException を呼ばない', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureException } = require('@/lib/monitoring/sentry') as {
        captureException: (error: unknown) => void;
      };
      captureException(new Error('test'));
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// beforeSend スクラブ動作
// DSN 設定時の init を呼び出し、引数から beforeSend を取り出して直接テストする
// ---------------------------------------------------------------------------

describe('beforeSend スクラブ', () => {
  const TEST_DSN = 'https://key@sentry.io/123';
  const originalEnv = process.env.EXPO_PUBLIC_SENTRY_DSN;

  beforeAll(() => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = TEST_DSN;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    } else {
      process.env.EXPO_PUBLIC_SENTRY_DSN = originalEnv;
    }
  });

  beforeEach(() => {
    mockInit.mockClear();
  });

  it('Authorization ヘッダーを除去する', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initSentry } = require('@/lib/monitoring/sentry') as {
        initSentry: () => void;
      };
      initSentry();

      const beforeSend = extractBeforeSend();
      const event: EventLike = {
        request: {
          headers: {
            Authorization: 'Bearer secret-token',
            'Content-Type': 'application/json',
          },
        },
      };
      const result = beforeSend(event, {}) as { request: { headers: Record<string, string> } };

      expect(result.request.headers).not.toHaveProperty('Authorization');
      expect(result.request.headers).toHaveProperty('Content-Type');
    });
  });

  it('extra のパスワードフィールドを [Filtered] に置換する', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initSentry } = require('@/lib/monitoring/sentry') as {
        initSentry: () => void;
      };
      initSentry();

      const beforeSend = extractBeforeSend();
      const event: EventLike = {
        extra: {
          password: 'super-secret',
          username: 'testuser',
        },
      };
      const result = beforeSend(event, {}) as { extra: Record<string, unknown> };

      expect(result.extra.password).toBe('[Filtered]');
      expect(result.extra.username).toBe('testuser');
    });
  });

  it('extra の token フィールドを [Filtered] に置換する', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initSentry } = require('@/lib/monitoring/sentry') as {
        initSentry: () => void;
      };
      initSentry();

      const beforeSend = extractBeforeSend();
      const event: EventLike = {
        extra: {
          accessToken: 'my-token',
          userId: '123',
        },
      };
      const result = beforeSend(event, {}) as { extra: Record<string, unknown> };

      expect(result.extra.accessToken).toBe('[Filtered]');
      expect(result.extra.userId).toBe('123');
    });
  });

  it('request がない場合もエラーなく動作する', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initSentry } = require('@/lib/monitoring/sentry') as {
        initSentry: () => void;
      };
      initSentry();

      const beforeSend = extractBeforeSend();
      const event: EventLike = { message: 'test error' };
      expect(() => beforeSend(event, {})).not.toThrow();
    });
  });

  it('extra がない場合もエラーなく動作する', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initSentry } = require('@/lib/monitoring/sentry') as {
        initSentry: () => void;
      };
      initSentry();

      const beforeSend = extractBeforeSend();
      const event: EventLike = { request: { url: 'https://example.com' } };
      expect(() => beforeSend(event, {})).not.toThrow();
    });
  });
});
