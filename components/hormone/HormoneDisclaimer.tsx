/**
 * @module components/hormone/HormoneDisclaimer
 * ホルモン情報は参考であり個別の盆栽管理には専門家への相談を促す免責注記。
 * Web 版 HormoneDisclaimer.tsx と同テキスト内容。
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

export const HormoneDisclaimer = memo(function HormoneDisclaimer() {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.text}>
        植物ホルモンの情報は一般的な植物生理学・盆栽管理の知識に基づく解説です。実際のホルモン処理（発根促進剤・植物成長調整剤等の使用）は樹の状態、種類、時期、環境に応じて異なります。特定の薬剤・処理法を推奨するものではありません。
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
