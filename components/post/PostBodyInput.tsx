/**
 * @module components/post/PostBodyInput
 * 投稿コンポーザの本文テキストエリア + 文字数カウンタ。
 * 仕様: docs/design/post-composer.md §6
 */

import React, { useCallback } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import {
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorWarning,
  colorError,
  spacing3,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const TEXT_AREA_MIN_HEIGHT = 120;
const COUNTER_WARNING_THRESHOLD = 50;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PostBodyInputProps = {
  value: string;
  onChange: (text: string) => void;
  maxLength: number;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostBodyInput({ value, onChange, maxLength, isDisabled }: PostBodyInputProps) {
  const remaining = maxLength - value.length;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining >= 0 && remaining <= COUNTER_WARNING_THRESHOLD;

  const counterColor = isOverLimit
    ? colorError
    : isNearLimit
      ? colorWarning
      : colorTextTertiary;

  const handleChangeText = useCallback(
    (text: string) => {
      onChange(text);
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleChangeText}
        multiline
        scrollEnabled
        placeholder="盆栽の記録をシェアしましょう..."
        placeholderTextColor={colorTextTertiary}
        keyboardType="default"
        autoCapitalize="sentences"
        returnKeyType="default"
        editable={!isDisabled}
        accessibilityLabel="投稿内容を入力"
        accessibilityHint={`最大${maxLength}文字で入力してください`}
        testID="post-body-input"
      />
      <View style={styles.counterRow}>
        <Text
          style={[styles.counter, { color: counterColor }]}
          accessibilityLabel={`${value.length}文字 / ${maxLength}文字`}
          accessibilityRole={isOverLimit ? 'alert' : 'text'}
        >
          {value.length} / {maxLength}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing3,
    paddingTop: spacing3,
    paddingBottom: spacing3,
  },
  input: {
    ...textBase,
    color: colorTextPrimary,
    minHeight: TEXT_AREA_MIN_HEIGHT,
    textAlignVertical: 'top',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  counterRow: {
    alignItems: 'flex-end',
    marginTop: spacing3,
  },
  counter: {
    ...textSm,
    color: colorTextSecondary,
  },
});
