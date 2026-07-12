/**
 * @module lib/constants/limits/event
 * イベント関連の制限値（クライアント事前検証用ミラー）。
 * 値の正はサーバー。サーバーエラー (400/429) のハンドリングは必須（api-client.md）。
 * cfw 出典: lib/api/v1/schemas/request.ts の createEventRequestSchema / updateEventRequestSchema。
 * title は同ファイルが lib/constants/limits/post.ts#MAX_EVENT_TITLE_LENGTH を import して使用し、
 * それ以外のフィールドは request.ts 内のモバイル API 専用ローカル定数（非 export）の値を使用する。
 * 汎用値を持つ lib/constants/limits/event.ts（cfw 側）の MAX_EVENT_FIELD_LENGTH (200) とは
 * prefecture/city/admissionFee の値が異なるため、実際に v1 API が検証で使う値をここではミラーする。
 */

/** イベントタイトルの最大文字数 */
export const MAX_EVENT_TITLE_LENGTH = 100;

/** イベント説明文の最大文字数 */
export const MAX_EVENT_DESCRIPTION_LENGTH = 5000;

/** イベント開催都道府県の最大文字数 */
export const MAX_EVENT_PREFECTURE_LENGTH = 20;

/** イベント開催市区町村の最大文字数 */
export const MAX_EVENT_CITY_LENGTH = 100;

/** イベント会場名の最大文字数 */
export const MAX_EVENT_VENUE_LENGTH = 200;

/** イベント主催者名の最大文字数 */
export const MAX_EVENT_ORGANIZER_LENGTH = 200;

/** イベント入場料表記の最大文字数 */
export const MAX_EVENT_ADMISSION_FEE_LENGTH = 100;

/** イベント外部リンク URL の最大文字数 */
export const MAX_EVENT_EXTERNAL_URL_LENGTH = 2000;
