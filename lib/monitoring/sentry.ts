/**
 * @module lib/monitoring/sentry
 * Sentry 初期化と例外キャプチャのラッパー。
 * トークン・認証情報・個人情報は beforeSend でスクラブする（auth-tokens.md）。
 */

import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, Contexts, ErrorEvent, EventHint, User } from '@sentry/core';

const FILTERED_VALUE = '[Filtered]';
const CIRCULAR_VALUE = '[Circular]';
const TRUNCATED_VALUE = '[Truncated]';
const MAX_SCRUB_DEPTH = 8;
const MAX_COLLECTION_ENTRIES = 100;

const SENSITIVE_KEY_PARTS = [
  'password',
  'passwd',
  'passcode',
  'token',
  'secret',
  'authorization',
  'authheader',
  'cookie',
  'credential',
  'apikey',
  'signature',
  'privatekey',
  'sessionid',
  'csrf',
  'xsrf',
  'deviceuniqueidentifier',
  'advertisingid',
];

const SENSITIVE_KEY_SUFFIXES = [
  'email',
  'emailaddress',
  'username',
  'userid',
  'ipaddress',
  'phonenumber',
  'telephone',
  'fullname',
  'firstname',
  'lastname',
];

const SENSITIVE_EXACT_KEYS = new Set([
  'pwd',
  'pin',
  'otp',
  'phone',
  'address',
  'mail',
  'content',
  'body',
  'message',
  'text',
  'bio',
  'biography',
  'nickname',
  'displayname',
  'q',
  'query',
  'search',
  'searchquery',
  'searchterm',
  'keyword',
  'keywords',
  'comment',
  'caption',
]);

const USER_PII_KEYS = new Set([
  'id',
  'email',
  'username',
  'ipaddress',
  'geo',
  'name',
  'phone',
  'address',
]);

const SENSITIVE_VALUE_PATTERNS = [
  /\bbearer\s+\S+/i,
  /\bbasic\s+[a-z0-9+/=_-]+/i,
  /\b(?:authorization|cookie|set-cookie|password|passcode|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|client[_-]?secret)\s*[:=]\s*\S+/i,
  /\beyJ[a-z0-9_-]+\.eyJ[a-z0-9_-]+\.[a-z0-9_-]+\b/i,
  /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b/i,
];

function getSentryDsn(): string | undefined {
  return process.env.EXPO_PUBLIC_SENTRY_DSN;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    SENSITIVE_EXACT_KEYS.has(normalized) ||
    SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part)) ||
    SENSITIVE_KEY_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

function isUserPiiKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return USER_PII_KEYS.has(normalized) || isSensitiveKey(key);
}

function isUrlKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    normalized === 'href' ||
    normalized === 'uri' ||
    normalized.endsWith('url') ||
    normalized.endsWith('uri')
  );
}

function containsSensitivePattern(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scrubValue(
  value: unknown,
  key: string | undefined,
  depth: number,
  ancestors: WeakSet<object>,
): unknown {
  if (key !== undefined && isSensitiveKey(key)) {
    return FILTERED_VALUE;
  }

  if (typeof value === 'string') {
    if (key !== undefined && isUrlKey(key)) {
      return scrubUrl(value);
    }
    return containsSensitivePattern(value) ? FILTERED_VALUE : value;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (depth >= MAX_SCRUB_DEPTH) {
    return TRUNCATED_VALUE;
  }

  if (ancestors.has(value)) {
    return CIRCULAR_VALUE;
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      const safeItems = value
        .slice(0, MAX_COLLECTION_ENTRIES)
        .map((item) => scrubValue(item, undefined, depth + 1, ancestors));
      if (value.length > MAX_COLLECTION_ENTRIES) {
        safeItems.push(TRUNCATED_VALUE);
      }
      return safeItems;
    }

    const safeRecord: Record<string, unknown> = {};
    const entries = Object.entries(value);
    for (const [entryKey, entryValue] of entries.slice(0, MAX_COLLECTION_ENTRIES)) {
      safeRecord[entryKey] = scrubValue(entryValue, entryKey, depth + 1, ancestors);
    }
    if (entries.length > MAX_COLLECTION_ENTRIES) {
      safeRecord.__truncated__ = TRUNCATED_VALUE;
    }
    return safeRecord;
  } catch {
    return FILTERED_VALUE;
  } finally {
    ancestors.delete(value);
  }
}

function scrubRecord(value: Record<string, unknown>): Record<string, unknown> {
  const scrubbed = scrubValue(value, undefined, 0, new WeakSet());
  return isRecord(scrubbed) ? scrubbed : { value: scrubbed };
}

function scrubStringValue(key: string, value: string): string {
  return isSensitiveKey(key) || containsSensitivePattern(value) ? FILTERED_VALUE : value;
}

function decodeQueryComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function scrubQueryString(query: string): string {
  const hasQuestionMark = query.startsWith('?');
  const rawQuery = hasQuestionMark ? query.slice(1) : query;
  const safeQuery = rawQuery
    .split('&')
    .map((part) => {
      const separatorIndex = part.indexOf('=');
      const rawKey = separatorIndex >= 0 ? part.slice(0, separatorIndex) : part;
      const rawValue = separatorIndex >= 0 ? part.slice(separatorIndex + 1) : '';
      const decodedKey = decodeQueryComponent(rawKey);
      const decodedValue = decodeQueryComponent(rawValue);

      if (isSensitiveKey(decodedKey) || containsSensitivePattern(decodedValue)) {
        return `${rawKey}=${encodeURIComponent(FILTERED_VALUE)}`;
      }
      return part;
    })
    .join('&');

  return hasQuestionMark ? `?${safeQuery}` : safeQuery;
}

function scrubUrlFragment(fragment: string): string {
  if (fragment.length === 0) {
    return '';
  }

  const rawFragment = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const queryIndex = rawFragment.indexOf('?');

  if (queryIndex >= 0) {
    const route = rawFragment.slice(0, queryIndex);
    if (containsSensitivePattern(decodeQueryComponent(route))) {
      return `#${encodeURIComponent(FILTERED_VALUE)}`;
    }
    return `#${route}?${scrubQueryString(rawFragment.slice(queryIndex + 1))}`;
  }

  if (rawFragment.includes('=') || rawFragment.includes('&')) {
    return `#${scrubQueryString(rawFragment)}`;
  }

  return containsSensitivePattern(decodeQueryComponent(rawFragment))
    ? `#${encodeURIComponent(FILTERED_VALUE)}`
    : fragment;
}

function scrubUrl(url: string): string {
  const hashIndex = url.indexOf('#');
  const withoutFragment = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const fragment = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const queryIndex = withoutFragment.indexOf('?');
  const base = queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment;

  if (containsSensitivePattern(decodeQueryComponent(base))) {
    return FILTERED_VALUE;
  }

  const safeFragment = scrubUrlFragment(fragment);
  if (queryIndex < 0) {
    return `${base}${safeFragment}`;
  }

  const query = withoutFragment.slice(queryIndex + 1);
  return `${base}?${scrubQueryString(query)}${safeFragment}`;
}

function scrubQuery(
  query: NonNullable<NonNullable<ErrorEvent['request']>['query_string']>,
): NonNullable<NonNullable<ErrorEvent['request']>['query_string']> {
  if (typeof query === 'string') {
    return scrubQueryString(query);
  }

  if (Array.isArray(query)) {
    return query.map(([key, value]): [string, string] => [key, scrubStringValue(key, value)]);
  }

  const safeQuery: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    safeQuery[key] = scrubStringValue(key, value);
  }
  return safeQuery;
}

function scrubHeaders(headers: Record<string, string>): Record<string, string> {
  const safeHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!isSensitiveKey(key)) {
      safeHeaders[key] = containsSensitivePattern(value) ? FILTERED_VALUE : value;
    }
  }
  return safeHeaders;
}

function scrubStringRecord(values: Record<string, string>): Record<string, string> {
  const safeValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    safeValues[key] = scrubStringValue(key, value);
  }
  return safeValues;
}

function scrubUser(user: User): User {
  const safeUser: User = {};
  for (const [key, value] of Object.entries(user)) {
    safeUser[key] = isUserPiiKey(key) ? FILTERED_VALUE : scrubValue(value, key, 0, new WeakSet());
  }
  return safeUser;
}

function scrubContexts(contexts: Contexts): Contexts {
  const safeContexts: Contexts = {};
  for (const [key, value] of Object.entries(contexts)) {
    if (value === undefined) {
      safeContexts[key] = undefined;
    } else if (isSensitiveKey(key)) {
      safeContexts[key] = { value: FILTERED_VALUE };
    } else {
      safeContexts[key] = scrubRecord(value);
    }
  }
  return safeContexts;
}

function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const safeCrumb = { ...crumb };

  if (typeof safeCrumb.message === 'string' && containsSensitivePattern(safeCrumb.message)) {
    safeCrumb.message = FILTERED_VALUE;
  }

  if (safeCrumb.data !== null && safeCrumb.data !== undefined) {
    safeCrumb.data = scrubRecord(safeCrumb.data);
  }

  return safeCrumb;
}

function scrubSensitiveData(event: ErrorEvent): ErrorEvent {
  const scrubbed = { ...event };

  if (typeof scrubbed.message === 'string' && containsSensitivePattern(scrubbed.message)) {
    scrubbed.message = FILTERED_VALUE;
  }

  if (
    typeof scrubbed.logentry?.message === 'string' &&
    containsSensitivePattern(scrubbed.logentry.message)
  ) {
    scrubbed.logentry = { ...scrubbed.logentry, message: FILTERED_VALUE };
  }

  if (scrubbed.request !== undefined) {
    const safeRequest = { ...scrubbed.request };
    if (safeRequest.headers !== undefined) {
      safeRequest.headers = scrubHeaders(safeRequest.headers);
    }
    if (safeRequest.data !== undefined) {
      safeRequest.data = scrubValue(safeRequest.data, undefined, 0, new WeakSet());
    }
    if (safeRequest.query_string !== undefined) {
      safeRequest.query_string = scrubQuery(safeRequest.query_string);
    }
    if (safeRequest.url !== undefined) {
      safeRequest.url = scrubUrl(safeRequest.url);
    }
    if (safeRequest.env !== undefined) {
      safeRequest.env = scrubStringRecord(safeRequest.env);
    }
    delete safeRequest.cookies;
    scrubbed.request = safeRequest;
  }

  if (scrubbed.user !== undefined) {
    scrubbed.user = scrubUser(scrubbed.user);
  }

  if (scrubbed.contexts !== undefined) {
    scrubbed.contexts = scrubContexts(scrubbed.contexts);
  }

  if (scrubbed.extra !== undefined) {
    scrubbed.extra = scrubRecord(scrubbed.extra);
  }

  if (scrubbed.exception?.values !== undefined) {
    scrubbed.exception = {
      ...scrubbed.exception,
      values: scrubbed.exception.values.map((entry) => {
        if (typeof entry.value === 'string' && containsSensitivePattern(entry.value)) {
          return { ...entry, value: FILTERED_VALUE };
        }
        return entry;
      }),
    };
  }

  if (Array.isArray(scrubbed.breadcrumbs)) {
    scrubbed.breadcrumbs = scrubbed.breadcrumbs.map(scrubBreadcrumb);
  }

  return scrubbed;
}

/**
 * Sentry を初期化する。
 * EXPO_PUBLIC_SENTRY_DSN が未設定の場合は no-op（開発環境で DSN 不要で動く）。
 */
export function initSentry(): void {
  const dsn = getSentryDsn();
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
      return scrubSensitiveData(event);
    },
  });
}

/**
 * 例外を Sentry に送信する薄いラッパー。
 * DSN 未設定時は no-op。トークン・個人情報は beforeSend でスクラブ済み。
 */
export function captureException(error: unknown): void {
  if (!getSentryDsn()) {
    return;
  }
  Sentry.captureException(error);
}
