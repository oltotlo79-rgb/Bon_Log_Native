/**
 * @module components/bonsai/DateField
 * 盆栽取得日・成長記録日用のテキスト入力方式日付フィールド。
 * profile-edit.md §7.5 の BirthdayField と同じアプローチを採用する。
 * datetimepicker 未導入のためテキスト入力方式で実装する。
 * 仕様: docs/design/bonsai.md §4.2 / §5.2
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  colorSurfaceMuted,
  spacing1,
  spacing2,
  spacing3,
  radiusMd,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const INPUT_HEIGHT = 48;
const CLEAR_BUTTON_SIZE = 44;
const CLEAR_ICON_SIZE = 18;
const YEAR_INPUT_WIDTH = 80;
const MONTH_INPUT_WIDTH = 56;
const DAY_INPUT_WIDTH = 56;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function parseISODate(dateStr: string): { year: string; month: string; day: string } | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (y === undefined || m === undefined || d === undefined) return null;
  return { year: y, month: String(parseInt(m, 10)), day: String(parseInt(d, 10)) };
}

function buildISODate(year: string, month: string, day: string): string | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type DateFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  clearAccessibilityLabel?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateField({
  label,
  value,
  onChange,
  disabled = false,
  clearAccessibilityLabel = '日付を削除',
}: DateFieldProps) {
  const parsed = value !== null ? parseISODate(value) : null;
  const yearValue = parsed?.year ?? '';
  const monthValue = parsed?.month ?? '';
  const dayValue = parsed?.day ?? '';

  const handleYearChange = useCallback(
    (text: string) => {
      const newYear = text.replace(/[^0-9]/g, '');
      if (newYear === '' && monthValue === '' && dayValue === '') {
        onChange(null);
        return;
      }
      const iso = buildISODate(newYear, monthValue || '1', dayValue || '1');
      if (iso !== null) {
        onChange(iso);
      } else if (newYear === '') {
        onChange(null);
      }
    },
    [monthValue, dayValue, onChange]
  );

  const handleMonthChange = useCallback(
    (text: string) => {
      const newMonth = text.replace(/[^0-9]/g, '');
      if (yearValue === '') return;
      const iso = buildISODate(yearValue, newMonth || '1', dayValue || '1');
      if (iso !== null) {
        onChange(iso);
      } else if (newMonth === '') {
        const iso2 = buildISODate(yearValue, '1', dayValue || '1');
        if (iso2 !== null) onChange(iso2);
      }
    },
    [yearValue, dayValue, onChange]
  );

  const handleDayChange = useCallback(
    (text: string) => {
      const newDay = text.replace(/[^0-9]/g, '');
      if (yearValue === '') return;
      const iso = buildISODate(yearValue, monthValue || '1', newDay || '1');
      if (iso !== null) {
        onChange(iso);
      }
    },
    [yearValue, monthValue, onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const hasValue = value !== null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.yearInput]}>
          <TextInput
            value={yearValue}
            onChangeText={handleYearChange}
            placeholder="年"
            placeholderTextColor={colorTextTertiary}
            keyboardType="number-pad"
            maxLength={4}
            editable={!disabled}
            style={[styles.input, disabled && styles.inputDisabled]}
            accessibilityLabel={`${label} 年`}
          />
        </View>
        <Text style={styles.unit}>年</Text>

        <View style={[styles.inputContainer, styles.monthInput]}>
          <TextInput
            value={monthValue}
            onChangeText={handleMonthChange}
            placeholder="月"
            placeholderTextColor={colorTextTertiary}
            keyboardType="number-pad"
            maxLength={2}
            editable={!disabled && yearValue !== ''}
            style={[
              styles.input,
              (disabled || yearValue === '') && styles.inputDisabled,
            ]}
            accessibilityLabel={`${label} 月`}
          />
        </View>
        <Text style={styles.unit}>月</Text>

        <View style={[styles.inputContainer, styles.dayInput]}>
          <TextInput
            value={dayValue}
            onChangeText={handleDayChange}
            placeholder="日"
            placeholderTextColor={colorTextTertiary}
            keyboardType="number-pad"
            maxLength={2}
            editable={!disabled && yearValue !== ''}
            style={[
              styles.input,
              (disabled || yearValue === '') && styles.inputDisabled,
            ]}
            accessibilityLabel={`${label} 日`}
          />
        </View>
        <Text style={styles.unit}>日</Text>

        {hasValue && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel={clearAccessibilityLabel}
            disabled={disabled}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close-circle"
              size={CLEAR_ICON_SIZE}
              color={colorTextSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
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
    flexWrap: 'wrap',
  },
  inputContainer: {
    height: INPUT_HEIGHT,
  },
  yearInput: {
    width: YEAR_INPUT_WIDTH,
  },
  monthInput: {
    width: MONTH_INPUT_WIDTH,
  },
  dayInput: {
    width: DAY_INPUT_WIDTH,
  },
  input: {
    height: '100%',
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
    textAlign: 'center',
  },
  inputDisabled: {
    backgroundColor: colorSurfaceMuted,
    opacity: 0.5,
  },
  unit: {
    ...textBase,
    color: colorTextSecondary,
  },
  clearButton: {
    width: CLEAR_BUTTON_SIZE,
    height: CLEAR_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...textSm,
    color: colorTextPrimary,
    marginTop: spacing1,
  },
});
