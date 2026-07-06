/**
 * @module components/auth/AuthScreenBackground
 * 認証画面共通の背景画像ラッパー。鳥居の墨絵と和紙ノイズを薄く全面に敷く。
 * 子要素のタップ・スクロールを妨げないよう absolute で背面に配置する。
 * 和紙ノイズは Web の `.washi-texture`（(auth)/layout.tsx 全体背景）を移植。
 * 仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §4 P3
 */

import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { Image } from 'expo-image';

type AuthScreenBackgroundProps = {
  children: React.ReactNode;
  style?: ViewProps['style'];
};

// app.json で userInterfaceStyle: "light" のためライト版のみ使用する
const BG_SOURCE = require('@/assets/images/auth-bg-gate-mobile.webp');
const WASHI_NOISE_SOURCE = require('@/assets/images/brush-frames/washi-noise.svg');

// 墨絵の存在感を出しつつフォームの可読性を確保するため 0.25 に設定
const BG_OPACITY = 0.25;
// Web の `.washi-texture` の feTurbulence rect opacity（0.03）と同値。
// タブバー背景（app/(tabs)/_layout.tsx）と同じ和紙ノイズ素材・同じ薄さで統一する。
const WASHI_NOISE_OPACITY = 0.03;

export function AuthScreenBackground({ children, style }: AuthScreenBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <Image
        source={BG_SOURCE}
        style={styles.background}
        contentFit="cover"
        // 装飾画像のため読み上げ対象外にする
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Image
        source={WASHI_NOISE_SOURCE}
        style={styles.washiNoise}
        contentFit="cover"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFill,
    opacity: BG_OPACITY,
    // zIndex を指定しないことで children が常に前面に来る
  },
  washiNoise: {
    ...StyleSheet.absoluteFill,
    opacity: WASHI_NOISE_OPACITY,
  },
});
