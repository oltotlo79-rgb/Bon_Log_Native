/**
 * @module lib/utils/relative-time
 * 投稿日時を日本語の相対時刻文字列に変換する純粋関数。
 * 外部依存なし（Hermes の Intl.RelativeTimeFormat 実装差異を避けるため自前実装）。
 * 仕様: docs/design/post-card.md §14 の表記ルール。
 */

// ---------------------------------------------------------------------------
// 時間定数（ミリ秒）
// ---------------------------------------------------------------------------

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** 相対表記から絶対日付表記に切り替える閾値（6日超 = 7日目以降）*/
const RELATIVE_MAX_DAYS = 6;

// ---------------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------------

function zeroPad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Date を "MM/DD"（今年）または "YYYY/MM/DD"（過去年）にフォーマットする。
 * post-card.md §14: 7日以上は日付表記。
 */
function formatAbsoluteDate(date: Date, now: Date): string {
  const month = zeroPad(date.getMonth() + 1);
  const day = zeroPad(date.getDate());

  if (date.getFullYear() === now.getFullYear()) {
    return `${month}/${day}`;
  }
  return `${date.getFullYear()}/${month}/${day}`;
}

/**
 * Date を絶対日時文字列 "YYYY年MM月DD日 HH:mm" にフォーマットする。
 * accessibilityLabel / accessibilityHint 用（post-card.md §14）。
 */
export function formatAbsoluteDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = zeroPad(date.getMonth() + 1);
  const day = zeroPad(date.getDate());
  const hours = zeroPad(date.getHours());
  const minutes = zeroPad(date.getMinutes());
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

// ---------------------------------------------------------------------------
// 公開関数
// ---------------------------------------------------------------------------

/**
 * 日時を日本語の相対時刻文字列に変換する。
 *
 * 表記ルール（post-card.md §14）:
 * - 1分未満          → 「たった今」
 * - 1〜59分          → 「{N}分前」
 * - 1〜23時間        → 「{N}時間前」
 * - 1〜6日           → 「{N}日前」
 * - 7日以上・今年    → 「MM/DD」
 * - 7日以上・過去年  → 「YYYY/MM/DD」
 *
 * @param date  - 投稿日時（Date オブジェクトまたは ISO 8601 文字列）
 * @param now   - 現在時刻（省略時は Date.now()。テスト用に注入可能）
 * @returns 日本語の相対時刻文字列
 */
export function formatRelativeTime(
  date: Date | string,
  now: Date = new Date()
): string {
  const target = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - target.getTime();

  // 未来日時は「たった今」として扱う（clock skew / ネットワーク遅延対策）
  if (diffMs < 0) {
    return 'たった今';
  }

  if (diffMs < MS_PER_MINUTE) {
    return 'たった今';
  }

  if (diffMs < MS_PER_HOUR) {
    const minutes = Math.floor(diffMs / MS_PER_MINUTE);
    return `${minutes}分前`;
  }

  if (diffMs < MS_PER_DAY) {
    const hours = Math.floor(diffMs / MS_PER_HOUR);
    return `${hours}時間前`;
  }

  const days = Math.floor(diffMs / MS_PER_DAY);
  if (days <= RELATIVE_MAX_DAYS) {
    return `${days}日前`;
  }

  return formatAbsoluteDate(target, now);
}
