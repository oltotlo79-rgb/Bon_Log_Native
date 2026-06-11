/**
 * @module components/auth/PasswordField
 * AuthTextField に目アイコンによる表示切替ボタンを追加したパスワード入力フィールド。
 * 仕様: docs/design/auth-forms.md §0.5
 */

import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthTextField, type AuthTextFieldProps } from '@/components/auth/AuthTextField';
import { colorTextSecondary, spacing2 } from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PasswordFieldProps = Omit<AuthTextFieldProps, 'secureTextEntry' | 'rightElement'>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOGGLE_BUTTON_SIZE = 44;
const ICON_SIZE = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PasswordField = forwardRef<
  React.ComponentRef<typeof AuthTextField>,
  PasswordFieldProps
>(function PasswordField(props, ref) {
  const [isVisible, setIsVisible] = useState(false);

  function toggleVisibility() {
    setIsVisible((prev) => !prev);
  }

  const toggleElement = (
    <Pressable
      onPress={toggleVisibility}
      accessibilityRole="button"
      accessibilityLabel={isVisible ? 'パスワードを隠す' : 'パスワードを表示'}
      style={styles.toggleButton}
      hitSlop={{ top: 0, bottom: 0, left: spacing2, right: 0 }}
    >
      <Ionicons
        name={isVisible ? 'eye-outline' : 'eye-off-outline'}
        size={ICON_SIZE}
        color={colorTextSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );

  return (
    <AuthTextField
      ref={ref}
      secureTextEntry={!isVisible}
      rightElement={toggleElement}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  toggleButton: {
    width: TOGGLE_BUTTON_SIZE,
    height: TOGGLE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
