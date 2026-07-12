/**
 * @module components/search/PostSearchFilterPanel
 * 投稿検索の詳細フィルタパネル（ジャンル / 期間 / 最小いいね数 / メディア種別）。
 * Web の AdvancedSearchFilters + GenreFilter に対応。
 * 開閉トグル付き。適用時に onApply コールバックへ SearchPostsFilter を渡す。
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGenresQuery } from '@/lib/queries/shops';
import { DatePickerField } from '@/components/common/DatePickerField';
import type { SearchPostsFilter } from '@/lib/queries/keys';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  radiusSm,
  radiusFull,
  textSm,
  textXs,
  letterSpacingTight,
} from '@/lib/constants/design-tokens';

// Android では LayoutAnimation を有効化する必要がある
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHIP_HEIGHT = 32;
const CHIP_HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 } as const;
const FILTER_ICON_SIZE = 16;
const CHEVRON_SIZE = 16;

type MediaTypeValue = 'image' | 'video' | 'none';

type MediaTypeOption = {
  label: string;
  value: MediaTypeValue | '';
};

const MEDIA_TYPE_OPTIONS: MediaTypeOption[] = [
  { label: 'すべて', value: '' },
  { label: '画像あり', value: 'image' },
  { label: '動画あり', value: 'video' },
  { label: 'テキストのみ', value: 'none' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PostSearchFilterPanelProps = {
  currentFilter: SearchPostsFilter;
  onApply: (filter: SearchPostsFilter) => void;
  onReset: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostSearchFilterPanel({
  currentFilter,
  onApply,
  onReset,
}: PostSearchFilterPanelProps) {
  const hasActiveFilters =
    (currentFilter.genreId !== undefined && currentFilter.genreId.length > 0) ||
    (currentFilter.dateFrom !== undefined && currentFilter.dateFrom.length > 0) ||
    (currentFilter.dateTo !== undefined && currentFilter.dateTo.length > 0) ||
    currentFilter.minLikes !== undefined ||
    currentFilter.mediaType !== undefined;

  const [isOpen, setIsOpen] = useState(hasActiveFilters);

  const [localGenreId, setLocalGenreId] = useState(currentFilter.genreId ?? '');
  const [localDateFrom, setLocalDateFrom] = useState(currentFilter.dateFrom ?? '');
  const [localDateTo, setLocalDateTo] = useState(currentFilter.dateTo ?? '');
  const [localMinLikes, setLocalMinLikes] = useState(
    currentFilter.minLikes !== undefined ? String(currentFilter.minLikes) : ''
  );
  const [localMediaType, setLocalMediaType] = useState<MediaTypeValue | ''>(
    currentFilter.mediaType ?? ''
  );

  const { data: genreData } = useGenresQuery('post');
  const genres = genreData?.items ?? [];

  const localHasFilters =
    localGenreId.length > 0 ||
    localDateFrom.length > 0 ||
    localDateTo.length > 0 ||
    localMinLikes.length > 0 ||
    localMediaType.length > 0;

  const toggleOpen = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen((prev) => !prev);
  }, []);

  const handleApply = useCallback(() => {
    const filter: SearchPostsFilter = {};
    if (localGenreId.length > 0) filter.genreId = localGenreId;
    if (localDateFrom.length > 0) filter.dateFrom = localDateFrom;
    if (localDateTo.length > 0) filter.dateTo = localDateTo;
    const parsedMinLikes = parseInt(localMinLikes, 10);
    if (!isNaN(parsedMinLikes) && parsedMinLikes > 0) filter.minLikes = parsedMinLikes;
    if (localMediaType === 'image' || localMediaType === 'video' || localMediaType === 'none') {
      filter.mediaType = localMediaType;
    }
    onApply(filter);
  }, [localGenreId, localDateFrom, localDateTo, localMinLikes, localMediaType, onApply]);

  const handleReset = useCallback(() => {
    setLocalGenreId('');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalMinLikes('');
    setLocalMediaType('');
    onReset();
  }, [onReset]);

  return (
    <View style={styles.container}>
      {/* トグルボタン */}
      <Pressable
        style={styles.toggleButton}
        onPress={toggleOpen}
        accessibilityRole="button"
        accessibilityLabel={isOpen ? '詳細フィルターを閉じる' : '詳細フィルターを開く'}
        accessibilityState={{ expanded: isOpen }}
      >
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={CHEVRON_SIZE}
          color={colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.toggleLabel}>詳細フィルター</Text>
        {hasActiveFilters && <View style={styles.activeDot} />}
      </Pressable>

      {isOpen && (
        <View style={styles.panel}>
          {/* ジャンル */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ジャンル</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {genres.map((genre) => {
                const isSelected = localGenreId === genre.id;
                return (
                  <Pressable
                    key={genre.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setLocalGenreId(isSelected ? '' : genre.id)}
                    hitSlop={CHIP_HIT_SLOP}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`ジャンル ${genre.name}${isSelected ? ' 選択中' : ''}`}
                  >
                    <Text
                      style={[styles.chipText, isSelected && styles.chipTextSelected]}
                    >
                      {genre.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 期間（開始日 / 終了日 — DatePickerField による日付のみピッカー） */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>期間</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <DatePickerField
                  label=""
                  value={localDateFrom.length > 0 ? localDateFrom : null}
                  onChange={(v) => setLocalDateFrom(v ?? '')}
                  placeholder="開始日"
                  clearAccessibilityLabel="開始日を削除"
                />
              </View>
              <Text style={styles.dateSeparator}>〜</Text>
              <View style={styles.dateField}>
                <DatePickerField
                  label=""
                  value={localDateTo.length > 0 ? localDateTo : null}
                  onChange={(v) => setLocalDateTo(v ?? '')}
                  placeholder="終了日"
                  clearAccessibilityLabel="終了日を削除"
                />
              </View>
            </View>
          </View>

          {/* 最小いいね数 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>最小いいね数</Text>
            <TextInput
              style={styles.minLikesInput}
              value={localMinLikes}
              onChangeText={setLocalMinLikes}
              placeholder="0"
              placeholderTextColor={colorTextTertiary}
              keyboardType="number-pad"
              maxLength={6}
              accessibilityLabel="最小いいね数を入力"
              underlineColorAndroid="transparent"
            />
          </View>

          {/* メディア種別 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>メディア種別</Text>
            <View style={styles.mediaTypeRow}>
              {MEDIA_TYPE_OPTIONS.map((opt) => {
                const isSelected = localMediaType === opt.value;
                return (
                  <Pressable
                    key={opt.value === '' ? 'all' : opt.value}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => {
                      const nextValue: MediaTypeValue | '' = isSelected ? '' : opt.value;
                      setLocalMediaType(nextValue);
                    }}
                    hitSlop={CHIP_HIT_SLOP}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`メディア種別 ${opt.label}`}
                  >
                    <Text
                      style={[styles.chipText, isSelected && styles.chipTextSelected]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* アクションボタン */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.applyButton}
              onPress={handleApply}
              accessibilityRole="button"
              accessibilityLabel="フィルターを適用する"
            >
              <Ionicons
                name="filter"
                size={FILTER_ICON_SIZE}
                color={colorActionPrimaryText}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.applyButtonText}>適用</Text>
            </Pressable>

            {localHasFilters && (
              <Pressable
                style={styles.resetButton}
                onPress={handleReset}
                accessibilityRole="button"
                accessibilityLabel="フィルターをリセットする"
              >
                <Text style={styles.resetButtonText}>リセット</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorBackground,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing4,
    paddingVertical: spacing2,
    gap: spacing2,
  },
  toggleLabel: {
    ...textSm,
    color: colorTextSecondary,
    flex: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
  },
  panel: {
    paddingHorizontal: spacing4,
    paddingBottom: spacing3,
    gap: spacing3,
  },
  section: {
    gap: spacing2,
  },
  sectionLabel: {
    ...textXs,
    color: colorTextTertiary,
    letterSpacing: letterSpacingTight,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing2,
    paddingVertical: spacing2,
  },
  mediaTypeRow: {
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
    borderRadius: radiusFull,
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  chipSelected: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  chipText: {
    ...textXs,
    color: colorActionSecondaryText,
    letterSpacing: letterSpacingTight,
  },
  chipTextSelected: {
    color: colorActionPrimaryText,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  dateField: {
    flex: 1,
  },
  dateSeparator: {
    ...textSm,
    color: colorTextSecondary,
  },
  minLikesInput: {
    height: 40,
    width: 120,
    paddingHorizontal: spacing3,
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusSm,
    ...textSm,
    color: colorTextPrimary,
    paddingVertical: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    paddingTop: spacing2,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: spacing4,
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    gap: spacing2,
  },
  applyButtonText: {
    ...textSm,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  resetButton: {
    height: 44,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
  },
  resetButtonText: {
    ...textSm,
    color: colorTextSecondary,
  },
});
