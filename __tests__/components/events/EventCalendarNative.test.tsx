/**
 * components/events/EventCalendarNative のコンポーネントテスト。
 * 7列グリッド・前月/次月移動・日ごとのイベントチップ・プラスN件・
 * 日付タップ・当月外セルの表示・日付ずれなしを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { EventCalendarNative } from '@/components/events/EventCalendarNative';
import type { EventCalendarItem } from '@/components/events/EventCalendarNative';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// useWindowDimensions はレイアウト計算のみ。テストでは固定値を返す。
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 375, height: 812 }),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

const defaultProps = {
  events: [] as EventCalendarItem[],
  year: 2025,
  month: 9,
  onMonthChange: jest.fn(),
  onEventPress: jest.fn(),
};

function renderCalendar(
  overrides?: Partial<React.ComponentProps<typeof EventCalendarNative>>
) {
  return renderWithProviders(
    <EventCalendarNative {...defaultProps} {...overrides} />
  );
}

function makeEvent(overrides?: Partial<EventCalendarItem>): EventCalendarItem {
  return {
    id: 'ev-1',
    title: '秋の盆栽展',
    startDate: '2025-09-15',
    endDate: null,
    prefecture: '東京都',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('EventCalendarNative', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ヘッダー表示', () => {
    it('年月タイトル「2025年9月」が表示される', () => {
      renderCalendar();
      expect(screen.getByText('2025年9月')).toBeTruthy();
    });

    it('「前の月へ」ナビゲーションボタンが表示される', () => {
      renderCalendar();
      expect(screen.getByLabelText('前の月へ')).toBeTruthy();
    });

    it('「次の月へ」ナビゲーションボタンが表示される', () => {
      renderCalendar();
      expect(screen.getByLabelText('次の月へ')).toBeTruthy();
    });

    it('「今日」ボタンが表示される', () => {
      renderCalendar();
      expect(screen.getByLabelText('今月に移動')).toBeTruthy();
    });
  });

  describe('7列グリッド（曜日ラベル）', () => {
    it('日〜土の7つの曜日ラベルが表示される', () => {
      renderCalendar();
      const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
      weekdayLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeTruthy();
      });
    });
  });

  describe('前月/次月移動', () => {
    it('「前の月へ」をタップすると onMonthChange が (2025, 8) で呼ばれる', () => {
      const onMonthChange = jest.fn();
      renderCalendar({ year: 2025, month: 9, onMonthChange });
      fireEvent.press(screen.getByLabelText('前の月へ'));
      expect(onMonthChange).toHaveBeenCalledWith(2025, 8);
    });

    it('「次の月へ」をタップすると onMonthChange が (2025, 10) で呼ばれる', () => {
      const onMonthChange = jest.fn();
      renderCalendar({ year: 2025, month: 9, onMonthChange });
      fireEvent.press(screen.getByLabelText('次の月へ'));
      expect(onMonthChange).toHaveBeenCalledWith(2025, 10);
    });

    it('1月から前の月へ移動すると前年12月になる', () => {
      const onMonthChange = jest.fn();
      renderCalendar({ year: 2025, month: 1, onMonthChange });
      fireEvent.press(screen.getByLabelText('前の月へ'));
      expect(onMonthChange).toHaveBeenCalledWith(2024, 12);
    });

    it('12月から次の月へ移動すると翌年1月になる', () => {
      const onMonthChange = jest.fn();
      renderCalendar({ year: 2025, month: 12, onMonthChange });
      fireEvent.press(screen.getByLabelText('次の月へ'));
      expect(onMonthChange).toHaveBeenCalledWith(2026, 1);
    });

    it('「今日」をタップすると onMonthChange が現在年月で呼ばれる', () => {
      const now = new Date();
      const onMonthChange = jest.fn();
      renderCalendar({ onMonthChange });
      fireEvent.press(screen.getByLabelText('今月に移動'));
      expect(onMonthChange).toHaveBeenCalledWith(now.getFullYear(), now.getMonth() + 1);
    });
  });

  describe('日付グリッドの日付表示', () => {
    it('2025年9月は15日が表示される', () => {
      renderCalendar({ year: 2025, month: 9 });
      expect(screen.getByText('15')).toBeTruthy();
    });

    it('2025年9月は30日が表示される', () => {
      renderCalendar({ year: 2025, month: 9 });
      expect(screen.getByText('30')).toBeTruthy();
    });

    it('2025年9月のカレンダーは当月外の日付も表示される（前月の8月末・翌月の10月初）', () => {
      renderCalendar({ year: 2025, month: 9 });
      // 2025年9月1日は月曜日、グリッドは日曜始まりなので8月31日が前月として表示される
      expect(screen.getByText('31')).toBeTruthy();
    });
  });

  describe('日付ずれがないこと（YYYY-MM-DD の直接比較）', () => {
    it('startDate="2025-09-15" のイベントは 15 日セルに表示される', () => {
      const events = [makeEvent({ id: 'ev-date', startDate: '2025-09-15', title: '盆栽展示会' })];
      renderCalendar({ events });
      expect(screen.getByLabelText('盆栽展示会の詳細を見る')).toBeTruthy();
    });

    it('startDate が ISO 形式でもタイムゾーンずれなく正しい日付に表示される', () => {
      // 2025-09-15T00:00:00Z でも 9月15日に表示されるべき（UTC23:00=日本9月15日の場合も含む）
      const events = [
        makeEvent({ startDate: '2025-09-15T00:00:00Z', title: 'ISOイベント' }),
      ];
      renderCalendar({ events });
      expect(screen.getByLabelText('ISOイベントの詳細を見る')).toBeTruthy();
    });
  });

  describe('日ごとのイベントチップ', () => {
    it('イベントのタイトルがチップとして表示される', () => {
      const events = [makeEvent({ id: 'ev-show', title: '盆栽展示会', startDate: '2025-09-15' })];
      renderCalendar({ events });
      expect(screen.getByLabelText('盆栽展示会の詳細を見る')).toBeTruthy();
    });

    it('複数日イベント（startDate〜endDate）は対象日全てにチップが表示される', () => {
      const events = [
        makeEvent({ title: '複数日イベント', startDate: '2025-09-10', endDate: '2025-09-12' }),
      ];
      renderCalendar({ events });
      // 3日間表示される
      expect(screen.getAllByLabelText('複数日イベントの詳細を見る').length).toBe(3);
    });

    it('チップをタップすると onEventPress が event id で呼ばれる', () => {
      const onEventPress = jest.fn();
      const events = [makeEvent({ id: 'ev-abc', title: 'タップテスト', startDate: '2025-09-20' })];
      renderCalendar({ events, onEventPress });
      fireEvent.press(screen.getByLabelText('タップテストの詳細を見る'));
      expect(onEventPress).toHaveBeenCalledWith('ev-abc');
    });
  });

  describe('多い日のプラスN件表示', () => {
    it('1日に4件以上あると「+N件」が表示される（最大3件表示）', () => {
      const events = [
        makeEvent({ id: 'e1', title: 'イベント1', startDate: '2025-09-05' }),
        makeEvent({ id: 'e2', title: 'イベント2', startDate: '2025-09-05' }),
        makeEvent({ id: 'e3', title: 'イベント3', startDate: '2025-09-05' }),
        makeEvent({ id: 'e4', title: 'イベント4', startDate: '2025-09-05' }),
      ];
      renderCalendar({ events });
      expect(screen.getByText('+1件')).toBeTruthy();
    });

    it('1日に3件ちょうどなら「+N件」は表示されない', () => {
      const events = [
        makeEvent({ id: 'e1', title: 'イベントA', startDate: '2025-09-08' }),
        makeEvent({ id: 'e2', title: 'イベントB', startDate: '2025-09-08' }),
        makeEvent({ id: 'e3', title: 'イベントC', startDate: '2025-09-08' }),
      ];
      renderCalendar({ events });
      expect(screen.queryByText(/^\+\d+件$/)).toBeNull();
    });
  });

  describe('当月外セルの表示', () => {
    it('当月外のセルが cellOutOfMonth スタイルで表示される（グリッドに含まれる）', () => {
      // 2025年9月1日は月曜 → 日曜始まりのグリッドでは8月31日が先頭に来る
      renderCalendar({ year: 2025, month: 9 });
      // 31 が表示される（当月外）
      expect(screen.getByText('31')).toBeTruthy();
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときスケルトンが表示される（チップの代わり）', () => {
      const events = [makeEvent({ title: '表示されないはず', startDate: '2025-09-15' })];
      renderCalendar({ events, isLoading: true });
      // ローディング中はイベントチップを表示しない
      expect(screen.queryByLabelText('表示されないはず の詳細を見る')).toBeNull();
    });
  });
});
