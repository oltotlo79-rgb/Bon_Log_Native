/**
 * @module components/post/ComposeFab
 * 投稿ボタン（FAB）。Web の ComposeButton（`.btn-washi` + `button-blob.svg`）を移植。
 * 押下時の scale/rotate と墨滴リップルで Web の active 状態を近似する。
 * 仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §5
 */

import React, { useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { InkRippleLayer } from '@/components/common/InkRippleLayer';
import { useInkRipple } from '@/hooks/use-ink-ripple';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import {
  colorActionPrimaryText,
  spacing4,
  spacing5,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';

// Web の ComposeButton (components/feed/ComposeButton.tsx) は w-20 h-20 (80px) の
// 円形ボタン。モバイル表示のサイズ・配色に合わせる。
const FAB_SIZE = 80;
const FAB_ICON_SIZE = 32;

// Web の btn-washi（button-blob.svg を background-size:100%100%で非一様伸縮）を
// 忠実移植。80x80 固定サイズのため PNG 化せず SVG をそのまま伸縮表示する。
const BUTTON_BLOB_SOURCE = require('@/assets/images/brush-frames/button-blob.svg');

// Web の active 状態（scale(0.95) rotate(-1deg)）を移植
const PRESS_SCALE = 0.95;
const PRESS_ROTATE_DEG = -1;
const PRESS_ANIMATION_DURATION_MS = 150;

export type ComposeFabProps = {
  /** タブバー分を避けた FAB の bottom オフセット */
  bottom: number;
  onPress: () => void;
};

export function ComposeFab({ bottom, onPress }: ComposeFabProps) {
  const reduceMotion = useReduceMotion();
  const { ripples, triggerInkRipple } = useInkRipple();
  // レンダー中の ref.current アクセスを避けるため useState で Animated.Value を保持する
  const [pressAnim] = useState(() => new Animated.Value(0));

  function animateTo(toValue: number) {
    if (reduceMotion) return;
    Animated.timing(pressAnim, {
      toValue,
      duration: PRESS_ANIMATION_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }

  function handlePressIn(event: GestureResponderEvent) {
    const { locationX, locationY } = event.nativeEvent;
    triggerInkRipple(locationX, locationY);
    animateTo(1);
  }

  function handlePressOut() {
    animateTo(0);
  }

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, PRESS_SCALE],
  });
  const rotate = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${PRESS_ROTATE_DEG}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.fab,
        { bottom },
        shadowWashiLg,
        { transform: [{ scale }, { rotate }] },
      ]}
    >
      <Pressable
        style={styles.pressable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel="新規投稿"
        hitSlop={spacing5}
      >
        <Image
          source={BUTTON_BLOB_SOURCE}
          style={styles.fabBlob}
          contentFit="fill"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <InkRippleLayer ripples={ripples} />
        <Ionicons name="pencil" size={FAB_ICON_SIZE} color={colorActionPrimaryText} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing4,
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  pressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBlob: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
});
