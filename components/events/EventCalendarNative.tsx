/**
 * @module components/events/EventCalendarNative
 * Web 版 EventCalendar を React Native に移植した月グリッドカレンダー。
 * 日付ずれ対策: ISO 文字列の先頭 10 文字（YYYY-MM-DD）を直接比較し、
 * new Date() によるタイムゾーン変換を経由しない（Web 版 getDateString と同一方針）。
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorderLight,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  radiusSm,
  radiusFull,
  textSm,
  textXs,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CALENDAR_EVENTS_PER_DAY = 3;
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;
const DAY_CIRCLE_SIZE = 28;
const CHIP_HEIGHT = 18;
const NAV_BUTTON_SIZE = 44;
const TODAY_BUTTON_MIN_WIDTH = 48;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type EventCalendarItem = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  prefecture?: string | null;
};

type EventCalendarNativeProps = {
  events: EventCalendarItem[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onEventPress: (eventId: string) => void;
  isLoading?: boolean;
};

// ---------------------------------------------------------------------------
// 日付計算ユーティリティ
// ---------------------------------------------------------------------------

// ISO 文字列の先頭 10 文字を取り出して YYYY-MM-DD にする。
// UTC に変換せず文字列レベルで処理することでタイムゾーンずれを防ぐ。
function getDateString(isoOrYmd: string): string {
  const slice = isoOrYmd.slice(0, 10);
  // 基本形式チェック: "YYYY-MM-DD" の長さと '-' 位置を確認する
  if (slice.length === 10 && slice[4] === '-' && slice[7] === '-') {
    return slice;
  }
  // フォールバック: Date 経由でローカル日付を取得（ここには来ないはずだが保険）
  const d = new Date(isoOrYmd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ローカル時刻の Date から YYYY-MM-DD を生成する（グリッドセルの日付を文字列化する用途）。
// toISOString() は UTC 変換するので使わない。
function localDateToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 指定年月のカレンダーグリッドに並べる日付配列を返す（日曜始まり）。
function buildCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month - 1 + 1, 0);

  // 日曜始まりで補完する先頭の日付
  const startDow = firstDay.getDay(); // 0=日, 6=土
  const calStart = new Date(firstDay);
  calStart.setDate(firstDay.getDate() - startDow);

  // 末尾は週末（土曜）まで補完
  const endDow = lastDay.getDay();
  const calEnd = new Date(lastDay);
  calEnd.setDate(lastDay.getDate() + (6 - endDow));

  const days: Date[] = [];
  const cursor = new Date(calStart);
  while (cursor <= calEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// 今日の YYYY-MM-DD をローカル時刻で生成する。
function todayYmd(): string {
  return localDateToYmd(new Date());
}

// ---------------------------------------------------------------------------
// EventCalendarChip
// ---------------------------------------------------------------------------

type EventCalendarChipProps = {
  title: string;
  onPress: () => void;
};

const EventCalendarChip = React.memo(function EventCalendarChip({
  title,
  onPress,
}: EventCalendarChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}の詳細を見る`}
      hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
    >
      <Text style={styles.chipText} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// EventCalendarDayCell
// ---------------------------------------------------------------------------

type DayCellProps = {
  date: Date;
  ymd: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  cellEvents: EventCalendarItem[];
  onEventPress: (id: string) => void;
  cellWidth: number;
  isLoading: boolean;
};

const EventCalendarDayCell = React.memo(function EventCalendarDayCell({
  date,
  ymd,
  isCurrentMonth,
  isToday,
  cellEvents,
  onEventPress,
  cellWidth,
  isLoading,
}: DayCellProps) {
  const dayOfWeek = date.getDay();
  const visibleEvents = cellEvents.slice(0, CALENDAR_EVENTS_PER_DAY);
  const extraCount = cellEvents.length - CALENDAR_EVENTS_PER_DAY;

  const dateNumberColor =
    isToday
      ? colorActionPrimaryText
      : !isCurrentMonth || dayOfWeek === 0 || dayOfWeek === 6
      ? colorTextTertiary
      : colorTextPrimary;

  return (
    <View
      style={[
        styles.cell,
        { width: cellWidth },
        !isCurrentMonth && styles.cellOutOfMonth,
      ]}
    >
      {/* 日付数字 */}
      <View style={[styles.dayCircleWrap, isToday && styles.dayCircleToday]}>
        <Text style={[styles.dayNumber, { color: dateNumberColor }]}>
          {date.getDate()}
        </Text>
      </View>

      {/* イベントチップ or スケルトン */}
      <View style={styles.chipsArea}>
        {isLoading ? (
          <>
            <View style={styles.chipSkeleton} />
            <View style={[styles.chipSkeleton, styles.chipSkeletonShort]} />
          </>
        ) : (
          <>
            {visibleEvents.map((ev) => (
              <EventCalendarChip
                key={`${ymd}-${ev.id}`}
                title={ev.title}
                onPress={() => onEventPress(ev.id)}
              />
            ))}
            {extraCount > 0 && (
              <Text style={styles.extraCount}>+{extraCount}件</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// EventCalendarNative
// ---------------------------------------------------------------------------

export function EventCalendarNative({
  events,
  year,
  month,
  onMonthChange,
  onEventPress,
  isLoading = false,
}: EventCalendarNativeProps) {
  const { width } = useWindowDimensions();
  // 7列に均等分割。paddingHorizontal spacing4 x2 を除く
  const cellWidth = Math.floor((width - spacing4 * 2) / 7);

  const calendarDays = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const todayStr = useMemo(() => todayYmd(), []);

  // 各イベントの startDate / endDate を YYYY-MM-DD に正規化してキャッシュする
  const normalizedEvents = useMemo(
    () =>
      events.map((ev) => ({
        ...ev,
        startYmd: getDateString(ev.startDate),
        endYmd: ev.endDate != null ? getDateString(ev.endDate) : getDateString(ev.startDate),
      })),
    [events]
  );

  // 日付ごとのイベント索引（Map で O(1) アクセス）
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventCalendarItem[]>();
    for (const day of calendarDays) {
      const dayYmd = localDateToYmd(day);
      const matched = normalizedEvents.filter(
        (ev) => dayYmd >= ev.startYmd && dayYmd <= ev.endYmd
      );
      if (matched.length > 0) {
        map.set(dayYmd, matched);
      }
    }
    return map;
  }, [calendarDays, normalizedEvents]);

  const handlePrevMonth = useCallback(() => {
    const d = new Date(year, month - 1 - 1, 1);
    onMonthChange(d.getFullYear(), d.getMonth() + 1);
  }, [year, month, onMonthChange]);

  const handleNextMonth = useCallback(() => {
    const d = new Date(year, month - 1 + 1, 1);
    onMonthChange(d.getFullYear(), d.getMonth() + 1);
  }, [year, month, onMonthChange]);

  const handleToday = useCallback(() => {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth() + 1);
  }, [onMonthChange]);

  // 行に分割（7列ずつ）
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable
          style={styles.navButton}
          onPress={handlePrevMonth}
          accessibilityRole="button"
          accessibilityLabel="前の月へ"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={colorTextPrimary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {year}年{month}月
          </Text>
          <Pressable
            style={styles.todayButton}
            onPress={handleToday}
            accessibilityRole="button"
            accessibilityLabel="今月に移動"
          >
            <Text style={styles.todayButtonText}>今日</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.navButton}
          onPress={handleNextMonth}
          accessibilityRole="button"
          accessibilityLabel="次の月へ"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colorTextPrimary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      </View>

      {/* 曜日ラベル行 */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={label} style={[styles.weekdayCell, { width: cellWidth }]}>
            <Text
              style={[
                styles.weekdayLabel,
                (index === 0 || index === 6) && styles.weekdayLabelWeekend,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 日付グリッド */}
      <ScrollView scrollEnabled={false}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day) => {
              const ymd = localDateToYmd(day);
              const isCurrentMonth = day.getMonth() + 1 === month && day.getFullYear() === year;
              const isTodayCell = ymd === todayStr;
              const cellEvents = eventsByDay.get(ymd) ?? [];

              return (
                <EventCalendarDayCell
                  key={ymd}
                  date={day}
                  ymd={ymd}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isTodayCell}
                  cellEvents={cellEvents}
                  onEventPress={onEventPress}
                  cellWidth={cellWidth}
                  isLoading={isLoading && isCurrentMonth}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusSm,
    overflow: 'hidden',
    marginHorizontal: spacing4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing2,
    paddingVertical: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    backgroundColor: colorSurfaceWashi,
  },
  navButton: {
    width: NAV_BUTTON_SIZE,
    height: NAV_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  todayButton: {
    minWidth: TODAY_BUTTON_MIN_WIDTH,
    minHeight: 32,
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusSm,
    paddingHorizontal: spacing3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorBackground,
  },
  todayButtonText: {
    ...textSm,
    color: colorTextPrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    backgroundColor: colorSurfaceWashi,
  },
  weekdayCell: {
    alignItems: 'center',
    paddingVertical: spacing2,
  },
  weekdayLabel: {
    ...textXs,
    color: colorTextSecondary,
    fontWeight: '500',
  },
  weekdayLabelWeekend: {
    color: colorTextTertiary,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  cell: {
    minHeight: 80,
    padding: spacing1,
    borderRightWidth: 1,
    borderRightColor: colorBorderLight,
  },
  cellOutOfMonth: {
    backgroundColor: colorSurfaceMuted,
  },
  dayCircleWrap: {
    width: DAY_CIRCLE_SIZE,
    height: DAY_CIRCLE_SIZE,
    borderRadius: radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing1,
  },
  dayCircleToday: {
    backgroundColor: colorActionPrimary,
  },
  dayNumber: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  chipsArea: {
    flex: 1,
    gap: 2,
  },
  chip: {
    height: CHIP_HEIGHT,
    backgroundColor: `${colorActionPrimary}1A`,
    borderRadius: 3,
    paddingHorizontal: spacing1,
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: `${colorActionPrimary}33`,
  },
  chipText: {
    fontSize: 9,
    lineHeight: 12,
    color: colorActionPrimary,
  },
  chipSkeleton: {
    height: CHIP_HEIGHT,
    backgroundColor: colorSurfaceMuted,
    borderRadius: 3,
    width: '90%',
  },
  chipSkeletonShort: {
    width: '60%',
  },
  extraCount: {
    ...textXs,
    color: colorTextTertiary,
    paddingHorizontal: spacing1,
  },
});
