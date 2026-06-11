/**
 * @module components/auth/AuthDivider
 * 「または」区切り線。ログイン・登録フォームのボタン間に挟む。
 * 仕様: docs/design/auth-forms.md §0.1
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colorBorder,
  colorTextSecondary,
  spacing3,
  textBase,
} from '@/lib/constants/design-tokens';

export function AuthDivider() {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>または</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colorBorder,
  },
  text: {
    ...textBase,
    color: colorTextSecondary,
  },
});
