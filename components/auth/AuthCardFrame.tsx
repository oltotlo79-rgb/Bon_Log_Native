/**
 * @module components/auth/AuthCardFrame
 * 認証カードの墨筆枠。Web の `.card-washi`（post-frame.svg + わずかな傾き）を
 * ログイン/新規登録/パスワード再設定系の画面に移植する。
 * 仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §4 P3 / §6.3
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import {
  colorSurface,
  spacing2,
  spacing5,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';

// Web の card-washi（post-frame.svg を border-image で伸縮）を PostCard と同じ手法で移植。
// カード高さは画面ごとに可変のため PNG 化せず SVG を都度の実測サイズへ伸縮表示する。
const POST_FRAME_SOURCE = require('@/assets/images/brush-frames/post-frame.svg');

// Web は外側コンテナ -rotate-1 ・カード rotate-1 で非対称さを演出する。
// RN ではスクロール・キーボード回避を伴う外側コンテナは傾けず、
// カード単体のみ Web の card 側と同じ 1deg で傾ける（角度が小さく判定・レイアウトへの影響が無視できるため採用）。
const CARD_ROTATION_DEG = 1;

export type AuthCardFrameProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AuthCardFrame({ children, style }: AuthCardFrameProps) {
  return (
    <View style={[styles.card, style]}>
      {/* 墨筆枠（Web の card-washi）。装飾のため読み上げ対象から除外する */}
      <Image
        source={POST_FRAME_SOURCE}
        style={styles.frame}
        contentFit="fill"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.contentInner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: 0,
    transform: [{ rotate: `${CARD_ROTATION_DEG}deg` }],
    ...shadowWashiLg,
  },
  // 墨筆枠画像。カード全体に伸縮して重ねる（Web の border-image-source 相当）
  frame: {
    ...StyleSheet.absoluteFill,
  },
  // 枠線の視覚的太さ分、既存パディングに spacing2 を足す（PostCard と同じ考え方）
  contentInner: {
    padding: spacing5 + spacing2,
  },
});
