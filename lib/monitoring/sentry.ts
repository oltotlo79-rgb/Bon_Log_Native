/**
 * @module lib/monitoring/sentry
 * Sentry 初期化と例外キャプチャのラッパー。
 * トークン・認証情報・パスワードは beforeSend でスクラブする（auth-tokens.md）。
 */

import * as Sentry from '@sentry/react-native';
import type { ErrorEvent, EventHint } from '@sentry/core';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Authorization ヘッダーやパスワードフィールドをイベントから除去する */
function scrubSensitiveData(event: ErrorEvent): ErrorEvent {
  const scrubbed = { ...event };

  if (scrubbed.request?.headers) {
    const { Authorization: _auth, authorization: _authLower, ...safeHeaders } =
      scrubbed.request.headers as Record<string, string>;
    scrubbed.request = { ...scrubbed.request, headers: safeHeaders };
  }

  if (scrubbed.extra) {
    const sanitizedExtra: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(scrubbed.extra)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('authorization')
      ) {
        sanitizedExtra[key] = '[Filtered]';
      } else {
        sanitizedExtra[key] = value;
      }
    }
    scrubbed.extra = sanitizedExtra;
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
