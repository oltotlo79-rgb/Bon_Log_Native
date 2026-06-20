/**
 * @module components/auth/AuthBrandHeader
 * 認証画面共通のブランドヘッダー。ロゴ画像とキャッチコピーを中央に表示する。
 * Web 版の認証ページビジュアルをモバイル向けに再現した。
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  colorTextSecondary,
  spacing2,
  spacing8,
  textBase,
  letterSpacingWide,
} from '@/lib/constants/design-tokens';

const LOGO_SOURCE = require('@/assets/images/brand-mark.png');

// ロゴは正方形透過 PNG。幅 140pt で中央配置する
const LOGO_SIZE = 140;

export function AuthBrandHeader() {
  return (
    <View style={styles.container} accessibilityRole="header">
      <Image
        source={LOGO_SOURCE}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="BON-LOG 盆栽SNS"
        accessibilityRole="image"
      />
      <Text style={styles.catchcopy}>盆栽愛好家のためのSNS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing8,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  catchcopy: {
    ...textBase,
    color: colorTextSecondary,
    letterSpacing: letterSpacingWide,
    marginTop: spacing2,
  },
});
