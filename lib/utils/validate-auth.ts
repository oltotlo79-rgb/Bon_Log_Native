/**
 * @module lib/utils/validate-auth
 * 認証フォームのクライアント事前検証ヘルパー。
 * 検証の正はサーバー。これは UX のための事前フィードバック専用（CLAUDE.md）。
 * 戻り値: null = OK、string = errors.ts 定数のエラーメッセージ。
 */

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  MIN_NICKNAME_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_BIO_LENGTH,
  MAX_LOCATION_LENGTH,
} from '@/lib/constants/limits/auth';
import {
  ERR_EMAIL_INVALID,
  ERR_EMAIL_TOO_LONG,
  ERR_PASSWORD_MIN_LENGTH,
  ERR_PASSWORD_MAX_LENGTH,
  ERR_PASSWORD_ALPHANUMERIC,
  ERR_PASSWORD_REQUIRE_LETTER,
  ERR_PASSWORD_REQUIRE_NUMBER,
  ERR_NICKNAME_REQUIRED,
  ERR_NICKNAME_TOO_LONG,
  ERR_NICKNAME_INVALID_CHARS,
  ERR_BIO_TOO_LONG,
  ERR_LOCATION_TOO_LONG,
} from '@/lib/constants/errors';

/** メールアドレスを検証する。null = OK、string = エラーメッセージ */
export function validateEmail(value: string): string | null {
  if (value.length > MAX_EMAIL_LENGTH) {
    return ERR_EMAIL_TOO_LONG(MAX_EMAIL_LENGTH);
  }
  // RFC 5322 の簡易チェック。サーバー側の正規化後検証が本番バリデーション
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return ERR_EMAIL_INVALID;
  }
  return null;
}

/** パスワードを検証する。null = OK、string = エラーメッセージ */
export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return ERR_PASSWORD_MIN_LENGTH;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return ERR_PASSWORD_MAX_LENGTH;
  }

  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);

  if (!hasLetter && !hasNumber) {
    return ERR_PASSWORD_ALPHANUMERIC;
  }
  if (!hasLetter) {
    return ERR_PASSWORD_REQUIRE_LETTER;
  }
  if (!hasNumber) {
    return ERR_PASSWORD_REQUIRE_NUMBER;
  }
  return null;
}

/** ニックネームを検証する。null = OK、string = エラーメッセージ */
export function validateNickname(value: string): string | null {
  if (value.length < MIN_NICKNAME_LENGTH) {
    return ERR_NICKNAME_REQUIRED;
  }
  if (value.length > MAX_NICKNAME_LENGTH) {
    return ERR_NICKNAME_TOO_LONG(MAX_NICKNAME_LENGTH);
  }
  if (/[\r\n<>]/.test(value)) {
    return ERR_NICKNAME_INVALID_CHARS;
  }
  return null;
}

/** 自己紹介を検証する。null = OK、string = エラーメッセージ */
export function validateBio(value: string): string | null {
  if (value.length > MAX_BIO_LENGTH) {
    return ERR_BIO_TOO_LONG(MAX_BIO_LENGTH);
  }
  return null;
}

/** 居住地域を検証する。null = OK、string = エラーメッセージ */
export function validateLocation(value: string): string | null {
  if (value.length > MAX_LOCATION_LENGTH) {
    return ERR_LOCATION_TOO_LONG(MAX_LOCATION_LENGTH);
  }
  return null;
}
