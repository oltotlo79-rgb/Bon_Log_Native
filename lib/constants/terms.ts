/**
 * @module lib/constants/terms
 * Google 新規登録時に送信する利用規約バージョン。
 *
 * GET /api/v1/legal/{slug} はサーバー側で Bearer 認証必須のため、
 * 未認証画面（新規登録）からはサーバー値を取得できず、この定数が実際に送信される値になる。
 * 規約改定時はサーバー側の値と合わせてこの定数を更新すること。
 */

/** Google 新規登録に送信する利用規約バージョン。 */
export const CURRENT_TERMS_VERSION = '2026-07-28';
