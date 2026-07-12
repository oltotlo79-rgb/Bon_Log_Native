/**
 * @module lib/constants/limits/scheduled-post
 * 予約投稿関連の制限値（クライアント事前検証用ミラー）。
 * 値の正はサーバー。サーバーエラー (400/429) のハンドリングは必須（api-client.md）。
 * cfw 出典: POST /api/v1/scheduled-posts の OpenAPI スペック（lib/api/generated/schema.d.ts の
 * CreateScheduledPostRequest 説明: scheduledAt は未来かつ 30 日以内、pending 件数は 10 件を超えないこと）。
 */

/** 公開予定日時に指定できる最大未来日数 */
export const SCHEDULED_POST_MAX_FUTURE_DAYS = 30;

/** 保留中（pending）の予約投稿として保持できる最大件数 */
export const SCHEDULED_POST_PENDING_LIMIT = 10;
