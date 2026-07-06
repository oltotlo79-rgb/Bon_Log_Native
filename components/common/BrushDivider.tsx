/**
 * @module components/common/BrushDivider
 * Web の `divider.svg`（一本の墨筆による水平線）を表示する共通コンポーネント。
 * 入力欄の下線（`.brush-input`）・見出し前後の飾り線（`.brush-divider`）の
 * どちらにも使う。仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §3.6
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

const DIVIDER_SOURCE = require('@/assets/images/brush-frames/divider.svg');

type BrushDividerProps = {
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_HEIGHT = 4;

export function BrushDivider({ height = DEFAULT_HEIGHT, style }: BrushDividerProps) {
  return (
    <View
      style={[styles.wrapper, { height }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={DIVIDER_SOURCE} style={styles.image} contentFit="fill" accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
