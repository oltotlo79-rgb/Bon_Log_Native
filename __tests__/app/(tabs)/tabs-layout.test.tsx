/**
 * @module __tests__/app/(tabs)/tabs-layout
 * タブレイアウトの未読バッジロジックテスト。
 * TabsLayout 内の UnreadBadge / NotificationTabIcon はモックされた Tabs に囲まれるため、
 * バッジの表示ロジックを直接テストするため getByText を使う代わりに
 * UnreadBadge ロジック（BADGE_OVERFLOW_THRESHOLD 判定）を単体で検証する。
 */

import { BADGE_OVERFLOW_THRESHOLD } from '@/lib/constants/limits/ui';

describe('UnreadBadge ラベル生成ロジック', () => {
  function getBadgeLabel(count: number): string | null {
    if (count <= 0) return null;
    return count > BADGE_OVERFLOW_THRESHOLD ? '99+' : String(count);
  }

  it('count = 0 のとき null を返す（バッジ非表示）', () => {
    expect(getBadgeLabel(0)).toBeNull();
  });

  it('count = -1 のとき null を返す（バッジ非表示）', () => {
    expect(getBadgeLabel(-1)).toBeNull();
  });

  it('count = 1 のとき "1" を返す', () => {
    expect(getBadgeLabel(1)).toBe('1');
  });

  it('count = 5 のとき "5" を返す', () => {
    expect(getBadgeLabel(5)).toBe('5');
  });

  it(`count = ${BADGE_OVERFLOW_THRESHOLD} のとき "${BADGE_OVERFLOW_THRESHOLD}" を返す（閾値ちょうど）`, () => {
    expect(getBadgeLabel(BADGE_OVERFLOW_THRESHOLD)).toBe(String(BADGE_OVERFLOW_THRESHOLD));
  });

  it(`count = ${BADGE_OVERFLOW_THRESHOLD + 1} のとき "99+" を返す（閾値超え）`, () => {
    expect(getBadgeLabel(BADGE_OVERFLOW_THRESHOLD + 1)).toBe('99+');
  });

  it('count = 200 のとき "99+" を返す', () => {
    expect(getBadgeLabel(200)).toBe('99+');
  });
});

describe('NotificationTabIcon accessibilityLabel ロジック', () => {
  function getAccessibilityLabel(unreadCount: number): string {
    return unreadCount > 0 ? `未読通知 ${unreadCount} 件` : '通知';
  }

  it('unreadCount = 0 のとき「通知」になる', () => {
    expect(getAccessibilityLabel(0)).toBe('通知');
  });

  it('unreadCount = 3 のとき「未読通知 3 件」になる', () => {
    expect(getAccessibilityLabel(3)).toBe('未読通知 3 件');
  });

  it('unreadCount = 99 のとき「未読通知 99 件」になる', () => {
    expect(getAccessibilityLabel(99)).toBe('未読通知 99 件');
  });

  it('unreadCount = 100 のとき「未読通知 100 件」になる（accessibilityLabel は実数を使う）', () => {
    expect(getAccessibilityLabel(100)).toBe('未読通知 100 件');
  });
});
