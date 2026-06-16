/**
 * @module components/auth/GoogleSignInButton
 * Google ログイン / 登録ボタン。
 * ブランドガイドライン要件: Google ロゴ改変禁止、テキストは「Google で〜」形式。
 * 仕様: docs/design/auth-forms.md §0.6
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorActionSecondaryText,
  colorBorder,
  colorBackground,
  colorGoogleBrand,
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
  loading?: boolean;
  onPress?: () => void;
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
  loading = false,
  onPress,
}: GoogleSignInButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={colorGoogleBrand}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : (
          // Google ブランドロゴ代替: Ionicons のロゴアイコンを使用。
          // 正式な4色 SVG は後フェーズで assets に追加する（PM への申し送り事項）。
          <Ionicons
            name="logo-google"
            size={LOGO_SIZE}
            color={disabled ? colorBorder : colorGoogleBrand}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
        <Text style={[styles.label, isDisabled && styles.labelDisabled]}>
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
