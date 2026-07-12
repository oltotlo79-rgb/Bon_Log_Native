/**
 * @module components/profile/BonsaiHistoryField
 * プロフィール編集の「盆栽を始めた時期」フィールド（開始年 + 開始月の選択式コンポーネント）。
 * Web の `<select name="bonsaiStartYear">`（1900〜今年）・`<select name="bonsaiStartMonth">`（1〜12）
 * （components/user/ProfileEditForm.tsx）に一致させ、自由入力のテキストフィールドは提供しない。
 * 開始月は開始年が未選択の間は表示しない（Web にはこの制約はないが、既存のネイティブ UX を踏襲する）。
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Modal,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { USER_BONSAI_START_MIN_YEAR } from '@/lib/constants/limits/auth';
import {
  colorBackground,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorScrimLight,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  textBase,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FIELD_HEIGHT = 48;
const CLOSE_ICON_SIZE = 22;
const CLOSE_BUTTON_MIN_SIZE = 44;
const CHECK_ICON_SIZE = 18;
const ROW_MIN_HEIGHT = 48;
const CHEVRON_SIZE = 18;
const MONTHS: readonly number[] = Array.from({ length: 12 }, (_, i) => i + 1);

function buildYearOptions(): readonly number[] {
  const currentYear = new Date().getFullYear();
  const count = currentYear - USER_BONSAI_START_MIN_YEAR + 1;
  // 新しい年が先頭に来る降順（Web の <select> と同じ並び）
  return Array.from({ length: count }, (_, i) => currentYear - i);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type BonsaiHistoryFieldProps = {
  yearValue: string;
  monthValue: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// 単一選択リストモーダル（年・月で共用）
// ---------------------------------------------------------------------------

type RowItemProps = {
  value: number;
  label: string;
  isSelected: boolean;
  onPress: (value: number) => void;
};

const RowItem = React.memo(function RowItem({ value, label, isSelected, onPress }: RowItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(value)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>{label}</Text>
      {isSelected && (
        <Ionicons
          name="checkmark"
          size={CHECK_ICON_SIZE}
          color={colorActionPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
    </Pressable>
  );
});

type NumberPickerModalProps = {
  visible: boolean;
  title: string;
  options: readonly number[];
  selected: number | null;
  formatLabel: (value: number) => string;
  onSelect: (value: number) => void;
  onClose: () => void;
};

function NumberPickerModal({
  visible,
  title,
  options,
  selected,
  formatLabel,
  onSelect,
  onClose,
}: NumberPickerModalProps) {
  const insets = useSafeAreaInsets();

  const handlePress = useCallback(
    (value: number) => {
      onSelect(value);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<number>) => (
      <RowItem
        value={item}
        label={formatLabel(item)}
        isSelected={item === selected}
        onPress={handlePress}
      />
    ),
    [selected, formatLabel, handlePress]
  );

  const keyExtractor = useCallback((item: number) => String(item), []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="閉じる"
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="閉じる"
          >
            <Ionicons
              name="close"
              size={CLOSE_ICON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        </View>

        <FlatList
          data={options}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          accessibilityRole="list"
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={5}
        />
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BonsaiHistoryField({
  yearValue,
  monthValue,
  onYearChange,
  onMonthChange,
  disabled = false,
}: BonsaiHistoryFieldProps) {
  const [isYearModalVisible, setIsYearModalVisible] = useState(false);
  const [isMonthModalVisible, setIsMonthModalVisible] = useState(false);

  const yearOptions = useMemo(() => buildYearOptions(), []);
  const hasYear = yearValue !== '';
  const selectedYear = hasYear ? Number(yearValue) : null;
  const selectedMonth = monthValue !== '' ? Number(monthValue) : null;

  const handleOpenYear = useCallback(() => {
    if (disabled) return;
    setIsYearModalVisible(true);
  }, [disabled]);

  const handleOpenMonth = useCallback(() => {
    if (disabled || !hasYear) return;
    setIsMonthModalVisible(true);
  }, [disabled, hasYear]);

  const handleSelectYear = useCallback(
    (value: number) => onYearChange(String(value)),
    [onYearChange]
  );

  const handleSelectMonth = useCallback(
    (value: number) => onMonthChange(String(value)),
    [onMonthChange]
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>盆栽を始めた時期（任意）</Text>
      <View style={styles.fieldRow}>
        <Pressable
          style={[styles.field, styles.yearField, disabled && styles.fieldDisabled]}
          onPress={handleOpenYear}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={hasYear ? `開始年（任意）：${yearValue}年` : '開始年（任意）：年を選択'}
          accessibilityState={{ disabled }}
        >
          <Text style={[styles.fieldText, !hasYear && styles.placeholderText]} numberOfLines={1}>
            {hasYear ? `${yearValue}年` : '年を選択'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={CHEVRON_SIZE}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        {hasYear && (
          <Pressable
            style={[styles.field, styles.monthField, disabled && styles.fieldDisabled]}
            onPress={handleOpenMonth}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={
              selectedMonth !== null ? `開始月（任意）：${monthValue}月` : '開始月（任意）：月を選択'
            }
            accessibilityState={{ disabled }}
          >
            <Text
              style={[styles.fieldText, selectedMonth === null && styles.placeholderText]}
              numberOfLines={1}
            >
              {selectedMonth !== null ? `${monthValue}月` : '月を選択'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={CHEVRON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        )}
      </View>

      <NumberPickerModal
        visible={isYearModalVisible}
        title="開始年を選択"
        options={yearOptions}
        selected={selectedYear}
        formatLabel={(value) => `${value}年`}
        onSelect={handleSelectYear}
        onClose={() => setIsYearModalVisible(false)}
      />

      <NumberPickerModal
        visible={isMonthModalVisible}
        title="開始月を選択"
        options={MONTHS}
        selected={selectedMonth}
        formatLabel={(value) => `${value}月`}
        onSelect={handleSelectMonth}
        onClose={() => setIsMonthModalVisible(false)}
      />
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  field: {
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
  yearField: {
    flex: 1,
    minWidth: 140,
  },
  monthField: {
    flex: 1,
    minWidth: 110,
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
  backdrop: {
    flex: 1,
    backgroundColor: colorScrimLight,
  },
  sheet: {
    backgroundColor: colorBackground,
    borderTopLeftRadius: radiusMd,
    borderTopRightRadius: radiusMd,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    borderTopLeftRadius: radiusMd,
    borderTopRightRadius: radiusMd,
  },
  sheetTitle: {
    flex: 1,
    ...textLg,
    color: colorTextPrimary,
  },
  closeButton: {
    minWidth: CLOSE_BUTTON_MIN_SIZE,
    minHeight: CLOSE_BUTTON_MIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    minHeight: ROW_MIN_HEIGHT,
    backgroundColor: colorBackground,
  },
  rowPressed: {
    backgroundColor: colorBorderLight,
  },
  rowText: {
    flex: 1,
    ...textBase,
    color: colorTextPrimary,
  },
  rowTextSelected: {
    color: colorActionPrimary,
    fontWeight: '600',
  },
});
