/**
 * @module lib/constants/limits/ui
 * UI タイミング・表示制御の定数。
 * 値は Bon_Log_cfw/lib/constants/limits/ui.ts のミラー（モバイル固有の追加は末尾に定義）。
 */

/** コピー完了フィードバックの表示時間（ms） */
export const TIMEOUT_COPIED_FEEDBACK = 2000;

/** 成功メッセージの表示時間（ms） */
export const TIMEOUT_SUCCESS_MESSAGE = 5000;

/**
 * 成功画面からの自動リダイレクトまでの待機時間（ms）。
 * パスワードリセット成功後のログイン画面遷移等に使用する。
 * cfw 出典: lib/constants/limits/ui.ts#TIMEOUT_AUTO_REDIRECT (3000)
 */
export const TIMEOUT_AUTO_REDIRECT = 3000;

/** トースト通知の表示時間（ms） */
export const TIMEOUT_TOAST = 3000;

/** ドロップダウンぼかし遅延（ms） */
export const TIMEOUT_DROPDOWN_BLUR = 200;

/** 検索デバウンス遅延（ms） */
export const DEBOUNCE_SEARCH_MS = 300;

/** デバウンス遅延・汎用（ms） */
export const DEBOUNCE_DELAY_MS = 300;

// 検索より高頻度なタップが想定されるため、いいねは独立した定数でチューニング余地を持たせる
/** いいねボタン連打の API 呼び出しを束ねるデバウンス時間（ms）。設計 follow-and-engagement.md §3.2 */
export const LIKE_DEBOUNCE_MS = 300;

/** 残り文字数の警告しきい値（文字） */
export const REMAINING_CHARS_WARNING_THRESHOLD = 50;

/** バッジ表示のオーバーフロー閾値（この数を超えると「99+」等の表現になる） */
export const BADGE_OVERFLOW_THRESHOLD = 99;

/** スケルトンローディングの表示件数 */
export const SKELETON_COUNT = 5;

/**
 * 検索履歴として保持する最大件数。
 * cfw 出典: lib/constants/limits/ui.ts#MAX_RECENT_SEARCHES (10)
 */
export const MAX_RECENT_SEARCHES = 10;
