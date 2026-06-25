/**
 * @module components/auth/AuthHeroImage
 * 認証画面フォーム上部に配置する welcome 挿絵。
 * Web 版 verify-email-sent の welcome-bonsai.webp 配置をモバイルに移植した。
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { spacing6 } from '@/lib/constants/design-tokens';

const HERO_SOURCE = require('@/assets/images/welcome-bonsai.webp');

// Web 版の幅 200px / 高さ 133px に近いアスペクト比 (3:2) をモバイルで再現する。
// 幅は画面幅に追従させ、高さはアスペクト比から自動算出する。
const HERO_ASPECT_RATIO = 200 / 133;

// Web 版の opacity: 80% を踏襲し、フォームとの視覚的なバランスを維持する。
const HERO_OPACITY = 0.8;

export function AuthHeroImage() {
  return (
    <View style={styles.container}>
      <Image
        source={HERO_SOURCE}
        style={styles.image}
        contentFit="contain"
        accessibilityLabel="盆栽の墨絵"
        accessibilityRole="image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing6,
  },
  image: {
    width: '70%',
    aspectRatio: HERO_ASPECT_RATIO,
    opacity: HERO_OPACITY,
  },
});
