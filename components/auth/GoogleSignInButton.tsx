/**
 * @module components/auth/GoogleSignInButton
 * Google ログイン / 登録ボタン。
 * 現フェーズは disabled。expo-auth-session 接続は後フェーズで行う（PM 決定事項）。
 * ブランドガイドライン要件: Google ロゴ改変禁止、テキストは「Google で〜」形式。
 * 仕様: docs/design/auth-forms.md §0.6
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorActionSecondaryText,
  colorBorder,
  colorBackground,
  radiusLg,
  spacing2,
  spacing3,
  textBase,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type GoogleSignInButtonProps = {
  label: string;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUTTON_HEIGHT = 48;
const LOGO_SIZE = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoogleSignInButton({
  label,
  disabled = false,
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.buttonDisabled]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <View style={styles.content}>
        {/* Google ブランドロゴ代替: Ionicons のロゴアイコンを使用。
            正式な4色 SVG は後フェーズで assets に追加する（PM への申し送り事項）。*/}
        <Ionicons
          name="logo-google"
          size={LOGO_SIZE}
          color={disabled ? colorBorder : '#4285F4'}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: BUTTON_HEIGHT,
    backgroundColor: colorBackground,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: colorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  label: {
    ...textBase,
    color: colorActionSecondaryText,
    fontWeight: '600',
  },
  labelDisabled: {
    opacity: 1,
  },
});
