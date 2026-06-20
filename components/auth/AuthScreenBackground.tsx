/**
 * @module components/auth/AuthScreenBackground
 * 認証画面共通の背景画像ラッパー。鳥居の墨絵を薄く全面に敷く。
 * 子要素のタップ・スクロールを妨げないよう absolute で背面に配置する。
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

// 墨絵の存在感を出しつつフォームの可読性を確保するため 0.25 に設定
const BG_OPACITY = 0.25;

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
});
