/**
 * @module components/events/EventCard
 * イベント一覧の各行に表示するカード。
 * Web 版 EventCard の表示要素（バッジ・city・終了判定）を移植。
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
  colorActionPrimaryText,
  colorSurfaceMuted,
  colorSuccess,
  colorSuccessBg,
  spacing2,
  spacing3,
  spacing4,
  radiusLg,
  radiusFull,
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
const BADGE_GAP = 4;

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

function formatEndDateShort(endDateStr: string): string {
  const d = new Date(endDateStr);
  return `〜${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type EventCardProps = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  venue?: string | null;
  prefecture?: string | null;
  city?: string | null;
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
  endDate,
  venue,
  prefecture,
  city,
  admissionFee,
  hasSales,
  onPress,
}: EventCardProps) {
  const { month, day, weekday } = formatEventDate(startDate);

  const now = new Date();
  const start = new Date(startDate);
  const end = endDate != null ? new Date(endDate) : null;

  const isEnded = end != null ? end < now : start < now;
  // 終了日がない単日イベントは「開催中」にしない（Web 版と同じ判定）
  const isOngoing = !isEnded && start <= now && end != null && end >= now;

  // Web (components/event/EventCard.tsx) と同じ区切り: 「都道府県 市区町村 / 会場」
  const hasAdmissionFee = admissionFee != null && admissionFee.length > 0;
  let locationText = prefecture ?? '';
  if (city != null && city.length > 0) locationText += ` ${city}`;
  if (venue != null && venue.length > 0) locationText += ` / ${venue}`;

  const hasBadge = hasAdmissionFee || hasSales || isEnded || isOngoing;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isEnded && styles.cardEnded,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}の詳細を見る`}
    >
      {/* 日付ブロック */}
      <View style={styles.dateBlock}>
        <Text style={styles.dateMonth}>{month}</Text>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateWeekday}>（{weekday}）</Text>
        {end != null && !isEnded && (
          <Text style={styles.dateEndShort}>{formatEndDateShort(endDate ?? '')}</Text>
        )}
      </View>

      {/* 情報エリア */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>

        {locationText.length > 0 && (
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
          </View>
        )}

        {hasBadge && (
          <View style={styles.badgeRow}>
            {hasAdmissionFee && (
              <View style={styles.badgeAdmission}>
                <Text style={styles.badgeAdmissionText}>{admissionFee}</Text>
              </View>
            )}
            {hasSales && (
              <View style={styles.badgeSales}>
                <Text style={styles.badgeSalesText}>即売あり</Text>
              </View>
            )}
            {isEnded && (
              <View style={styles.badgeEnded}>
                <Text style={styles.badgeEndedText}>終了</Text>
              </View>
            )}
            {isOngoing && (
              <View style={styles.badgeOngoing}>
                <Text style={styles.badgeOngoingText}>開催中</Text>
              </View>
            )}
          </View>
        )}
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
    alignItems: 'flex-start',
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
  cardEnded: {
    opacity: 0.6,
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
    paddingTop: spacing2,
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
  dateEndShort: {
    ...textXs,
    color: colorTextTertiary,
    marginTop: 2,
  },
  info: {
    flex: 1,
    gap: spacing2,
    paddingTop: spacing2,
  },
  title: {
    ...textMd,
    fontWeight: '600',
    color: colorTextPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BADGE_GAP,
  },
  locationText: {
    ...textXs,
    color: colorTextTertiary,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BADGE_GAP,
    marginTop: spacing2,
  },
  badgeAdmission: {
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
  },
  badgeAdmissionText: {
    ...textXs,
    color: colorTextPrimary,
  },
  badgeEnded: {
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
  },
  badgeEndedText: {
    ...textXs,
    color: colorTextTertiary,
  },
  badgeOngoing: {
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusFull,
    backgroundColor: colorSuccessBg,
  },
  badgeOngoingText: {
    ...textXs,
    color: colorSuccess,
  },
  badgeSales: {
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
  },
  badgeSalesText: {
    ...textXs,
    color: colorActionPrimaryText,
  },
});
