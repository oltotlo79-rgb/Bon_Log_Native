/**
 * @module components/common/DatePickerField
 * 日付のみ（時刻なし）を選択する共通フィールド。Web の `<input type="date">` に対応する。
 * Android は DateTimePickerAndroid のネイティブダイアログ（date モード単体）、
 * iOS はインラインスピナーを開閉して選択する（components/common/DateTimeField と同じ設計）。
 * 値は "YYYY-MM-DD" のタイムゾーンに依存しないカレンダー日付文字列として保持する
 * （Date#toISOString() は UTC 変換で日付がずれ得るため使用しない）。
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

/** "YYYY-MM-DD" 文字列をローカル日付として Date に変換する（不正な形式は null）。 */
function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match === null) return null;
  const [, yStr, mStr, dStr] = match;
  if (yStr === undefined || mStr === undefined || dStr === undefined) return null;
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const date = new Date(y, m - 1, d);
  // 2月31日等の繰り上がりを無効値として扱う
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/** Date のローカル年月日から "YYYY-MM-DD" を構築する（UTC 変換を経ないため日付がずれない）。 */
function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type DatePickerFieldProps = {
  /** フィールドラベル。空文字を渡すと内蔵ラベルを描画しない（呼び出し側で独自にラベルを描画する場合用）。 */
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

export function DatePickerField({
  label,
  value,
  onChange,
  disabled = false,
  minimumDate,
  maximumDate,
  clearAccessibilityLabel = '日付を削除',
  placeholder = '日付を選択',
}: DatePickerFieldProps) {
  const [isIosPickerOpen, setIsIosPickerOpen] = useState(false);

  const hasValue = value !== null;
  // value が変わらない限り同一の Date 参照を保つ（useCallback の依存を安定させるため）
  const currentDate = useMemo(() => (value !== null ? parseDateOnly(value) ?? new Date() : new Date()), [value]);

  const openAndroidPicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: currentDate,
      mode: 'date',
      minimumDate,
      maximumDate,
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== 'set' || selectedDate === undefined) return;
        onChange(formatDateOnly(selectedDate));
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
        onChange(formatDateOnly(selectedDate));
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
    ? `${label.length > 0 ? label : placeholder}：${formatDateLabel(currentDate)}`
    : `${label.length > 0 ? label : placeholder}：${placeholder}`;

  return (
    <View style={styles.wrapper}>
      {label.length > 0 && <Text style={styles.label}>{label}</Text>}

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
            {hasValue ? formatDateLabel(currentDate) : placeholder}
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

      {/* iOS はインラインスピナーで日付を選択する。Android はネイティブダイアログのため不要 */}
      {Platform.OS === 'ios' && isIosPickerOpen && (
        <View style={styles.iosPickerWrapper}>
          <RNDateTimePicker
            value={currentDate}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleIosChange}
          />
          <Pressable
            style={styles.iosDoneButton}
            onPress={handleIosDone}
            accessibilityRole="button"
            accessibilityLabel={`${label.length > 0 ? label : placeholder}の選択を完了`}
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
