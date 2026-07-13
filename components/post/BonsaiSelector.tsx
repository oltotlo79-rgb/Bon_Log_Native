/**
 * @module components/post/BonsaiSelector
 * 投稿に紐付ける盆栽の選択（単一・任意）。新規投稿でのみ使用する。
 * Web の BonsaiSelectorSection（`<select>` ドロップダウン。「選択しない」+ 自分の盆栽一覧）に相当。
 * モバイルには `<select>` がないため、GenreSelector と同じ「トリガーボタン→モーダル」の骨格を流用し、
 * モーダル内の行選択は PrefecturePickerModal と同じ「チェックマーク付き単一選択リスト」を流用する。
 * Web の PostEditForm には対応する UI が存在しない（bonsaiId は編集時に一切変更できない）ため、
 * 本コンポーネントは編集画面では使用しない。
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colorActionPrimary,
  colorActionPrimaryText,
  colorSurfaceMuted,
  colorTextTertiary,
  colorTextSecondary,
  colorTextPrimary,
  colorError,
  colorBorder,
  colorBorderLight,
  colorBackground,
  colorSurfaceWashi,
  colorScrimLight,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusSm,
  radiusMd,
  shadowWashiLg,
  textXs,
  textSm,
  textBase,
  textLg,
  letterSpacingTight,
} from '@/lib/constants/design-tokens';
import { ERR_LOAD_FAILED } from '@/lib/constants/errors';
import { useBonsaiListQuery, type BonsaiListResponse } from '@/lib/queries/bonsai';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHEVRON_ICON_SIZE = 18;
const CHECK_ICON_SIZE = 18;
const CLOSE_ICON_SIZE = 22;
const CLOSE_BUTTON_MIN_SIZE = 44;
const TRIGGER_MIN_HEIGHT = 44;
const ROW_MIN_HEIGHT = 48;
const SECTION_LABEL = '関連する盆栽（任意）';
const NONE_LABEL = '選択しない';
const NONE_ROW_KEY = '__NONE__';
const END_REACHED_THRESHOLD = 0.3;

type BonsaiItem = BonsaiListResponse['items'][number];
// null は Web の `<option value="">選択しない</option>` に相当する行
type RowValue = BonsaiItem | null;

function bonsaiLabel(item: BonsaiItem): string {
  return item.species !== null ? `${item.name} (${item.species})` : item.name;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type BonsaiSelectorProps = {
  selectedBonsaiId: string | null;
  onChange: (bonsaiId: string | null) => void;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// 行アイテム（memo 化でモーダル内の再レンダリングを抑制）
// ---------------------------------------------------------------------------

type RowItemProps = {
  item: RowValue;
  isSelected: boolean;
  onPress: (bonsaiId: string | null) => void;
};

const BonsaiRow = React.memo(function BonsaiRow({ item, isSelected, onPress }: RowItemProps) {
  const label = item === null ? NONE_LABEL : bonsaiLabel(item);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(item === null ? null : item.id)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.rowText, isSelected && styles.rowTextSelected]} numberOfLines={1} ellipsizeMode="tail">
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

export function BonsaiSelector({ selectedBonsaiId, onChange, isDisabled }: BonsaiSelectorProps) {
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBonsaiListQuery();

  const allItems: BonsaiItem[] = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const listData: RowValue[] = useMemo(() => [null, ...allItems], [allItems]);

  const openModal = useCallback(() => {
    if (isDisabled) return;
    setIsModalVisible(true);
  }, [isDisabled]);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleSelect = useCallback(
    (bonsaiId: string | null) => {
      onChange(bonsaiId);
      closeModal();
    },
    [onChange, closeModal]
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RowValue>) => (
      <BonsaiRow
        item={item}
        isSelected={item === null ? selectedBonsaiId === null : item.id === selectedBonsaiId}
        onPress={handleSelect}
      />
    ),
    [selectedBonsaiId, handleSelect]
  );

  const keyExtractor = useCallback(
    (item: RowValue) => (item === null ? NONE_ROW_KEY : item.id),
    []
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const selectedItem = allItems.find((item) => item.id === selectedBonsaiId);
  const triggerLabel = selectedItem !== undefined ? bonsaiLabel(selectedItem) : NONE_LABEL;

  // Web は盆栽 0 件のとき選択欄自体を表示しない
  // （Bon_Log_cfw/components/post/form/BonsaiSelectorSection.tsx: if (bonsaiList.length === 0) return null）。
  // 初回ロード中・エラー中はまだ「0 件と確定していない」ため通常どおり表示し、トリガーからモーダルを
  // 開いた際にローディング/エラー状態を出す（GenreSelector と同じ設計）。
  const isConfirmedEmpty = !isLoading && !isError && allItems.length === 0 && hasNextPage !== true;
  if (isConfirmedEmpty) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{SECTION_LABEL}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          isDisabled && styles.triggerDisabled,
          pressed && !isDisabled && styles.triggerPressed,
        ]}
        onPress={openModal}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={triggerLabel}
        accessibilityHint="タップして関連する盆栽を選択します"
        accessibilityState={{ disabled: isDisabled }}
      >
        <Text style={styles.triggerText} numberOfLines={1} ellipsizeMode="tail">
          {triggerLabel}
        </Text>
        <Ionicons
          name="chevron-down"
          size={CHEVRON_ICON_SIZE}
          color={colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Pressable>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
        accessibilityViewIsModal
      >
        {/* 上部の薄暗いスクリムをタップで閉じられるようにする */}
        <Pressable
          style={styles.backdrop}
          onPress={closeModal}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>関連する盆栽を選択</Text>
            <Pressable
              style={styles.closeButton}
              onPress={closeModal}
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

          {isLoading && (
            <View
              style={styles.stateBlock}
              accessibilityRole="progressbar"
              accessibilityLabel="盆栽を読み込み中"
            >
              <ActivityIndicator size="small" color={colorActionPrimary} />
            </View>
          )}

          {!isLoading && isError && (
            <View style={styles.stateBlock} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              <Text style={styles.errorText}>{ERR_LOAD_FAILED}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={handleRetry}
                accessibilityRole="button"
                accessibilityLabel="再試行する"
              >
                <Text style={styles.retryButtonText}>再試行</Text>
              </Pressable>
            </View>
          )}

          {!isLoading && !isError && (
            <FlatList
              data={listData}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              ItemSeparatorComponent={ItemSeparator}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={END_REACHED_THRESHOLD}
              ListFooterComponent={renderFooter}
              accessibilityRole="list"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing3,
    paddingVertical: spacing3,
    gap: spacing2,
  },
  sectionLabel: {
    ...textXs,
    color: colorTextTertiary,
    letterSpacing: letterSpacingTight,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TRIGGER_MIN_HEIGHT,
    paddingHorizontal: spacing3,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusSm,
    backgroundColor: colorBackground,
  },
  triggerPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  triggerDisabled: {
    backgroundColor: colorSurfaceMuted,
    borderColor: colorBorderLight,
  },
  triggerText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
    marginRight: spacing2,
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
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing3,
    paddingVertical: spacing8,
  },
  errorText: {
    ...textSm,
    color: colorError,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: TRIGGER_MIN_HEIGHT,
    paddingHorizontal: spacing4,
    borderRadius: radiusSm,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    ...textSm,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },
});
