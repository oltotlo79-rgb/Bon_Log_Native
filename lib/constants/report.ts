/**
 * @module lib/constants/report
 * 通報機能の定数（通報理由 enum・ラベル・対象種別・対象種別ラベル）。
 * 理由ラベルは Web (Bon_Log_cfw) の lib/constants/report.ts と表示文言を一致させる。
 * 対象種別はサーバー OpenAPI (CreateReportRequest.targetType) の enum と一致させる。
 */

// ---------------------------------------------------------------------------
// 通報理由
// ---------------------------------------------------------------------------

/** 通報理由の value → 日本語ラベルマップ（Web の REPORT_REASONS ラベルと一致）。 */
export const REPORT_REASON_LABELS = {
  spam: 'スパム',
  inappropriate: '不適切な内容',
  harassment: '誹謗中傷',
  copyright: '著作権侵害',
  other: 'その他',
} as const satisfies Record<ReportReason, string>;

/** 通報理由の value 一覧（OpenAPI enum: reason）。 */
export const REPORT_REASONS = ['spam', 'inappropriate', 'harassment', 'copyright', 'other'] as const;

/** 通報理由の型。 */
export type ReportReason = (typeof REPORT_REASONS)[number];

// ---------------------------------------------------------------------------
// 通報対象種別
// ---------------------------------------------------------------------------

/** 通報対象種別 value 一覧（OpenAPI enum: targetType）。 */
export const REPORT_TARGET_TYPES = ['post', 'comment', 'event', 'shop', 'review', 'user'] as const;

/** 通報対象種別の型。 */
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/** 通報対象種別の value → 日本語ラベルマップ（Web の TARGET_TYPE_LABELS と一致）。 */
export const REPORT_TARGET_LABELS = {
  post: '投稿',
  comment: 'コメント',
  event: 'イベント',
  shop: '盆栽園',
  review: 'レビュー',
  user: 'ユーザー',
} as const satisfies Record<ReportTargetType, string>;

/** 通報詳細テキストの最大文字数（OpenAPI スペック: description maxLength 1000）。 */
export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;
