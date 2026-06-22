import { formatRelativeTime, formatAbsoluteDateTime } from '@/lib/utils/relative-time';

// テスト用の固定現在時刻（2026-06-12 12:00:00 JST）
const NOW = new Date('2026-06-12T12:00:00+09:00');

/**
 * NOW から指定ミリ秒前の Date を作るヘルパー。
 * マイナス値を渡すと未来日時になる。
 */
function msBefore(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

function minutesBefore(min: number): Date {
  return msBefore(min * 60 * 1000);
}

function hoursBefore(h: number): Date {
  return msBefore(h * 60 * 60 * 1000);
}

function daysBefore(d: number): Date {
  return msBefore(d * 24 * 60 * 60 * 1000);
}

describe('formatRelativeTime', () => {
  // ---------------------------------------------------------------------------
  // 「たった今」境界（1分未満）
  // ---------------------------------------------------------------------------

  it('0秒前（同時刻）→ たった今', () => {
    expect(formatRelativeTime(NOW, NOW)).toBe('たった今');
  });

  it('1秒前 → たった今', () => {
    expect(formatRelativeTime(msBefore(1000), NOW)).toBe('たった今');
  });

  it('59秒前 → たった今', () => {
    expect(formatRelativeTime(msBefore(59 * 1000), NOW)).toBe('たった今');
  });

  it('59999ms前（1分未満の境界）→ たった今', () => {
    expect(formatRelativeTime(msBefore(59999), NOW)).toBe('たった今');
  });

  it('未来日時（clock skew）→ たった今', () => {
    const future = new Date(NOW.getTime() + 5000);
    expect(formatRelativeTime(future, NOW)).toBe('たった今');
  });

  // ---------------------------------------------------------------------------
  // 「N分前」境界（1〜59分）
  // ---------------------------------------------------------------------------

  it('ちょうど1分前 → 1分前', () => {
    expect(formatRelativeTime(minutesBefore(1), NOW)).toBe('1分前');
  });

  it('3分前 → 3分前', () => {
    expect(formatRelativeTime(minutesBefore(3), NOW)).toBe('3分前');
  });

  it('59分前 → 59分前', () => {
    expect(formatRelativeTime(minutesBefore(59), NOW)).toBe('59分前');
  });

  it('59分59秒前 → 59分前', () => {
    expect(formatRelativeTime(msBefore(59 * 60 * 1000 + 59 * 1000), NOW)).toBe('59分前');
  });

  // ---------------------------------------------------------------------------
  // 「N時間前」境界（1〜23時間）
  // ---------------------------------------------------------------------------

  it('ちょうど1時間前 → 1時間前', () => {
    expect(formatRelativeTime(hoursBefore(1), NOW)).toBe('1時間前');
  });

  it('2時間前 → 2時間前', () => {
    expect(formatRelativeTime(hoursBefore(2), NOW)).toBe('2時間前');
  });

  it('23時間前 → 23時間前', () => {
    expect(formatRelativeTime(hoursBefore(23), NOW)).toBe('23時間前');
  });

  it('23時間59分前 → 23時間前', () => {
    expect(formatRelativeTime(msBefore(23 * 60 * 60 * 1000 + 59 * 60 * 1000), NOW)).toBe('23時間前');
  });

  // ---------------------------------------------------------------------------
  // 「N日前」境界（1〜6日）
  // ---------------------------------------------------------------------------

  it('ちょうど1日前 → 1日前', () => {
    expect(formatRelativeTime(daysBefore(1), NOW)).toBe('1日前');
  });

  it('3日前 → 3日前', () => {
    expect(formatRelativeTime(daysBefore(3), NOW)).toBe('3日前');
  });

  it('6日前 → 6日前', () => {
    expect(formatRelativeTime(daysBefore(6), NOW)).toBe('6日前');
  });

  it('6日23時間前 → 6日前', () => {
    expect(formatRelativeTime(msBefore(6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000), NOW)).toBe('6日前');
  });

  // ---------------------------------------------------------------------------
  // 絶対日付表記への切り替え境界（7日以上）
  // ---------------------------------------------------------------------------

  it('ちょうど7日前・今年 → MM/DD 形式', () => {
    // NOW = 2026-06-12, 7日前 = 2026-06-05
    expect(formatRelativeTime(daysBefore(7), NOW)).toBe('06/05');
  });

  it('30日前・今年 → MM/DD 形式', () => {
    // 2026-06-12 の 30日前 = 2026-05-13
    expect(formatRelativeTime(daysBefore(30), NOW)).toBe('05/13');
  });

  it('今年の1月1日 → MM/DD 形式', () => {
    // UTC 正午を使うことで任意タイムゾーン環境でも getDate/getMonth/getFullYear が同じ値を返す
    const jan1 = new Date('2026-01-01T12:00:00Z');
    expect(formatRelativeTime(jan1, NOW)).toBe('01/01');
  });

  it('昨年の投稿 → YYYY/MM/DD 形式', () => {
    // UTC 正午を使うことで任意タイムゾーン環境でも getDate/getMonth/getFullYear が同じ値を返す
    const lastYear = new Date('2025-12-31T12:00:00Z');
    expect(formatRelativeTime(lastYear, NOW)).toBe('2025/12/31');
  });

  it('2年以上前の投稿 → YYYY/MM/DD 形式', () => {
    const oldPost = new Date('2024-03-15T10:00:00+09:00');
    expect(formatRelativeTime(oldPost, NOW)).toBe('2024/03/15');
  });

  // ---------------------------------------------------------------------------
  // ISO 文字列入力
  // ---------------------------------------------------------------------------

  it('ISO 8601 文字列を受け入れる', () => {
    const isoString = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(isoString, NOW)).toBe('5分前');
  });

  // ---------------------------------------------------------------------------
  // デフォルト now（Date.now() 使用パス）
  // ---------------------------------------------------------------------------

  it('now を省略したときも文字列を返す（型チェックのみ）', () => {
    const recentDate = new Date(Date.now() - 10 * 1000);
    const result = formatRelativeTime(recentDate);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatAbsoluteDateTime', () => {
  it('日時を "YYYY年MM月DD日 HH:mm" 形式にフォーマットする', () => {
    const date = new Date('2026-06-12T14:30:00');
    const result = formatAbsoluteDateTime(date);
    // ローカル時刻依存のため年・月・日・時・分がすべて含まれることを確認する
    expect(result).toMatch(/^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}$/);
  });

  it('1桁の月・日・時・分はゼロパディングされる', () => {
    // UTC ±0 環境でもゼロパディングを確認するため、明示的にローカル時刻を生成
    const date = new Date(2026, 0, 5, 9, 3); // 2026-01-05 09:03
    const result = formatAbsoluteDateTime(date);
    expect(result).toBe('2026年01月05日 09:03');
  });
});
