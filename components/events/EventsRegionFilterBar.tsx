/**
 * @module components/events/EventsRegionFilterBar
 * 地方チップ横スクロール行 + 都道府県フィルタ行。
 * Web 版 RegionFilter を RN に移植。地方と都道府県は排他的（一方を選ぶと他方をリセット）。
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PrefectureName } from '@/lib/constants/prefectures';
import { PrefecturePickerModal } from '@/components/shops/PrefecturePickerModal';
import {
  colorSurfaceWashi,
  colorBorderLight,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  radiusSm,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CHIP_HEIGHT = 36;
const CHIP_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };
const PREFECTURE_ROW_HEIGHT = 40;
const CHEVRON_SIZE = 14;

type Region = {
  label: string;
  value: string;
};

const REGIONS: Region[] = [
  { label: '全国', value: '' },
  { label: '北海道・東北', value: '北海道・東北' },
  { label: '関東', value: '関東' },
  { label: '中部・北陸', value: '中部・北陸' },
  { label: '近畿', value: '近畿' },
  { label: '中国・四国', value: '中国・四国' },
  { label: '九州・沖縄', value: '九州・沖縄' },
];

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type EventsRegionFilterBarProps = {
  selectedRegion: string;
  selectedPrefecture: PrefectureName | undefined;
  onRegionChange: (region: string) => void;
  onPrefectureChange: (prefecture: PrefectureName | undefined) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventsRegionFilterBar({
  selectedRegion,
  selectedPrefecture,
  onRegionChange,
  onPrefectureChange,
}: EventsRegionFilterBarProps) {
  const [prefModalVisible, setPrefModalVisible] = useState(false);

  const handleRegionPress = useCallback(
    (value: string) => {
      // 地方を選択したら都道府県をリセット（排他的）
      onRegionChange(value);
      if (value !== '') {
        onPrefectureChange(undefined);
      }
    },
    [onRegionChange, onPrefectureChange]
  );

  const handlePrefectureSelect = useCallback(
    (pref: PrefectureName | undefined) => {
      // 都道府県を選択したら地方をリセット（排他的）
      onPrefectureChange(pref);
      if (pref !== undefined) {
        onRegionChange('');
      }
      setPrefModalVisible(false);
    },
    [onPrefectureChange, onRegionChange]
  );

  const handleClearPrefecture = useCallback(() => {
    onPrefectureChange(undefined);
  }, [onPrefectureChange]);

  const prefectureLabel =
    selectedPrefecture !== undefined ? selectedPrefecture : '都道府県: すべて';
  const hasPrefectureFilter = selectedPrefecture !== undefined;

  return (
    <View style={styles.container}>
      {/* 地方チップ横スクロール行 */}
      <View style={styles.regionRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionScrollContent}
        >
          {REGIONS.map((region) => {
            const isSelected = selectedRegion === region.value;
            return (
              <Pressable
                key={region.value === '' ? '__all__' : region.value}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => handleRegionPress(region.value)}
                hitSlop={CHIP_HIT_SLOP}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={region.label}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {region.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 都道府県フィルタ行 */}
      <View style={styles.prefRow}>
        <Pressable
          style={styles.prefButton}
          onPress={() => setPrefModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`都道府県フィルタ。現在: ${prefectureLabel}`}
          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
        >
          <Text
            style={[styles.prefButtonText, hasPrefectureFilter && styles.prefButtonTextActive]}
          >
            {prefectureLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={CHEVRON_SIZE}
            color={hasPrefectureFilter ? colorActionPrimary : colorTextTertiary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        {hasPrefectureFilter && (
          <Pressable
            style={styles.clearButton}
            onPress={handleClearPrefecture}
            accessibilityRole="button"
            accessibilityLabel="都道府県フィルタをクリア"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 8 }}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.clearButtonText}>クリア</Text>
          </Pressable>
        )}
      </View>

      {/* 都道府県選択モーダル */}
      <PrefecturePickerModal
        visible={prefModalVisible}
        selectedPrefecture={selectedPrefecture}
        onSelect={handlePrefectureSelect}
        onClose={() => setPrefModalVisible(false)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  regionRow: {
    height: 44,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  regionScrollContent: {
    paddingHorizontal: spacing4,
    gap: spacing1,
    alignItems: 'center',
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorActionSecondary,
    borderRadius: radiusSm,
  },
  chipSelected: {
    backgroundColor: colorActionPrimary,
  },
  chipText: {
    ...textSm,
    color: colorActionSecondaryText,
  },
  chipTextSelected: {
    color: colorActionPrimaryText,
  },
  prefRow: {
    height: PREFECTURE_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    gap: spacing2,
  },
  prefButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    minHeight: 36,
    paddingHorizontal: spacing2,
  },
  prefButtonText: {
    ...textXs,
    color: colorTextSecondary,
  },
  prefButtonTextActive: {
    color: colorActionPrimary,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    minHeight: 36,
    paddingHorizontal: spacing2,
  },
  clearButtonText: {
    ...textXs,
    color: colorTextTertiary,
  },
});
