/**
 * @module components/bonsai/TreeSpeciesField
 * マイ盆栽フォームの樹種選択フィールド（トリガー + グループ付きモーダル選択の自己完結コンポーネント）。
 * Web の `<select>`（松柏類・雑木類・草ものの optgroup）が唯一の入力手段のため、
 * 自由入力は提供せず TREE_SPECIES_GROUPS からの単一選択のみを許可する。
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  SectionList,
  StyleSheet,
  Modal,
  type SectionListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TREE_SPECIES_GROUPS } from '@/lib/constants/tree-species';
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
  textSm,
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

type Section = { title: string; data: readonly string[] };

const SECTIONS: Section[] = TREE_SPECIES_GROUPS.map((group) => ({
  title: group.label,
  data: group.options,
}));

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TreeSpeciesFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// 行アイテム（memo 化でリスト再レンダリングを抑制）
// ---------------------------------------------------------------------------

type RowItemProps = {
  value: string;
  isSelected: boolean;
  onPress: (value: string) => void;
};

const RowItem = React.memo(function RowItem({ value, isSelected, onPress }: RowItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(value)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={value}
    >
      <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>{value}</Text>
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TreeSpeciesField({ value, onChange, disabled = false }: TreeSpeciesFieldProps) {
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const hasValue = value.length > 0;

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsModalVisible(true);
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleSelect = useCallback(
    (selected: string) => {
      onChange(selected);
      setIsModalVisible(false);
    },
    [onChange]
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<string, Section>) => (
      <RowItem value={item} isSelected={item === value} onPress={handleSelect} />
    ),
    [value, handleSelect]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>樹種（任意）</Text>

      <Pressable
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={handleOpen}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={hasValue ? `樹種（任意）：${value}` : '樹種（任意）：樹種を選択'}
        accessibilityState={{ disabled }}
      >
        <Text style={[styles.fieldText, !hasValue && styles.placeholderText]} numberOfLines={1}>
          {hasValue ? value : '樹種を選択'}
        </Text>
        <Ionicons
          name="chevron-down"
          size={CHEVRON_SIZE}
          color={colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Pressable>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
        accessibilityViewIsModal
      >
        {/* 上部の薄暗いスクリムをタップで閉じられるようにする */}
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>樹種を選択</Text>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
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

          <SectionList
            sections={SECTIONS}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            accessibilityRole="list"
            initialNumToRender={24}
            maxToRenderPerBatch={24}
            windowSize={7}
          />
        </View>
      </Modal>
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
  sectionHeader: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing2,
    backgroundColor: colorSurfaceMuted,
  },
  sectionHeaderText: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
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
