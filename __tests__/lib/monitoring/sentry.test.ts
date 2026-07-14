import type { ErrorEvent } from '@sentry/core';
import * as SentryRN from '@sentry/react-native';
import { captureException, initSentry } from '@/lib/monitoring/sentry';

const TEST_DSN = 'https://key@sentry.io/123';
const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

type SentryInit = typeof SentryRN.init;
type InitMock = jest.MockedFunction<SentryInit>;
type InitOptions = Parameters<SentryInit>[0];
type BeforeSend = NonNullable<InitOptions['beforeSend']>;

function restoreDsn(): void {
  if (originalDsn === undefined) {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  } else {
    process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
  }
}

function setDsn(dsn: string | undefined): void {
  if (dsn === undefined) {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  } else {
    process.env.EXPO_PUBLIC_SENTRY_DSN = dsn;
  }
}

const mockInit = jest.mocked(SentryRN.init);
const mockCaptureException = jest.mocked(SentryRN.captureException);

function getInitOptions(mockInit: InitMock): InitOptions {
  const call = mockInit.mock.calls.at(-1);
  if (call === undefined) {
    throw new Error('Sentry.init was not called');
  }
  return call[0];
}

function getBeforeSend(mockInit: InitMock): BeforeSend {
  const beforeSend = getInitOptions(mockInit).beforeSend;
  if (beforeSend === undefined) {
    throw new Error('beforeSend was not configured');
  }
  return beforeSend;
}

async function runBeforeSend(mockInit: InitMock, event: ErrorEvent): Promise<ErrorEvent> {
  const result = await getBeforeSend(mockInit)(event, {});
  if (result === null) {
    throw new Error('beforeSend unexpectedly discarded the event');
  }
  return result;
}

function createEvent(fields: Omit<ErrorEvent, 'type'> = {}): ErrorEvent {
  return { ...fields, type: undefined };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error('Expected a record');
  }
  return value;
}

function getRequest(event: ErrorEvent): NonNullable<ErrorEvent['request']> {
  if (event.request === undefined) {
    throw new Error('Expected request data');
  }
  return event.request;
}

beforeEach(() => {
  mockInit.mockClear();
  mockCaptureException.mockClear();
});

afterEach(() => {
  restoreDsn();
});

describe('Sentry 初期化', () => {
  it('DSN と PII 無効化設定を渡す', () => {
    setDsn(TEST_DSN);
    initSentry();

    const options = getInitOptions(mockInit);
    expect(options.dsn).toBe(TEST_DSN);
    expect(options.sendDefaultPii).toBe(false);
    expect(typeof options.beforeSend).toBe('function');
  });

  it('DSN 未設定時は初期化も例外送信も行わない', () => {
    setDsn(undefined);
    initSentry();
    captureException(new Error('test'));

    expect(mockInit).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('DSN 設定時は例外を Sentry に渡す', () => {
    setDsn(TEST_DSN);
    const error = new Error('boom');

    captureException(error);

    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });
});

describe('beforeSend スクラブ', () => {
  it('ヘッダー、body、query、URL から機密情報を除去する', async () => {
    setDsn(TEST_DSN);
    initSentry();
    const event = createEvent({
      request: {
        url: 'https://example.com/posts?token=abc&q=bonsai&sort=recent&email=user%40example.com#top',
        headers: {
          Authorization: 'Bearer secret-token',
          Cookie: 'session=secret',
          'X-Api-Key': 'api-secret',
          'Content-Type': 'application/json',
          'X-Trace': 'trace-1',
        },
        cookies: { session: 'cookie-secret' },
        query_string: {
          access_token: 'query-secret',
          email: 'user@example.com',
          search: 'private search words',
          page: '2',
        },
        data: {
          profile: {
            email: 'user@example.com',
            displayName: 'Bonsai Fan',
            bio: 'private profile text',
            contentType: 'profile',
          },
          items: [{ clientSecret: 'body-secret', count: 2 }],
        },
      },
    });

    const result = await runBeforeSend(mockInit, event);
    const request = getRequest(result);
    const query = getRecord(request.query_string);
    const body = getRecord(request.data);
    const profile = getRecord(body.profile);
    const items = body.items;
    if (!Array.isArray(items)) {
      throw new Error('Expected body items');
    }
    const firstItem = getRecord(items[0]);

    expect(request.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Trace': 'trace-1',
    });
    expect(request.cookies).toBeUndefined();
    expect(query.access_token).toBe('[Filtered]');
    expect(query.email).toBe('[Filtered]');
    expect(query.search).toBe('[Filtered]');
    expect(query.page).toBe('2');
    expect(request.url).toBe(
      'https://example.com/posts?token=%5BFiltered%5D&q=%5BFiltered%5D&sort=recent&email=%5BFiltered%5D#top',
    );
    expect(profile.email).toBe('[Filtered]');
    expect(profile.displayName).toBe('[Filtered]');
    expect(profile.bio).toBe('[Filtered]');
    expect(profile.contentType).toBe('profile');
    expect(firstItem.clientSecret).toBe('[Filtered]');
    expect(firstItem.count).toBe(2);
  });

  it('breadcrumb 内の URL と URL fragment も再帰的にスクラブする', async () => {
    setDsn(TEST_DSN);
    initSentry();

    const result = await runBeforeSend(
      mockInit,
      createEvent({
        request: {
          url: 'https://user%40example.com/private',
        },
        breadcrumbs: [
          {
            category: 'fetch',
            data: {
              url: 'https://example.com/search?q=private&sort=recent#access_token=secret',
              method: 'GET',
              navigation: {
                redirectUri: 'https://example.com/callback?signature=signed-value&ok=1',
              },
            },
          },
        ],
      }),
    );

    expect(getRequest(result).url).toBe('[Filtered]');

    const breadcrumb = result.breadcrumbs?.[0];
    if (breadcrumb === undefined) {
      throw new Error('Expected breadcrumb');
    }
    const data = getRecord(breadcrumb.data);
    const navigation = getRecord(data.navigation);

    expect(data.url).toBe(
      'https://example.com/search?q=%5BFiltered%5D&sort=recent#access_token=%5BFiltered%5D',
    );
    expect(data.method).toBe('GET');
    expect(navigation.redirectUri).toBe(
      'https://example.com/callback?signature=%5BFiltered%5D&ok=1',
    );
  });

  it('利用者入力キーを URL query と breadcrumb data の両方で除去する', async () => {
    setDsn(TEST_DSN);
    initSentry();
    const userInputKeys = [
      'content',
      'body',
      'message',
      'text',
      'bio',
      'nickname',
      'displayName',
      'q',
      'search',
    ];
    const query = new URLSearchParams();
    const breadcrumbData: Record<string, unknown> = {};
    for (const key of userInputKeys) {
      query.set(key, 'private user input');
      breadcrumbData[key] = 'private user input';
    }
    query.set('sort', 'recent');
    breadcrumbData.contentType = 'post';
    breadcrumbData.searchEnabled = true;

    const result = await runBeforeSend(
      mockInit,
      createEvent({
        request: {
          url: `https://example.com/search?${query.toString()}`,
          data: breadcrumbData,
        },
        breadcrumbs: [{ data: breadcrumbData }],
      }),
    );
    const request = getRequest(result);
    const sanitizedUrl = request.url;
    if (sanitizedUrl === undefined) {
      throw new Error('Expected request URL');
    }
    const sanitizedQuery = new URL(sanitizedUrl).searchParams;
    const sanitizedBreadcrumb = result.breadcrumbs?.[0];
    if (sanitizedBreadcrumb === undefined) {
      throw new Error('Expected breadcrumb');
    }
    const sanitizedData = getRecord(sanitizedBreadcrumb.data);
    const sanitizedBody = getRecord(request.data);

    for (const key of userInputKeys) {
      expect(sanitizedQuery.get(key)).toBe('[Filtered]');
      expect(sanitizedData[key]).toBe('[Filtered]');
      expect(sanitizedBody[key]).toBe('[Filtered]');
    }
    expect(sanitizedQuery.get('sort')).toBe('recent');
    expect(sanitizedData.contentType).toBe('post');
    expect(sanitizedData.searchEnabled).toBe(true);
    expect(sanitizedBody.contentType).toBe('post');
    expect(sanitizedBody.searchEnabled).toBe(true);
  });

  it('文字列形式と配列形式の query をスクラブする', async () => {
    setDsn(TEST_DSN);
    initSentry();

    const stringResult = await runBeforeSend(
      mockInit,
      createEvent({
        request: { query_string: 'page=1&password=secret&search=bonsai&filter=active' },
      }),
    );
    expect(getRequest(stringResult).query_string).toBe(
      'page=1&password=%5BFiltered%5D&search=%5BFiltered%5D&filter=active',
    );

    const arrayResult = await runBeforeSend(
      mockInit,
      createEvent({
        request: {
          query_string: [
            ['refresh_token', 'secret'],
            ['page', '3'],
          ],
        },
      }),
    );
    expect(getRequest(arrayResult).query_string).toEqual([
      ['refresh_token', '[Filtered]'],
      ['page', '3'],
    ]);
  });

  it('user、contexts、extra をネストした位置までスクラブする', async () => {
    setDsn(TEST_DSN);
    initSentry();
    const event = createEvent({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        username: 'bonsai-user',
        segment: 'beta',
        preferences: { theme: 'light', sessionToken: 'user-secret' },
      },
      contexts: {
        device: {
          model: 'Pixel',
          device_unique_identifier: 'device-secret',
        },
        feature: {
          name: 'search',
          nested: { authorization: 'Bearer context-secret', enabled: true },
        },
      },
      extra: {
        operation: 'load-feed',
        nested: {
          password: 'extra-secret',
          safe: { attempts: 2, emailNotificationsEnabled: true },
        },
      },
    });

    const result = await runBeforeSend(mockInit, event);
    const user = getRecord(result.user);
    const preferences = getRecord(user.preferences);
    const device = getRecord(result.contexts?.device);
    const feature = getRecord(result.contexts?.feature);
    const contextNested = getRecord(feature.nested);
    const extra = getRecord(result.extra);
    const extraNested = getRecord(extra.nested);
    const safeExtra = getRecord(extraNested.safe);

    expect(user.id).toBe('[Filtered]');
    expect(user.email).toBe('[Filtered]');
    expect(user.username).toBe('[Filtered]');
    expect(user.segment).toBe('beta');
    expect(preferences.theme).toBe('light');
    expect(preferences.sessionToken).toBe('[Filtered]');
    expect(device.model).toBe('Pixel');
    expect(device.device_unique_identifier).toBe('[Filtered]');
    expect(feature.name).toBe('search');
    expect(contextNested.authorization).toBe('[Filtered]');
    expect(contextNested.enabled).toBe(true);
    expect(extra.operation).toBe('load-feed');
    expect(extraNested.password).toBe('[Filtered]');
    expect(safeExtra.attempts).toBe(2);
    expect(safeExtra.emailNotificationsEnabled).toBe(true);
  });

  it('breadcrumb data とメッセージをスクラブする', async () => {
    setDsn(TEST_DSN);
    initSentry();
    const event = createEvent({
      breadcrumbs: [
        {
          type: 'http',
          message: 'Sending Bearer breadcrumb-secret',
          data: {
            endpoint: '/api/v1/posts',
            search: 'private breadcrumb search',
            payload: {
              accessToken: 'nested-secret',
              content: 'private post text',
              contentType: 'post',
              count: 1,
            },
          },
        },
        { type: 'debug', message: 'Normal breadcrumb' },
      ],
    });

    const result = await runBeforeSend(mockInit, event);
    const firstBreadcrumb = result.breadcrumbs?.[0];
    const secondBreadcrumb = result.breadcrumbs?.[1];
    if (firstBreadcrumb === undefined || secondBreadcrumb === undefined) {
      throw new Error('Expected breadcrumbs');
    }
    const data = getRecord(firstBreadcrumb.data);
    const payload = getRecord(data.payload);

    expect(firstBreadcrumb.message).toBe('[Filtered]');
    expect(data.endpoint).toBe('/api/v1/posts');
    expect(data.search).toBe('[Filtered]');
    expect(payload.accessToken).toBe('[Filtered]');
    expect(payload.content).toBe('[Filtered]');
    expect(payload.contentType).toBe('post');
    expect(payload.count).toBe(1);
    expect(secondBreadcrumb.message).toBe('Normal breadcrumb');
  });

  it('メッセージと例外内の認証文字列やメールアドレスをスクラブする', async () => {
    setDsn(TEST_DSN);
    initSentry();
    const event = createEvent({
      message: 'Authorization: Bearer event-secret',
      logentry: { message: 'Failed for user@example.com' },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Request failed with Bearer exception-secret',
          },
          { type: 'Error', value: 'Normal error message' },
        ],
      },
    });

    const result = await runBeforeSend(mockInit, event);

    expect(result.message).toBe('[Filtered]');
    expect(result.logentry?.message).toBe('[Filtered]');
    expect(result.exception?.values?.[0]?.value).toBe('[Filtered]');
    expect(result.exception?.values?.[1]?.value).toBe('Normal error message');
  });

  it('循環参照と上限を超える深い入力でも例外を投げない', async () => {
    setDsn(TEST_DSN);
    initSentry();
    const circular: Record<string, unknown> = { safe: 'kept' };
    circular.self = circular;

    const deep: Record<string, unknown> = { level: 0 };
    let cursor = deep;
    for (let level = 1; level <= 12; level += 1) {
      const next: Record<string, unknown> = { level };
      cursor.next = next;
      cursor = next;
    }
    const oversized = Array.from({ length: 101 }, (_, index) => index);

    const result = await runBeforeSend(
      mockInit,
      createEvent({ extra: { circular, deep, oversized } }),
    );
    const extra = getRecord(result.extra);
    const scrubbedOversized = extra.oversized;
    if (!Array.isArray(scrubbedOversized)) {
      throw new Error('Expected oversized data');
    }
    const serialized = JSON.stringify(result.extra);

    expect(serialized).toContain('[Circular]');
    expect(serialized).toContain('[Truncated]');
    expect(serialized).toContain('kept');
    expect(scrubbedOversized).toHaveLength(101);
    expect(scrubbedOversized.at(-1)).toBe('[Truncated]');
  });

  it('対象フィールドがないイベントも変更せず処理する', async () => {
    setDsn(TEST_DSN);
    initSentry();
    const event = createEvent({ message: 'Normal error', level: 'error' });

    const result = await runBeforeSend(mockInit, event);

    expect(result).toEqual(event);
  });
});
