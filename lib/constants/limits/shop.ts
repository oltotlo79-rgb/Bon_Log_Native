/**
 * @module lib/constants/limits/shop
 * 盆栽園（ショップ）・レビュー関連の制限値（クライアント事前検証用ミラー）。
 * 値の正はサーバー。サーバーエラー (400/429) のハンドリングは必須（api-client.md）。
 * cfw 出典: lib/constants/limits/post.ts の MAX_SHOP_* / lib/constants/limits/pagination.ts の
 * MAX_SHOP_GENRES。lib/api/v1/schemas/request.ts の createShopRequestSchema /
 * updateShopRequestSchema / createReviewRequestSchema が実際の検証で使用する値と一致する。
 */

/** 盆栽園名の最大文字数 */
export const MAX_SHOP_NAME_LENGTH = 100;

/** 盆栽園住所の最大文字数 */
export const MAX_SHOP_ADDRESS_LENGTH = 200;

/** 盆栽園電話番号の最大文字数 */
export const MAX_SHOP_PHONE_LENGTH = 30;

/** 盆栽園 Web サイト URL の最大文字数 */
export const MAX_SHOP_URL_LENGTH = 500;

/** 盆栽園営業時間の最大文字数 */
export const MAX_SHOP_BUSINESS_HOURS_LENGTH = 200;

/** 盆栽園定休日の最大文字数 */
export const MAX_SHOP_CLOSED_DAYS_LENGTH = 100;

/** 盆栽園に設定できる最大ジャンル数 */
export const MAX_SHOP_GENRES = 5;

/**
 * レビュー本文の文字数上限。
 * サーバー (createReviewRequestSchema: POST /api/v1/shops/{id}/reviews) の content は
 * `z.string().nullable().optional()` で長さ制約なし。DB (Prisma ShopReview.content) も
 * `String? @db.Text` で無制限。この値はサーバー制約のミラーではなく、無制限テキストエリアに
 * よる UX 劣化を避けるためのクライアント側ソフト上限であり、サーバー送信を拒否する根拠にはしない。
 */
export const MAX_REVIEW_CONTENT_LENGTH = 1000;
