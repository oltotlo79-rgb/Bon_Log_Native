/**
 * @module components/auth/FormErrorMessage
 * フォーム全体のエラーバナー。API エラーや複数フィールドにまたがるエラーを表示する。
 * 仕様: docs/design/auth-forms.md §0.3
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

export type FormErrorMessageProps = {
  message: string | null | undefined;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FormErrorMessage({ message }: FormErrorMessageProps) {
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorErrorBg,
    borderLeftWidth: 3,
    borderLeftColor: colorError,
    borderRadius: radiusMd,
    padding: spacing3,
  },
  text: {
    ...textBase,
    color: colorError,
  },
});
