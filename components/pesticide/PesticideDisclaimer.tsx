/**
 * @module components/pesticide/PesticideDisclaimer
 * 農薬情報は参考情報である旨の免責注記。Web 版 PesticideDisclaimer.tsx と同テキスト。
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colorSurfaceMuted,
  colorBorder,
  colorTextSecondary,
  spacing4,
  radiusMd,
  textXs,
} from '@/lib/constants/design-tokens';

export const PesticideDisclaimer = memo(function PesticideDisclaimer() {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.text}>
        農薬情報は参考情報です。実際の使用に際しては必ず製品ラベルおよび農林水産省登録情報を確認してください。効果・安全性は個々の使用状況により異なります。
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSurfaceMuted,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing4,
  },
  text: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 18,
  },
});
