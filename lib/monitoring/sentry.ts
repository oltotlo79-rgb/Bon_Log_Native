/**
 * @module lib/monitoring/sentry
 * Sentry 初期化と例外キャプチャのラッパー。
 * トークン・認証情報・パスワードは beforeSend でスクラブする（auth-tokens.md）。
 */

import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/core';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** キーがセンシティブなフィールドかどうかを判定する */
function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes('password') ||
    lower.includes('token') ||
    lower.includes('secret') ||
    lower.includes('authorization')
  );
}

/** センシティブなパターンを含む文字列かどうかを判定する */
function containsSensitivePattern(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.includes('bearer ') || lower.includes('authorization:');
}

/** breadcrumb 1 件のセンシティブフィールドをスクラブする */
function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const mutableCrumb = { ...crumb };

  if (typeof mutableCrumb.message === 'string' && containsSensitivePattern(mutableCrumb.message)) {
    mutableCrumb.message = '[Filtered]';
  }

  if (mutableCrumb.data !== null && mutableCrumb.data !== undefined) {
    const safeData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(mutableCrumb.data)) {
      if (isSensitiveKey(key)) {
        safeData[key] = '[Filtered]';
      } else {
        safeData[key] = value;
      }
    }
    mutableCrumb.data = safeData;
  }

  return mutableCrumb;
}

/** Authorization ヘッダーやパスワードフィールドをイベントから除去する */
function scrubSensitiveData(event: ErrorEvent): ErrorEvent {
  const scrubbed = { ...event };

  // request.headers のスクラブ（型ガードで絞り込み、as 不使用）
  if (scrubbed.request?.headers !== undefined && scrubbed.request.headers !== null) {
    const rawHeaders = scrubbed.request.headers;
    if (typeof rawHeaders === 'object') {
      const safeHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (isSensitiveKey(key)) {
          continue;
        }
        if (typeof value === 'string') {
          safeHeaders[key] = value;
        }
      }
      scrubbed.request = { ...scrubbed.request, headers: safeHeaders };
    }
  }

  // extra のスクラブ
  if (scrubbed.extra) {
    const sanitizedExtra: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(scrubbed.extra)) {
      if (isSensitiveKey(key)) {
        sanitizedExtra[key] = '[Filtered]';
      } else {
        sanitizedExtra[key] = value;
      }
    }
    scrubbed.extra = sanitizedExtra;
  }

  // exception の message（values[].value）のスクラブ
  if (scrubbed.exception?.values) {
    scrubbed.exception = {
      ...scrubbed.exception,
      values: scrubbed.exception.values.map((entry) => {
        if (typeof entry.value === 'string' && containsSensitivePattern(entry.value)) {
          return { ...entry, value: '[Filtered]' };
        }
        return entry;
      }),
    };
  }

  // breadcrumbs のスクラブ（ErrorEvent.breadcrumbs は Breadcrumb[]）
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
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
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
  if (!SENTRY_DSN) {
    return;
  }
  Sentry.captureException(error);
}
