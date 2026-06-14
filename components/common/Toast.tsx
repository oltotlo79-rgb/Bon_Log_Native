/**
 * @module components/common/Toast
 * 画面下部に短時間表示するトースト通知コンポーネント。
 * 既存の OfflineBanner / ScreenError などと同一の common 層に配置する。
 * TIMEOUT_TOAST（3000ms）後に自動で非表示になる。
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import {
  colorTextInverse,
  colorActionPrimary,
  colorError,
  colorWarning,
  spacing3,
  spacing4,
  radiusMd,
  textSm,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';
import { TIMEOUT_TOAST } from '@/lib/constants/limits/ui';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type ToastVariant = 'default' | 'error' | 'warning';

export type ToastProps = {
  message: string;
  visible: boolean;
  variant?: ToastVariant;
  /** 表示終了時に呼ばれるコールバック。親が visible を false にするために使う */
  onHide: () => void;
};

// ---------------------------------------------------------------------------
// バリアント別背景色
// ---------------------------------------------------------------------------

const VARIANT_BG: Record<ToastVariant, string> = {
  default: colorActionPrimary,
  error: colorError,
  warning: colorWarning,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Toast({ message, visible, variant = 'default', onHide }: ToastProps) {
  // useState で Animated.Value を保持する（レンダー中の ref.current アクセスを避けるため）
  const [opacity] = useState(() => new Animated.Value(0));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onHide();
        });
      }, TIMEOUT_TOAST);
    } else {
      opacity.setValue(0);
    }
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  // onHide は毎レンダーで変わり得るため依存配列から除外し、refで安定化させる
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) {
    return null;
  }

  const backgroundColor = VARIANT_BG[variant];

  return (
    <Animated.View
      style={[styles.container, { opacity, backgroundColor }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
    >
      <View style={styles.inner}>
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing4 * 3,
    left: spacing4,
    right: spacing4,
    borderRadius: radiusMd,
    ...shadowWashiLg,
    zIndex: 9999,
  },
  inner: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
  },
  message: {
    ...textSm,
    color: colorTextInverse,
    textAlign: 'center',
  },
});
