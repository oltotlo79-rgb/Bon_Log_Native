/**
 * @module lib/constants/terms
 * Google 新規登録時に送信する利用規約バージョンのフォールバック値。
 *
 * POST /api/v1/auth/google の 403 TERMS_ACCEPTANCE_REQUIRED はサーバー側の現行値
 * （error.details.currentTermsVersion）を同梱する（cfw handback 2026-07-29 §2）。
 * lib/auth/use-google-auth はその値を受け取れた場合に優先して再送するため、
 * この定数が実際に使われるのはサーバーから 403 を一度も受け取っていない初回
 * リクエスト、または旧サーバー（details 未対応）からの応答時のみ。
 * 規約改定時はサーバー側の値と合わせてこの定数を更新すること。
 */

/** Google 新規登録に送信する利用規約バージョンのフォールバック値。 */
export const CURRENT_TERMS_VERSION = '2026-07-28';
