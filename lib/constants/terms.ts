/**
 * @module lib/constants/terms
 * Google 新規登録時に送信する利用規約バージョン定数。
 * cfw 側 lib/constants/terms-version.ts の CURRENT_TERMS_VERSION と同値を維持する
 * （ANDROID_LEGAL_DOCUMENTS.terms.updatedAt が正。値が変わったら既存未登録ユーザーの
 * 同意フローが再度必要になる）。
 */

/** 現行の利用規約バージョン（Google 新規登録の termsVersion に送信する値）。 */
export const CURRENT_TERMS_VERSION = '2026-07-28';
