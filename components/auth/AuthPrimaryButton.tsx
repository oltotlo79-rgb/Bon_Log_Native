/**
 * @module components/auth/AuthPrimaryButton
 * 認証フォームの主要アクションボタン（通常 / 無効 / 送信中の3状態）。
 * 仕様: docs/design/auth-forms.md §0.4 / docs/design/sumi-e-theme-parity-2026-07-06.md §4 P2
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { InkRippleLayer } from '@/components/common/InkRippleLayer';
import { useInkRipple } from '@/hooks/use-ink-ripple';
import {
  colorActionPrimaryText,
  letterSpacingWidest,
  radiusLg,
  textBase,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type AuthPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  accessibilityLabel?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUTTON_HEIGHT = 48;

// Web の `[data-slot="button"][data-variant="default"]` 濃淡グラデーション
// （globals.css: 濃墨→やや薄い墨 oklch(0.10 0 0)→oklch(0.28 0.008 50)、135deg）を
// oklch→sRGB 変換した値。押下時は Web の :hover 相当（oklch(0.08 0 0)→oklch(0.22 0.008 50)）
// をそのまま流用する（RN に hover 概念がないため、PostCard の pressed 流用パターンに揃える）。
// design-tokens.ts へのグラデーショントークン集約は core 領域のため、当面ここに留める。
const GRADIENT_SUMI_DEFAULT = ['#030303', '#2c2825'] as const;
const GRADIENT_SUMI_PRESSED = ['#020202', '#1e1a17'] as const;
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthPrimaryButton({
  label,
  onPress,
  disabled = false,
  isLoading = false,
  accessibilityLabel,
}: AuthPrimaryButtonProps) {
  const isDisabled = disabled || isLoading;
  const { ripples, triggerInkRipple } = useInkRipple();

  function handlePressIn(event: GestureResponderEvent) {
    const { locationX, locationY } = event.nativeEvent;
    triggerInkRipple(locationX, locationY);
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={pressed ? GRADIENT_SUMI_PRESSED : GRADIENT_SUMI_DEFAULT}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={[styles.button, isDisabled && styles.buttonDisabled]}
        >
          <InkRippleLayer ripples={ripples} />
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={colorActionPrimaryText}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : (
            <Text style={[styles.label, isDisabled && styles.labelDisabled]}>
              {label}
            </Text>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  label: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
    letterSpacing: letterSpacingWidest,
  },
  labelDisabled: {
    opacity: 1,
  },
});
