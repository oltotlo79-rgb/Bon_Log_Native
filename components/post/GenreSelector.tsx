/**
 * @module components/post/GenreSelector
 * 投稿ジャンル選択（最大3・任意）。Web の GenreSelector（トリガーボタン→ドロップダウンの
 * チップ一覧）に準拠し、モバイルではドロップダウンの代わりにモーダルでチップ一覧を開く。
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorSurfaceMuted,
  colorTextTertiary,
  colorTextSecondary,
  colorTextPrimary,
  colorBorder,
  colorBorderLight,
  colorBackground,
  colorSurfaceWashi,
  colorScrimLight,
  spacing2,
  spacing3,
  spacing4,
  radiusSm,
  radiusMd,
  shadowWashiLg,
  textXs,
  textBase,
  textLg,
  letterSpacingTight,
} from '@/lib/constants/design-tokens';
import { GENRE_CATEGORY_ORDER, MAX_GENRES_PER_POST } from '@/lib/constants/limits/post';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHIP_HEIGHT = 36;
const CHIP_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };
const CHEVRON_ICON_SIZE = 18;
const CLOSE_ICON_SIZE = 22;
const CLOSE_BUTTON_MIN_SIZE = 44;
const TRIGGER_MIN_HEIGHT = 44;
const GENRE_PLACEHOLDER = 'ジャンルを選択（任意）';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type GenreSelectorProps = {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenreSelector({ selectedGenres, onChange, isDisabled }: GenreSelectorProps) {
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const openModal = useCallback(() => {
    if (isDisabled) return;
    setIsModalVisible(true);
  }, [isDisabled]);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handlePressChip = useCallback(
    (genre: string) => {
      if (isDisabled) return;
      const isSelected = selectedGenres.includes(genre);
      if (isSelected) {
        onChange(selectedGenres.filter((g) => g !== genre));
      } else if (selectedGenres.length < MAX_GENRES_PER_POST) {
        onChange([...selectedGenres, genre]);
      }
    },
    [isDisabled, selectedGenres, onChange]
  );

  const isMaxSelected = selectedGenres.length >= MAX_GENRES_PER_POST;
  const triggerLabel = selectedGenres.length > 0 ? selectedGenres.join(', ') : GENRE_PLACEHOLDER;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>ジャンル</Text>

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
        accessibilityHint="タップしてジャンルを選択します"
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

      {selectedGenres.length > 0 && (
        <Text style={styles.counter}>
          {selectedGenres.length}/{MAX_GENRES_PER_POST} 選択中
        </Text>
      )}

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
            <Text style={styles.sheetTitle}>ジャンルを選択</Text>
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

          <View style={styles.chipGrid}>
            {GENRE_CATEGORY_ORDER.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              const isExhausted = !isSelected && isMaxSelected;

              return (
                <Pressable
                  key={genre}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    isExhausted && styles.chipDisabled,
                  ]}
                  onPress={() => handlePressChip(genre)}
                  disabled={isExhausted}
                  hitSlop={CHIP_HIT_SLOP}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled: isExhausted }}
                  accessibilityLabel={isSelected ? `${genre}の選択を解除` : `${genre}を選択`}
                  accessibilityHint={`${MAX_GENRES_PER_POST}つまで選択できます。現在${selectedGenres.length}つ選択中`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                      isExhausted && styles.chipTextDisabled,
                    ]}
                  >
                    {genre}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedGenres.length > 0 && (
            <Text style={styles.modalCounter}>
              {selectedGenres.length}/{MAX_GENRES_PER_POST} 選択中
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
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
  counter: {
    ...textXs,
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing3,
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorActionSecondary,
    borderRadius: radiusSm,
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  chipSelected: {
    backgroundColor: colorActionPrimary,
    borderWidth: 0,
  },
  chipDisabled: {
    backgroundColor: colorSurfaceMuted,
    borderColor: colorBorderLight,
  },
  chipText: {
    ...textXs,
    color: colorActionSecondaryText,
    letterSpacing: letterSpacingTight,
  },
  chipTextSelected: {
    color: colorActionPrimaryText,
  },
  chipTextDisabled: {
    color: colorTextTertiary,
  },
  modalCounter: {
    ...textXs,
    color: colorTextTertiary,
    paddingHorizontal: spacing4,
    paddingBottom: spacing4,
  },
});
