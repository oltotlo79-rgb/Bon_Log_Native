/**
 * @module components/common/InkRippleLayer
 * useInkRipple が管理するリップル状態を描画するオーバーレイ。
 * Web の `.ink-ripple`（黒の放射グラデーションが押下座標から滲む）を
 * 単色円 + opacity アニメーションで近似する。
 * 仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §3.4
 */

import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { InkRippleState } from '@/hooks/use-ink-ripple';
import { INK_RIPPLE_MAX_SCALE } from '@/hooks/use-ink-ripple';

const RIPPLE_BASE_SIZE = 4;

type InkRippleLayerProps = {
  ripples: readonly InkRippleState[];
};

export function InkRippleLayer({ ripples }: InkRippleLayerProps) {
  return (
    <>
      {ripples.map((ripple) => {
        const scale = ripple.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, INK_RIPPLE_MAX_SCALE],
        });
        const opacity = ripple.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.7, 0.3, 0],
        });

        return (
          <Animated.View
            key={ripple.key}
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                left: ripple.x - RIPPLE_BASE_SIZE / 2,
                top: ripple.y - RIPPLE_BASE_SIZE / 2,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  ripple: {
    position: 'absolute',
    width: RIPPLE_BASE_SIZE,
    height: RIPPLE_BASE_SIZE,
    borderRadius: RIPPLE_BASE_SIZE / 2,
    backgroundColor: '#000000',
  },
});
