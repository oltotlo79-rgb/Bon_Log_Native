/**
 * @module components/auth/AuthPrimaryButton
 * 認証フォームの主要アクションボタン（通常 / 無効 / 送信中の3状態）。
 * 仕様: docs/design/auth-forms.md §0.4
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from 'react-native';
import { InkRippleLayer } from '@/components/common/InkRippleLayer';
import { useInkRipple } from '@/hooks/use-ink-ripple';
import {
  colorActionPrimary,
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
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      onPressIn={handlePressIn}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: BUTTON_HEIGHT,
    backgroundColor: colorActionPrimary,
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
