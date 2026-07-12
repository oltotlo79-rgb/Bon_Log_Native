/**
 * @module lib/constants/limits/bonsai
 * マイ盆栽（Bonsai）関連の制限値（クライアント事前検証用ミラー）。
 * 値の正はサーバー。サーバーエラー (400/429) のハンドリングは必須（api-client.md）。
 * cfw 出典: lib/constants/limits/post.ts の MAX_BONSAI_* / lib/constants/limits/media.ts の
 * MAX_BONSAI_RECORD_IMAGES。lib/api/v1/schemas/request.ts の createBonsaiRequestSchema /
 * updateBonsaiRequestSchema / createBonsaiRecordRequestSchema / updateBonsaiRecordRequestSchema
 * が実際の検証で使用する値と一致する。
 */

/** 盆栽名の最大文字数 */
export const MAX_BONSAI_NAME_LENGTH = 100;

/** 盆栽の樹種（自由入力欄）の最大文字数 */
export const MAX_BONSAI_SPECIES_LENGTH = 100;

/**
 * 盆栽説明文の最大文字数。
 * サーバーは成長記録本文（POST /api/v1/bonsai/{id}/records の content）にも同じ
 * MAX_BONSAI_DESCRIPTION_LENGTH を流用しているため、成長記録フォームの文字数上限としても
 * 本定数を使用する。
 */
export const MAX_BONSAI_DESCRIPTION_LENGTH = 2000;

/** 成長記録に添付できる画像の最大枚数 */
export const MAX_BONSAI_RECORD_IMAGES = 4;
