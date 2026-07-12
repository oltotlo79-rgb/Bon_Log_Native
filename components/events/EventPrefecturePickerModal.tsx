/**
 * @module components/events/EventPrefecturePickerModal
 * イベントフォーム用の都道府県選択モーダル（必須項目・単一選択）。
 * components/shops/PrefecturePickerModal はフィルタ用途で「すべて」選択肢を持つが、
 * こちらはフォームの必須入力用のため「すべて」を持たず 47 都道府県から 1 つを選ぶ。
 */

import React, { useCallback } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PREFECTURES, type PrefectureName } from '@/lib/constants/prefectures';
import {
  colorBackground,
  colorBorderLight,
  colorActionPrimary,
  colorScrimLight,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  spacing3,
  spacing4,
  radiusMd,
  shadowWashiLg,
  textBase,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHECK_ICON_SIZE = 18;
const CLOSE_ICON_SIZE = 22;
const CLOSE_BUTTON_MIN_SIZE = 44;
const ROW_MIN_HEIGHT = 48;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type EventPrefecturePickerModalProps = {
  visible: boolean;
  selectedPrefecture: PrefectureName | null;
  onSelect: (prefecture: PrefectureName) => void;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// 行アイテム（memo 化でリスト再レンダリングを抑制）
// ---------------------------------------------------------------------------

type RowItemProps = {
  value: PrefectureName;
  isSelected: boolean;
  onPress: (value: PrefectureName) => void;
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

export function EventPrefecturePickerModal({
  visible,
  selectedPrefecture,
  onSelect,
  onClose,
}: EventPrefecturePickerModalProps) {
  const insets = useSafeAreaInsets();

  const handleRowPress = useCallback(
    (value: PrefectureName) => {
      onSelect(value);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PrefectureName>) => (
      <RowItem value={item} isSelected={item === selectedPrefecture} onPress={handleRowPress} />
    ),
    [selectedPrefecture, handleRowPress]
  );

  const keyExtractor = useCallback((item: PrefectureName) => item, []);

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* 上部の薄暗いスクリムをタップで閉じられるようにする */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="閉じる"
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>都道府県を選択</Text>
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
          data={PREFECTURES}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
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
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colorScrimLight,
  },
  sheet: {
    backgroundColor: colorBackground,
    borderTopLeftRadius: radiusMd,
    borderTopRightRadius: radiusMd,
    maxHeight: '70%',
    ...shadowWashiLg,
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
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing4,
  },
});
