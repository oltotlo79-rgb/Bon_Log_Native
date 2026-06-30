/**
 * @module components/shops/RegionPickerModal
 * 地方ブロックフィルタ選択モーダル。
 * 「すべて」＋8地方ブロックを縦 FlatList で表示し、選択行をチェックマークで示す。
 * PrefecturePickerModal と同じ構成。SafeAreaView は Modal 内部で持つ。
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
import { REGIONS, type RegionName } from '@/lib/constants/regions';
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

// モーダルに渡す「すべて」行の識別子。RegionName には存在しない値を使う
const ALL_SENTINEL = '__ALL__' as const;
type RowValue = RegionName | typeof ALL_SENTINEL;

const LIST_DATA: RowValue[] = [ALL_SENTINEL, ...REGIONS];

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type RegionPickerModalProps = {
  visible: boolean;
  selectedRegion: RegionName | undefined;
  onSelect: (region: RegionName | undefined) => void;
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

export function RegionPickerModal({
  visible,
  selectedRegion,
  onSelect,
  onClose,
}: RegionPickerModalProps) {
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
            ? selectedRegion === undefined
            : item === selectedRegion
        }
        onPress={handleRowPress}
      />
    ),
    [selectedRegion, handleRowPress]
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
          <Text style={styles.sheetTitle}>地方を選択</Text>
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
          // 8地方 + すべて = 9行のため全件初期レンダリングで問題なし
          initialNumToRender={9}
          maxToRenderPerBatch={9}
          windowSize={3}
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
