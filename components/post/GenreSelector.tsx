/**
 * @module components/post/GenreSelector
 * 投稿コンポーザのジャンル選択チップ群（最大3選択まで）。
 * 仕様: docs/design/post-composer.md §7
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import {
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorSurfaceMuted,
  colorTextTertiary,
  colorBorderLight,
  colorError,
  spacing2,
  spacing3,
  radiusSm,
  textXs,
  letterSpacingTight,
} from '@/lib/constants/design-tokens';
import { GENRE_CATEGORY_ORDER, MAX_GENRES_PER_POST } from '@/lib/constants/limits/post';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHIP_HEIGHT = 36;
const CHIP_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type GenreSelectorProps = {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
  isDisabled: boolean;
  /**
   * true のとき未選択時に必須案内を表示する（新規投稿のみ。Web の PostForm 準拠で
   * 編集フォームはジャンル未選択でも保存できるため false のままにする）。
   */
  isRequired?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenreSelector({
  selectedGenres,
  onChange,
  isDisabled,
  isRequired = false,
}: GenreSelectorProps) {
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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>
        {isRequired
          ? `ジャンル（必須・最大${MAX_GENRES_PER_POST}つまで）`
          : `ジャンル（最大${MAX_GENRES_PER_POST}つまで）`}
      </Text>
      {isRequired && selectedGenres.length === 0 && (
        <Text style={styles.requiredHint} accessibilityLiveRegion="polite">
          ジャンルを1つ以上選択してください
        </Text>
      )}
      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <View style={styles.chipRow}>
          {GENRE_CATEGORY_ORDER.map((genre) => {
            const isSelected = selectedGenres.includes(genre);
            const isExhausted = !isSelected && isMaxSelected;
            const isChipDisabled = isDisabled || isExhausted;

            return (
              <Pressable
                key={genre}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  isChipDisabled && !isSelected && styles.chipDisabled,
                ]}
                onPress={() => handlePressChip(genre)}
                disabled={isChipDisabled}
                hitSlop={CHIP_HIT_SLOP}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={isSelected ? `${genre}の選択を解除` : `${genre}を選択`}
                accessibilityHint={`3つまで選択できます。現在${selectedGenres.length}つ選択中`}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                    isChipDisabled && !isSelected && styles.chipTextDisabled,
                  ]}
                >
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
  requiredHint: {
    ...textXs,
    color: colorError,
  },
  chipRow: {
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
});
