/**
 * @module lib/constants/limits/auth
 * 認証・ユーザープロフィール関連の制限値（クライアント事前検証用ミラー）。
 * 値の正はサーバー。サーバーエラー (400/429) のハンドリングは必須（api-client.md）。
 */

/** パスワードの最小文字数 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * パスワードの最大文字数。
 * bcrypt は先頭 72 バイトのみをハッシュ対象とするため、サーバー側でこの値を上限として強制する。
 * ログインの既存パスワード比較には上限を課さない（既存ユーザーを締め出さない）。
 */
export const PASSWORD_MAX_LENGTH = 72;

/** メールアドレスの最大文字数 */
export const MAX_EMAIL_LENGTH = 100;

/** ニックネームの最小文字数（1文字以上必須） */
export const MIN_NICKNAME_LENGTH = 1;

/** ニックネームの最大文字数 */
export const MAX_NICKNAME_LENGTH = 50;

/** 自己紹介の最大文字数 */
export const MAX_BIO_LENGTH = 200;

/** 居住地域の最大文字数 */
export const MAX_LOCATION_LENGTH = 100;

/** 盆栽歴の開始年の最小値 */
export const USER_BONSAI_START_MIN_YEAR = 1900;
