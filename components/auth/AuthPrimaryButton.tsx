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
} from 'react-native';
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

  return (
    <Pressable
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
    >
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
