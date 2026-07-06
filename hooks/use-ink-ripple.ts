/**
 * @module hooks/use-ink-ripple
 * Web の `.ink-ripple`（押下座標から滲む墨滴フィードバック）を近似する UI フック。
 * react-native-svg 等の新規依存を追加せず、Animated の円形 View で拡散・フェードを表現する。
 * 仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §3.4
 */

import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useReduceMotion } from './use-reduce-motion';

/** Web の `ink-ripple-spread` と同じ拡散時間（0.8s） */
export const INK_RIPPLE_DURATION_MS = 800;
/** 拡散後の最終スケール（Web は scale(80) を 4px の基準円に適用 = 直径320px相当）*/
export const INK_RIPPLE_MAX_SCALE = 18;

export type InkRippleState = {
  key: number;
  x: number;
  y: number;
  progress: Animated.Value;
};

export function useInkRipple() {
  const reduceMotion = useReduceMotion();
  const [ripples, setRipples] = useState<readonly InkRippleState[]>([]);
  const nextKeyRef = useRef(0);

  const triggerInkRipple = useCallback(
    (x: number, y: number) => {
      if (reduceMotion) return;

      const key = nextKeyRef.current;
      nextKeyRef.current += 1;
      const progress = new Animated.Value(0);

      setRipples((prev) => [...prev, { key, x, y, progress }]);

      Animated.timing(progress, {
        toValue: 1,
        duration: INK_RIPPLE_DURATION_MS,
        useNativeDriver: true,
      }).start(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.key !== key));
      });
    },
    [reduceMotion]
  );

  return { ripples, triggerInkRipple };
}
