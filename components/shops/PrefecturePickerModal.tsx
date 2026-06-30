/**
 * @module components/shops/PrefecturePickerModal
 * 都道府県フィルタ選択モーダル。
 * 「すべて」＋47都道府県を縦 FlatList で表示し、選択行をチェックマークで示す。
 * SafeAreaView は呼び出し元画面のインセットとは独立して Modal 内部で持つ。
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

// モーダルに渡す「すべて」行の識別子。PrefectureName には存在しない値を使う
const ALL_SENTINEL = '__ALL__' as const;
type RowValue = PrefectureName | typeof ALL_SENTINEL;

const LIST_DATA: RowValue[] = [ALL_SENTINEL, ...PREFECTURES];

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type PrefecturePickerModalProps = {
  visible: boolean;
  selectedPrefecture: PrefectureName | undefined;
  onSelect: (prefecture: PrefectureName | undefined) => void;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// 行アイテム（memo 化でリスト再レンダリングを抑制）
// ---------------------------------------------------------------------------

type RowItemProps = {
  value: RowValue;
  isSelected: boolean;
  onPress: (value: RowValue) => void;
};

const RowItem = React.memo(function RowItem({ value, isSelected, onPress }: RowItemProps) {
  const label = value === ALL_SENTINEL ? 'すべて' : value;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(value)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
        {label}
      </Text>
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

export function PrefecturePickerModal({
  visible,
  selectedPrefecture,
  onSelect,
  onClose,
}: PrefecturePickerModalProps) {
  const insets = useSafeAreaInsets();

  const handleRowPress = useCallback(
    (value: RowValue) => {
      onSelect(value === ALL_SENTINEL ? undefined : value);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RowValue>) => (
      <RowItem
        value={item}
        isSelected={
          item === ALL_SENTINEL
            ? selectedPrefecture === undefined
            : item === selectedPrefecture
        }
        onPress={handleRowPress}
      />
    ),
    [selectedPrefecture, handleRowPress]
  );

  const keyExtractor = useCallback((item: RowValue) => item, []);

  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

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

      <View
        style={[
          styles.sheet,
          // ホームバー分の余白を確保する
          { paddingBottom: insets.bottom },
        ]}
      >
        {/* モーダルヘッダー */}
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
          data={LIST_DATA}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          accessibilityRole="list"
          // 先頭の「すべて」行を常に画面内に収める程度にオフセット
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
  // モーダル背景（上半分のタップで閉じる）
  backdrop: {
    flex: 1,
    backgroundColor: colorScrimLight,
  },

  // ボトムシート本体
  sheet: {
    backgroundColor: colorBackground,
    borderTopLeftRadius: radiusMd,
    borderTopRightRadius: radiusMd,
    maxHeight: '70%',
    ...shadowWashiLg,
  },

  // シートヘッダー
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

  // リスト行
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
