/**
 * @module components/common/NavActiveIndicator
 * ボトムタブの墨筆装飾（Web の MobileNav ActiveBarIndicator を忠実移植）。
 * アクティブタブの墨点（アイコン上部）と波線の下線（ラベル下部）を表す。
 * react-navigation はタブアイコンを常に「アクティブ/非アクティブ」の2コピーで
 * 描画し opacity で切り替えるため、アクティブコピー側にだけ差し込めば
 * 実際の選択状態と自動的に連動する。
 * 仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §3.5
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const ACTIVE_DOT_SOURCE = require('@/assets/images/brush-frames/active-ink-dot.svg');
const ACTIVE_UNDERLINE_SOURCE = require('@/assets/images/brush-frames/active-ink-underline.svg');

const DOT_SIZE = 8;
const UNDERLINE_WIDTH = 28;
const UNDERLINE_HEIGHT = 3;

export function NavActiveInkDot() {
  return (
    <Image
      source={ACTIVE_DOT_SOURCE}
      style={styles.dot}
      contentFit="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function NavActiveInkUnderline() {
  return (
    <Image
      source={ACTIVE_UNDERLINE_SOURCE}
      style={styles.underline}
      contentFit="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: DOT_SIZE,
    height: DOT_SIZE,
  },
  underline: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: UNDERLINE_WIDTH,
    height: UNDERLINE_HEIGHT,
  },
});
