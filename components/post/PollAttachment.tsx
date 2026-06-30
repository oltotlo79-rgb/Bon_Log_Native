/**
 * @module components/post/PollAttachment
 * 投稿コンポーザに添付するアンケート作成 UI。
 * Web の PollForm.tsx の UX を React Native に移植した実装。
 * 選択肢数・文字数の制限は Web cfw のサーバー設定値と同一。
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBorder,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorSurfaceMuted,
  colorSurfaceKinoko,
  colorError,
  spacing1,
  spacing2,
  spacing3,
  radiusMd,
  radiusSm,
  textSm,
  textBase,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数（Web cfw lib/constants/limits/post.ts の値を踏襲）
// ---------------------------------------------------------------------------

const MIN_POLL_OPTIONS = 2;
const MAX_POLL_OPTIONS = 10;
const MAX_POLL_OPTION_LENGTH = 50;

const DURATION_OPTIONS: readonly { label: string; value: number }[] = [
  { label: '1時間', value: 3600 },
  { label: '6時間', value: 21600 },
  { label: '12時間', value: 43200 },
  { label: '1日', value: 86400 },
  { label: '3日', value: 259200 },
  { label: '7日', value: 604800 },
] as const;

const DEFAULT_DURATION_SECONDS = 86400;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type PollAttachmentValue = {
  options: string[];
  durationSeconds: number;
};

export type PollAttachmentProps = {
  value: PollAttachmentValue;
  onChange: (value: PollAttachmentValue) => void;
  onRemove: () => void;
  isDisabled?: boolean;
};

// ---------------------------------------------------------------------------
// デフォルト値ファクトリ（PostComposer の初期値生成に使用）
// ---------------------------------------------------------------------------

export function createDefaultPollValue(): PollAttachmentValue {
  return {
    options: ['', ''],
    durationSeconds: DEFAULT_DURATION_SECONDS,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PollAttachment({ value, onChange, onRemove, isDisabled = false }: PollAttachmentProps) {
  const { options, durationSeconds } = value;

  const handleOptionChange = useCallback(
    (index: number, text: string) => {
      const next = [...options];
      next[index] = text;
      onChange({ ...value, options: next });
    },
    [options, value, onChange]
  );

  const handleAddOption = useCallback(() => {
    if (options.length >= MAX_POLL_OPTIONS) return;
    onChange({ ...value, options: [...options, ''] });
  }, [options, value, onChange]);

  const handleRemoveOption = useCallback(
    (index: number) => {
      if (options.length <= MIN_POLL_OPTIONS) return;
      onChange({ ...value, options: options.filter((_, i) => i !== index) });
    },
    [options, value, onChange]
  );

  const handleDurationChange = useCallback(
    (seconds: number) => {
      onChange({ ...value, durationSeconds: seconds });
    },
    [value, onChange]
  );

  return (
    <View style={styles.container} accessibilityRole="none">
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="bar-chart-outline"
            size={18}
            color={colorTextPrimary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.headerTitle}>アンケート</Text>
        </View>
        <Pressable
          style={styles.removeButton}
          onPress={onRemove}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel="アンケートを削除"
          accessibilityState={{ disabled: isDisabled }}
        >
          <Ionicons name="close" size={20} color={colorTextSecondary} />
        </Pressable>
      </View>

      {/* 選択肢リスト */}
      <View style={styles.optionList}>
        {options.map((opt, index) => (
          <View key={index} style={styles.optionRow}>
            <TextInput
              style={[styles.optionInput, isDisabled && styles.inputDisabled]}
              value={opt}
              onChangeText={(text) => handleOptionChange(index, text)}
              placeholder={`選択肢 ${index + 1}`}
              placeholderTextColor={colorTextTertiary}
              maxLength={MAX_POLL_OPTION_LENGTH}
              editable={!isDisabled}
              accessibilityLabel={`アンケート選択肢 ${index + 1}`}
              returnKeyType="next"
            />
            {options.length > MIN_POLL_OPTIONS && (
              <Pressable
                style={({ pressed }) => [styles.optionRemoveButton, pressed && styles.optionRemoveButtonPressed]}
                onPress={() => handleRemoveOption(index)}
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityLabel={`選択肢 ${index + 1} を削除`}
                accessibilityState={{ disabled: isDisabled }}
                hitSlop={{ top: spacing2, bottom: spacing2, left: spacing2, right: spacing2 }}
              >
                <Ionicons name="close-circle" size={18} color={colorError} />
              </Pressable>
            )}
          </View>
        ))}

        {options.length < MAX_POLL_OPTIONS && (
          <Pressable
            style={({ pressed }) => [styles.addOptionButton, pressed && styles.addOptionButtonPressed]}
            onPress={handleAddOption}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel="選択肢を追加"
            accessibilityState={{ disabled: isDisabled }}
          >
            <Ionicons
              name="add"
              size={16}
              color={colorActionPrimary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.addOptionText}>選択肢を追加</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.divider} />

      {/* 投票期間セレクター */}
      <View style={styles.durationSection}>
        <Text style={styles.durationLabel}>投票期間</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.durationScroll}
          accessibilityRole="none"
        >
          {DURATION_OPTIONS.map((opt) => {
            const isSelected = durationSeconds === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.durationChip,
                  isSelected && styles.durationChipSelected,
                  pressed && !isSelected && styles.durationChipPressed,
                ]}
                onPress={() => handleDurationChange(opt.value)}
                disabled={isDisabled}
                accessibilityRole="radio"
                accessibilityLabel={`投票期間: ${opt.label}`}
                accessibilityState={{ checked: isSelected, disabled: isDisabled }}
              >
                <Text style={[styles.durationChipText, isSelected && styles.durationChipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSurfaceKinoko,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorderLight,
    padding: spacing3,
    gap: spacing3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  headerTitle: {
    ...textBase,
    fontWeight: '600',
    color: colorTextPrimary,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionList: {
    gap: spacing2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusSm,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    minHeight: 44,
    ...textSm,
    color: colorTextPrimary,
    backgroundColor: 'white',
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: colorSurfaceMuted,
  },
  optionRemoveButton: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionRemoveButtonPressed: {
    opacity: 0.6,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    paddingVertical: spacing2,
    paddingHorizontal: spacing1,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  addOptionButtonPressed: {
    opacity: 0.6,
  },
  addOptionText: {
    ...textSm,
    color: colorActionPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colorBorderLight,
  },
  durationSection: {
    gap: spacing2,
  },
  durationLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  durationScroll: {
    gap: spacing2,
    paddingRight: spacing2,
  },
  durationChip: {
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusSm,
    paddingHorizontal: spacing3,
    paddingVertical: spacing1,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  durationChipSelected: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  durationChipPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  durationChipText: {
    ...textXs,
    color: colorTextPrimary,
  },
  durationChipTextSelected: {
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
});
