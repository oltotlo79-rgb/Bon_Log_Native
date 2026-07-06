/**
 * @module hooks/use-reduce-motion
 * OS の「視差効果を減らす」設定を購読する UI フック。
 * Web 版が `prefers-reduced-motion` でインクリップル等の装飾アニメーションを
 * 無効化しているのと同じ配慮を RN 側でも行う（sumi-e-theme-parity §7）。
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
