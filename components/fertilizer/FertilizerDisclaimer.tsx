/**
 * @module components/fertilizer/FertilizerDisclaimer
 * 施肥情報は目安である旨の免責注記。Web 版 FertilizerDisclaimer.tsx と同テキスト。
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

export const FertilizerDisclaimer = memo(function FertilizerDisclaimer() {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.text}>
        施肥の情報は一般的な盆栽管理の知識に基づいた目安です。実際の施肥は樹の状態、用土、気候、環境に応じて調整してください。特定の肥料製品を推奨するものではありません。
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
