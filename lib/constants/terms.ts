/**
 * @module lib/constants/terms
 * Google 新規登録時に送信する利用規約バージョンのフォールバック定数。
 *
 * 正の値はサーバー（GET /api/v1/legal/terms の updatedAt）。
 * 規約改定でサーバー側の値が変わると、この定数と乖離した配布済みバイナリは
 * 403 TERMS_ACCEPTANCE_REQUIRED を返され続けるため、通常は
 * lib/queries/legal.ts の useTermsVersion() 経由でサーバー値を優先取得すること。
 * ここの値はオフライン・未配備時のフォールバックとしてのみ使う。
 */

/** フォールバック用の利用規約バージョン。通常は useTermsVersion() を使うこと。 */
export const CURRENT_TERMS_VERSION = '2026-07-28';
