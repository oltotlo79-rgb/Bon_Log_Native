/**
 * @module lib/utils/is-valid-url
 * URL 入力欄の事前検証で使う純粋関数。空文字は未入力として許容し（任意項目のため）、
 * それ以外は http(s) スキームで始まるかのみを見る簡易チェック。厳密な URL 構文検証はサーバー側の責務。
 */
export function isValidUrl(url: string): boolean {
  if (url.length === 0) return true;
  return url.startsWith('https://') || url.startsWith('http://');
}
