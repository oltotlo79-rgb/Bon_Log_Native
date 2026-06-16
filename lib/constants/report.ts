/**
 * @module lib/constants/report
 * 通報機能の定数（通報理由 enum・ラベル・対象種別）。
 * ugc-safety.md §12.1 / §7.1 の定義に準拠する。
 */

// ---------------------------------------------------------------------------
// 通報理由
// ---------------------------------------------------------------------------

/** 通報理由の value → 日本語ラベルマップ（ugc-safety.md §12.1）。 */
export const REPORT_REASON_LABELS = {
  spam: 'スパム',
  inappropriate: '不適切なコンテンツ',
  harassment: '嫌がらせ',
  copyright: '著作権侵害',
  other: 'その他',
} as const satisfies Record<ReportReason, string>;

/** 通報理由の value 一覧（OpenAPI enum: reason）。 */
export const REPORT_REASONS = ['spam', 'inappropriate', 'harassment', 'copyright', 'other'] as const;

/** 通報理由の型。 */
export type ReportReason = (typeof REPORT_REASONS)[number];

// ---------------------------------------------------------------------------
// 通報対象種別（MVP は post / comment / user のみ）
// ---------------------------------------------------------------------------

/** MVP スコープの通報対象種別 value 一覧。 */
export const REPORT_TARGET_TYPES = ['post', 'comment', 'user'] as const;

/** 通報対象種別の型（MVP スコープ）。 */
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/** 通報詳細テキストの最大文字数（OpenAPI スペック: description maxLength 1000）。 */
export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;
