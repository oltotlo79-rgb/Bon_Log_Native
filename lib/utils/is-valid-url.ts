/**
 * @module lib/utils/is-valid-url
 * URL 入力欄の事前検証で使う純粋関数。空文字は未入力として許容し（任意項目のため）、
 * それ以外は http(s) スキームで始まるかのみを見る簡易チェック。厳密な URL 構文検証はサーバー側の責務。
 * サーバー（Bon_Log_cfw）は `/^https?:\/\//i` でスキームの大文字小文字を区別しないため、
 * クライアント側の事前検証もそれより厳しくならないよう同じ意味論に合わせる。
 */
const HTTP_SCHEME_PATTERN = /^https?:\/\//i;

export function isValidUrl(url: string): boolean {
  if (url.length === 0) return true;
  return HTTP_SCHEME_PATTERN.test(url);
}
