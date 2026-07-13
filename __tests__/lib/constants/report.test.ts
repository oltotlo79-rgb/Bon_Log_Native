/**
 * lib/constants/report のユニットテスト。
 * REPORT_TARGET_TYPES（6種）・REPORT_TARGET_LABELS（6種・値一致）・
 * REPORT_REASONS / REPORT_REASON_LABELS（Web 整合後の値）・REPORT_DESCRIPTION_MAX_LENGTH を検証する。
 */

import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_TARGET_TYPES,
  REPORT_TARGET_LABELS,
  REPORT_DESCRIPTION_MAX_LENGTH,
} from '@/lib/constants/report';

describe('REPORT_REASONS / REPORT_REASON_LABELS', () => {
  it('5 種の通報理由を持つ', () => {
    expect(REPORT_REASONS).toHaveLength(5);
  });

  it('期待する理由をすべて含む', () => {
    expect(REPORT_REASONS).toEqual(['spam', 'inappropriate', 'harassment', 'copyright', 'other']);
  });

  it('重複する理由がない', () => {
    const unique = new Set(REPORT_REASONS);
    expect(unique.size).toBe(REPORT_REASONS.length);
  });

  it('すべての REPORT_REASONS に対応するラベルを持つ', () => {
    REPORT_REASONS.forEach((reason) => {
      expect(REPORT_REASON_LABELS[reason]).toBeDefined();
      expect(typeof REPORT_REASON_LABELS[reason]).toBe('string');
      expect(REPORT_REASON_LABELS[reason].length).toBeGreaterThan(0);
    });
  });

  it('Web 整合後のラベル値を持つ（df1c398）', () => {
    expect(REPORT_REASON_LABELS.spam).toBe('スパム');
    expect(REPORT_REASON_LABELS.inappropriate).toBe('不適切な内容');
    expect(REPORT_REASON_LABELS.harassment).toBe('誹謗中傷');
    expect(REPORT_REASON_LABELS.copyright).toBe('著作権侵害');
    expect(REPORT_REASON_LABELS.other).toBe('その他');
  });

  it('REPORT_REASONS と同じ 5 キーちょうどを持つ（余剰・不足がない）', () => {
    const labelKeys = Object.keys(REPORT_REASON_LABELS);
    expect(labelKeys).toHaveLength(REPORT_REASONS.length);
    REPORT_REASONS.forEach((reason) => {
      expect(labelKeys).toContain(reason);
    });
  });
});

describe('REPORT_TARGET_TYPES / REPORT_TARGET_LABELS', () => {
  it('6 種の通報対象種別を持つ', () => {
    expect(REPORT_TARGET_TYPES).toHaveLength(6);
  });

  it('期待する対象種別をすべて含む（post/comment/event/shop/review/user）', () => {
    expect(REPORT_TARGET_TYPES).toEqual(['post', 'comment', 'event', 'shop', 'review', 'user']);
  });

  it('重複する対象種別がない', () => {
    const unique = new Set(REPORT_TARGET_TYPES);
    expect(unique.size).toBe(REPORT_TARGET_TYPES.length);
  });

  it('すべての REPORT_TARGET_TYPES に対応するラベルを持つ', () => {
    REPORT_TARGET_TYPES.forEach((type) => {
      expect(REPORT_TARGET_LABELS[type]).toBeDefined();
      expect(typeof REPORT_TARGET_LABELS[type]).toBe('string');
      expect(REPORT_TARGET_LABELS[type].length).toBeGreaterThan(0);
    });
  });

  it('Web 整合の対象種別ラベル値を持つ（df1c398）', () => {
    expect(REPORT_TARGET_LABELS.post).toBe('投稿');
    expect(REPORT_TARGET_LABELS.comment).toBe('コメント');
    expect(REPORT_TARGET_LABELS.event).toBe('イベント');
    expect(REPORT_TARGET_LABELS.shop).toBe('盆栽園');
    expect(REPORT_TARGET_LABELS.review).toBe('レビュー');
    expect(REPORT_TARGET_LABELS.user).toBe('ユーザー');
  });

  it('REPORT_TARGET_TYPES と同じ 6 キーちょうどを持つ（余剰・不足がない）', () => {
    const labelKeys = Object.keys(REPORT_TARGET_LABELS);
    expect(labelKeys).toHaveLength(REPORT_TARGET_TYPES.length);
    REPORT_TARGET_TYPES.forEach((type) => {
      expect(labelKeys).toContain(type);
    });
  });
});

describe('REPORT_DESCRIPTION_MAX_LENGTH', () => {
  it('1000 文字である（OpenAPI: description maxLength）', () => {
    expect(REPORT_DESCRIPTION_MAX_LENGTH).toBe(1000);
  });
});
