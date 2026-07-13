/**
 * @module components/post/GenreSelector
 * 投稿ジャンル選択（最大3・任意）。Web の GenreSelector（トリガーボタン→ドロップダウンの
 * カテゴリ見出し＋個別ジャンルチップの2階層）に準拠し、モバイルではドロップダウンの
 * 代わりにモーダルでチップ一覧を開く。選択値は常に実ジャンル id（cuid）。
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
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
import { MAX_GENRES_PER_POST } from '@/lib/constants/limits/post';
import { ERR_LOAD_FAILED } from '@/lib/constants/errors';
import { useGenresQuery } from '@/lib/queries/shops';
import { groupGenresByCategory } from '@/lib/utils/group-genres-by-category';
import type { Genre } from '@/types/genre';

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
  /** 選択中のジャンル id（cuid）配列。カテゴリ名ではない。 */
  selectedGenres: string[];
  onChange: (genreIds: string[]) => void;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// ジャンルチップ（memo 化でモーダル内の再レンダリングを抑制）
// ---------------------------------------------------------------------------

type GenreChipProps = {
  genre: Genre;
  isSelected: boolean;
  isExhausted: boolean;
  selectedCount: number;
  onPress: (genreId: string) => void;
};

const GenreChip = React.memo(function GenreChip({
  genre,
  isSelected,
  isExhausted,
  selectedCount,
  onPress,
}: GenreChipProps) {
  return (
    <Pressable
      style={[styles.chip, isSelected && styles.chipSelected, isExhausted && styles.chipDisabled]}
      onPress={() => onPress(genre.id)}
      disabled={isExhausted}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: isExhausted }}
      accessibilityLabel={isSelected ? `${genre.name}の選択を解除` : `${genre.name}を選択`}
      accessibilityHint={`${MAX_GENRES_PER_POST}つまで選択できます。現在${selectedCount}つ選択中`}
    >
      <Text
        style={[
          styles.chipText,
          isSelected && styles.chipTextSelected,
          isExhausted && styles.chipTextDisabled,
        ]}
      >
        {genre.name}
      </Text>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenreSelector({ selectedGenres, onChange, isDisabled }: GenreSelectorProps) {
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { data, isLoading, isError, refetch } = useGenresQuery('post');
  // data.items は react-query が同一データ間で参照を安定させるため、
  // useMemo で包んで groupGenresByCategory の再計算をデータ変化時のみに限る
  const genreItems = useMemo(() => data?.items ?? [], [data]);
  const categoryGroups = useMemo(() => groupGenresByCategory(genreItems), [genreItems]);

  const openModal = useCallback(() => {
    if (isDisabled) return;
    setIsModalVisible(true);
  }, [isDisabled]);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handlePressChip = useCallback(
    (genreId: string) => {
      if (isDisabled) return;
      const isSelected = selectedGenres.includes(genreId);
      if (isSelected) {
        onChange(selectedGenres.filter((id) => id !== genreId));
      } else if (selectedGenres.length < MAX_GENRES_PER_POST) {
        onChange([...selectedGenres, genreId]);
      }
    },
    [isDisabled, selectedGenres, onChange]
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const isMaxSelected = selectedGenres.length >= MAX_GENRES_PER_POST;

  // トリガー表示名は選択中の id を実ジャンル名へ解決して連結する（Web の selectedNames と同じ導出）。
  // API の生の items 順は category 昇順（アルファベット順）で GENRE_CATEGORY_ORDER と一致しないため、
  // モーダル内チップと同じ並びにするには categoryGroups（表示順で整列済み）から解決する
  const selectedNames = categoryGroups
    .flatMap((group) => group.genres)
    .filter((genre) => selectedGenres.includes(genre.id))
    .map((genre) => genre.name);
  const triggerLabel = selectedNames.length > 0 ? selectedNames.join(', ') : GENRE_PLACEHOLDER;

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

          <ScrollView contentContainerStyle={styles.sheetScrollContent}>
            {isLoading && (
              <View
                style={styles.stateBlock}
                accessibilityRole="progressbar"
                accessibilityLabel="ジャンルを読み込み中"
              >
                <ActivityIndicator size="small" color={colorActionPrimary} />
              </View>
            )}

            {!isLoading && isError && (
              <View
                style={styles.stateBlock}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
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

            {!isLoading && !isError && categoryGroups.length === 0 && (
              <View style={styles.stateBlock}>
                <Text style={styles.emptyText}>選択できるジャンルがありません</Text>
              </View>
            )}

            {!isLoading &&
              !isError &&
              categoryGroups.map((group) => (
                <View key={group.category} style={styles.categorySection}>
                  <Text style={styles.categoryLabel}>{group.category}</Text>
                  <View style={styles.chipGrid}>
                    {group.genres.map((genre) => {
                      const isSelected = selectedGenres.includes(genre.id);
                      const isExhausted = !isSelected && isMaxSelected;
                      return (
                        <GenreChip
                          key={genre.id}
                          genre={genre}
                          isSelected={isSelected}
                          isExhausted={isExhausted}
                          selectedCount={selectedGenres.length}
                          onPress={handlePressChip}
                        />
                      );
                    })}
                  </View>
                </View>
              ))}

            {selectedGenres.length > 0 && (
              <Text style={styles.modalCounter}>
                {selectedGenres.length}/{MAX_GENRES_PER_POST} 選択中
              </Text>
            )}
          </ScrollView>
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
  sheetScrollContent: {
    gap: spacing4,
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing3,
  },
  categorySection: {
    gap: spacing2,
  },
  categoryLabel: {
    ...textXs,
    color: colorTextTertiary,
    letterSpacing: letterSpacingTight,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
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
  emptyText: {
    ...textSm,
    color: colorTextTertiary,
  },
  modalCounter: {
    ...textXs,
    color: colorTextTertiary,
  },
});
