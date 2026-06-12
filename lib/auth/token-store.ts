/**
 * @module lib/auth/token-store
 * トークンの保管は expo-secure-store のみ。AsyncStorage への保存は禁止（auth-tokens.md）。
 * アクセストークンはメモリキャッシュを併用し、secure-store の非同期 I/O を最小化する。
 */

import * as SecureStore from 'expo-secure-store';
import {
  SECURE_STORE_ACCESS_TOKEN,
  SECURE_STORE_REFRESH_TOKEN,
} from '@/lib/constants/secure-store-keys';

// アクセストークンのメモリキャッシュ。
// リフレッシュ後も即座に最新値を返せるよう常に secure-store と同期する。
let cachedAccessToken: string | null = null;

// ---------------------------------------------------------------------------
// アクセストークン
// ---------------------------------------------------------------------------

/**
 * アクセストークンを保存する。secure-store に書き込み、メモリキャッシュも更新する。
 * トークンの値をログに出さないこと（auth-tokens.md）。
 */
export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_ACCESS_TOKEN, token);
  cachedAccessToken = token;
}

/**
 * アクセストークンを返す。
 * メモリキャッシュがあればそれを返し、なければ secure-store から読み込む。
 */
export async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken !== null) {
    return cachedAccessToken;
  }
  const stored = await SecureStore.getItemAsync(SECURE_STORE_ACCESS_TOKEN);
  cachedAccessToken = stored;
  return stored;
}

/** アクセストークンを削除する。secure-store から削除し、メモリキャッシュもクリアする。 */
export async function deleteAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_ACCESS_TOKEN);
  cachedAccessToken = null;
}

// ---------------------------------------------------------------------------
// リフレッシュトークン
// ---------------------------------------------------------------------------

/**
 * リフレッシュトークンを保存する。
 * トークンのローテーション時に毎回呼び出す（auth-tokens.md: 使用毎ローテーション）。
 */
export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_REFRESH_TOKEN, token);
}

/** リフレッシュトークンを返す。 */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_STORE_REFRESH_TOKEN);
}

/** リフレッシュトークンを削除する。 */
export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_REFRESH_TOKEN);
}

// ---------------------------------------------------------------------------
// トークンペア操作
// ---------------------------------------------------------------------------

/** アクセストークンとリフレッシュトークンを同時に保存する。 */
export async function saveTokenPair(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  await Promise.all([
    saveAccessToken(tokens.accessToken),
    saveRefreshToken(tokens.refreshToken),
  ]);
}

/** アクセストークンとリフレッシュトークンを両方削除する。 */
export async function deleteTokenPair(): Promise<void> {
  await Promise.all([deleteAccessToken(), deleteRefreshToken()]);
}

// ---------------------------------------------------------------------------
// テスト用ユーティリティ
// ---------------------------------------------------------------------------

/**
 * テスト用: メモリキャッシュをリセットする。
 * アプリコードから呼び出さないこと。
 */
export function resetCachedAccessTokenForTest(): void {
  cachedAccessToken = null;
}
