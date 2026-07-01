/**
 * @module components/messages/MessageDateSeparator
 * メッセージ一覧で日付が変わるときに挿入するセパレータ行。
 * Web の「yyyy年M月d日」の丸バッジを RN に移植。
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colorSurfaceMuted,
  colorTextSecondary,
  spacing2,
  spacing4,
  radiusFull,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 日付フォーマット
// ---------------------------------------------------------------------------

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const today = new Date();

  if (
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    day === today.getDate()
  ) {
    return '今日';
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (
    year === yesterday.getFullYear() &&
    month === yesterday.getMonth() + 1 &&
    day === yesterday.getDate()
  ) {
    return '昨日';
  }

  return `${year}年${month}月${day}日`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type MessageDateSeparatorProps = {
  /** ISO 8601 形式の日時文字列（その日の最初のメッセージの createdAt） */
  dateStr: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageDateSeparator({ dateStr }: MessageDateSeparatorProps) {
  const label = formatDateLabel(dateStr);

  return (
    <View style={styles.container} accessibilityElementsHidden>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing4,
    paddingHorizontal: spacing4,
  },
  label: {
    ...textXs,
    color: colorTextSecondary,
    backgroundColor: colorSurfaceMuted,
    paddingHorizontal: spacing2,
    paddingVertical: spacing2,
    borderRadius: radiusFull,
    overflow: 'hidden',
  },
});
