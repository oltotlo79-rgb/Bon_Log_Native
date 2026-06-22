/**
 * @module components/events/EventCard
 * イベント一覧の各行に表示するカード。
 * 仕様: docs/design/events.md §2.3
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  radiusLg,
  shadowWashi,
  textMd,
  textSm,
  textXl,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const DATE_BLOCK_WIDTH = 48;
const CHEVRON_SIZE = 16;
const LEFT_BORDER_WIDTH = 2;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function formatEventDate(dateStr: string): { month: string; day: string; weekday: string } {
  const date = new Date(dateStr);
  return {
    month: `${date.getMonth() + 1}月`,
    day: String(date.getDate()),
    weekday: WEEKDAY_LABELS[date.getDay()] ?? '',
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type EventCardProps = {
  id: string;
  title: string;
  startDate: string;
  venue?: string | null;
  prefecture?: string | null;
  admissionFee?: string | null;
  hasSales: boolean;
  onPress: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EventCardInner({
  title,
  startDate,
  venue,
  prefecture,
  admissionFee,
  hasSales,
  onPress,
}: EventCardProps) {
  const { month, day, weekday } = formatEventDate(startDate);

  const admissionText = admissionFee !== undefined && admissionFee !== null && admissionFee.length > 0
    ? admissionFee
    : hasSales
    ? '販売あり'
    : '無料';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}の詳細を見る`}
    >
      {/* 日付ブロック */}
      <View style={styles.dateBlock}>
        <Text style={styles.dateMonth}>{month}</Text>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateWeekday}>（{weekday}）</Text>
      </View>

      {/* 情報エリア */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {venue !== undefined && venue !== null && venue.length > 0 && (
          <Text style={styles.venue} numberOfLines={1}>{venue}</Text>
        )}
        {prefecture !== undefined && prefecture !== null && prefecture.length > 0 && (
          <Text style={styles.prefecture} numberOfLines={1}>{prefecture}</Text>
        )}
        <Text style={styles.admission}>{admissionText}</Text>
      </View>

      {/* 右端シェブロン */}
      <Ionicons
        name="chevron-forward"
        size={CHEVRON_SIZE}
        color={colorTextTertiary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

export const EventCard = React.memo(EventCardInner);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    marginBottom: spacing3,
    gap: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    ...shadowWashi,
  },
  cardPressed: {
    opacity: 0.85,
  },
  dateBlock: {
    width: DATE_BLOCK_WIDTH,
    alignItems: 'center',
    borderLeftWidth: LEFT_BORDER_WIDTH,
    borderLeftColor: colorActionPrimary,
    paddingLeft: spacing2,
    flexShrink: 0,
  },
  dateMonth: {
    ...textSm,
    color: colorTextSecondary,
  },
  dateDay: {
    ...textXl,
    color: colorTextPrimary,
  },
  dateWeekday: {
    ...textXs,
    color: colorTextTertiary,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...textMd,
    fontWeight: '600',
    color: colorTextPrimary,
  },
  venue: {
    ...textSm,
    color: colorTextSecondary,
  },
  prefecture: {
    ...textXs,
    color: colorTextTertiary,
  },
  admission: {
    ...textSm,
    color: colorTextSecondary,
  },
});
