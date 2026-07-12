/**
 * @module components/common/DateTimeField
 * 日付+時刻を選択する共通フィールド。Web の `<input type="datetime-local">` に対応する。
 * Android は DateTimePickerAndroid の日付→時刻ダイアログを連鎖して呼び出し、
 * iOS はインラインスピナーを開閉して選択する（1 ステップで日時を選べるため）。
 * 元々イベント開始・終了日時専用の components/events/EventDateTimeField として実装されていたが、
 * 予約投稿・手入れログでも同じ日時選択方式が必要になったため components/common に一般化した。
 * components/common/DatePickerField（日付のみ）とは用途が異なる別コンポーネント。
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  colorActionPrimary,
  colorSurfaceMuted,
  spacing2,
  spacing3,
  radiusMd,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FIELD_HEIGHT = 48;
const CLEAR_BUTTON_SIZE = 44;
const CLEAR_ICON_SIZE = 18;
const CALENDAR_ICON_SIZE = 18;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function formatDateTimeLabel(date: Date): string {
  const datePart = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} ${timePart}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type DateTimeFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  clearAccessibilityLabel?: string;
  placeholder?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateTimeField({
  label,
  value,
  onChange,
  disabled = false,
  minimumDate,
  maximumDate,
  clearAccessibilityLabel = '日時を削除',
  placeholder = '日時を選択',
}: DateTimeFieldProps) {
  const [isIosPickerOpen, setIsIosPickerOpen] = useState(false);

  const hasValue = value !== null;
  // value が変わらない限り同一の Date 参照を保つ（useCallback の依存を安定させるため）
  const currentDate = useMemo(() => (value !== null ? new Date(value) : new Date()), [value]);

  const openAndroidPicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: currentDate,
      mode: 'date',
      minimumDate,
      maximumDate,
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== 'set' || selectedDate === undefined) return;
        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== 'set' || selectedTime === undefined) return;
            onChange(selectedTime.toISOString());
          },
        });
      },
    });
  }, [currentDate, minimumDate, maximumDate, onChange]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      openAndroidPicker();
      return;
    }
    setIsIosPickerOpen((prev) => !prev);
  }, [disabled, openAndroidPicker]);

  const handleIosChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      if (selectedDate !== undefined) {
        onChange(selectedDate.toISOString());
      }
    },
    [onChange]
  );

  const handleIosDone = useCallback(() => {
    setIsIosPickerOpen(false);
  }, []);

  const handleClear = useCallback(() => {
    onChange(null);
    setIsIosPickerOpen(false);
  }, [onChange]);

  const accessibilityLabel = hasValue
    ? `${label}：${formatDateTimeLabel(currentDate)}`
    : `${label}：${placeholder}`;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.field, disabled && styles.fieldDisabled]}
          onPress={handlePress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled }}
        >
          <Text
            style={[styles.fieldText, !hasValue && styles.placeholderText]}
            numberOfLines={1}
          >
            {hasValue ? formatDateTimeLabel(currentDate) : placeholder}
          </Text>
          <Ionicons
            name="calendar-outline"
            size={CALENDAR_ICON_SIZE}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        {hasValue && (
          <Pressable
            style={styles.clearButton}
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel={clearAccessibilityLabel}
            disabled={disabled}
            hitSlop={HIT_SLOP}
          >
            <Ionicons name="close-circle" size={CLEAR_ICON_SIZE} color={colorTextSecondary} />
          </Pressable>
        )}
      </View>

      {/* iOS はインラインスピナーで日時を選択する。Android はネイティブダイアログのため不要 */}
      {Platform.OS === 'ios' && isIosPickerOpen && (
        <View style={styles.iosPickerWrapper}>
          <RNDateTimePicker
            value={currentDate}
            mode="datetime"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleIosChange}
          />
          <Pressable
            style={styles.iosDoneButton}
            onPress={handleIosDone}
            accessibilityRole="button"
            accessibilityLabel={`${label}の選択を完了`}
            hitSlop={HIT_SLOP}
          >
            <Text style={styles.iosDoneButtonText}>完了</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing2,
  },
  label: {
    ...textBase,
    color: colorTextPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: FIELD_HEIGHT,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    backgroundColor: colorBackground,
  },
  fieldDisabled: {
    backgroundColor: colorSurfaceMuted,
    opacity: 0.7,
  },
  fieldText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colorTextTertiary,
  },
  clearButton: {
    width: CLEAR_BUTTON_SIZE,
    height: CLEAR_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosPickerWrapper: {
    alignItems: 'flex-end',
  },
  iosDoneButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing3,
  },
  iosDoneButtonText: {
    ...textSm,
    color: colorActionPrimary,
    fontWeight: '600',
  },
});
