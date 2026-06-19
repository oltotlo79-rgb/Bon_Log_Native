/**
 * @module components/post/ComposerFormError
 * 投稿コンポーザのフォーム全体エラーバナー。
 * FormErrorMessage と同仕様（colorErrorBg / 左端ボーダー）で実装する。
 * 仕様: docs/design/post-composer.md §12.3
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colorError,
  colorErrorBg,
  spacing3,
  radiusMd,
  textBase,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ComposerFormErrorProps = {
  message: string | null | undefined;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComposerFormError({ message }: ComposerFormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorErrorBg,
    borderLeftWidth: 3,
    borderLeftColor: colorError,
    borderRadius: radiusMd,
    padding: spacing3,
    marginHorizontal: spacing3,
    marginBottom: spacing3,
  },
  text: {
    ...textBase,
    color: colorError,
  },
});
