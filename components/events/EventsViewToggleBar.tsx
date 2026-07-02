/**
 * @module components/events/EventsViewToggleBar
 * カレンダー / リスト 切り替えボタン + 終了イベント表示トグル。
 * Web 版 events/page.tsx のビュー切り替え行を RN に移植。
 */

import React from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorSurfaceWashi,
  colorBorderLight,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  spacing2,
  spacing3,
  spacing4,
  radiusSm,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type EventViewMode = 'calendar' | 'list';

type EventsViewToggleBarProps = {
  viewMode: EventViewMode;
  showPast: boolean;
  onViewModeChange: (mode: EventViewMode) => void;
  onShowPastChange: (value: boolean) => void;
};

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const TOGGLE_HEIGHT = 32;
const TOGGLE_MIN_WIDTH = 80;
const BAR_HEIGHT = 48;
const ICON_SIZE = 16;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventsViewToggleBar({
  viewMode,
  showPast,
  onViewModeChange,
  onShowPastChange,
}: EventsViewToggleBarProps) {
  const isCalendar = viewMode === 'calendar';
  const isList = viewMode === 'list';

  return (
    <View style={styles.bar}>
      {/* 左側: カレンダー / リスト ボタン */}
      <View style={styles.toggleGroup}>
        <Pressable
          style={[styles.toggleButton, isCalendar && styles.toggleButtonActive]}
          onPress={() => onViewModeChange('calendar')}
          accessibilityRole="radio"
          accessibilityState={{ selected: isCalendar }}
          accessibilityLabel="カレンダー表示"
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons
            name="calendar-outline"
            size={ICON_SIZE}
            color={isCalendar ? colorActionPrimaryText : colorActionSecondaryText}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={[styles.toggleText, isCalendar && styles.toggleTextActive]}>
            カレンダー
          </Text>
        </Pressable>

        <Pressable
          style={[styles.toggleButton, isList && styles.toggleButtonActive]}
          onPress={() => onViewModeChange('list')}
          accessibilityRole="radio"
          accessibilityState={{ selected: isList }}
          accessibilityLabel="リスト表示"
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons
            name="list-outline"
            size={ICON_SIZE}
            color={isList ? colorActionPrimaryText : colorActionSecondaryText}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={[styles.toggleText, isList && styles.toggleTextActive]}>
            リスト
          </Text>
        </Pressable>
      </View>

      {/* 右側: 終了も表示 Switch */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>終了も表示</Text>
        <Switch
          value={showPast}
          onValueChange={onShowPastChange}
          trackColor={{ false: colorActionSecondary, true: colorActionPrimary }}
          thumbColor={colorActionPrimaryText}
          accessibilityRole="switch"
          accessibilityLabel="終了したイベントも表示する"
          accessibilityState={{ checked: showPast }}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: spacing2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOGGLE_HEIGHT,
    minWidth: TOGGLE_MIN_WIDTH,
    paddingHorizontal: spacing3,
    borderRadius: radiusSm,
    backgroundColor: colorActionSecondary,
    gap: spacing2,
  },
  toggleButtonActive: {
    backgroundColor: colorActionPrimary,
  },
  toggleText: {
    ...textSm,
    color: colorActionSecondaryText,
  },
  toggleTextActive: {
    color: colorActionPrimaryText,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  switchLabel: {
    ...textSm,
    color: colorTextSecondary,
  },
});
