/**
 * @module lib/constants/secure-store-keys
 * expo-secure-store のキー名定数。
 * トークンをログ・Sentry に出力しないこと（auth-tokens.md）。
 */

/** アクセストークンの secure-store キー */
export const SECURE_STORE_ACCESS_TOKEN = 'bon_log_access_token';

/** リフレッシュトークンの secure-store キー */
export const SECURE_STORE_REFRESH_TOKEN = 'bon_log_refresh_token';

/**
 * Push 通知デバイストークンの secure-store キー。
 * ログアウト時の解除 API 呼び出しで使用する。トークン自体はログ・Sentry に出さない。
 */
export const SECURE_STORE_PUSH_TOKEN = 'bon_log_push_token';
