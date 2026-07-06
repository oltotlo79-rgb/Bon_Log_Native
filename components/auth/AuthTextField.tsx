/**
 * @module components/auth/AuthTextField
 * 認証フォーム用のラベル付き入力フィールド。
 * フォーカス状態とエラー状態に応じてボーダースタイルを変える。
 * 仕様: docs/design/auth-forms.md §0.2 / §0.3
 */

import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrushDivider } from '@/components/common/BrushDivider';
import {
  colorBackground,
  colorBorder,
  colorBorderFocus,
  colorError,
  colorTextPrimary,
  colorTextSecondary,
  spacing1,
  spacing2,
  spacing3,
  radiusMd,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  disabled?: boolean;
  /** フィールド右端に配置する追加要素（PasswordField の目アイコン等）*/
  rightElement?: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_HEIGHT = 48;
const ERROR_ICON_SIZE = 12;
const FOCUS_ACCENT_HEIGHT = 3;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(
  function AuthTextField(
    { label, error, disabled, rightElement, style: _style, onBlur, onFocus, ...rest },
    ref
  ) {
    const [isFocused, setIsFocused] = useState(false);

    function handleFocus(e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) {
      setIsFocused(true);
      onFocus?.(e);
    }

    function handleBlur(e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) {
      setIsFocused(false);
      onBlur?.(e);
    }

    const hasError = error !== null && error !== undefined && error !== '';

    const borderColor = hasError
      ? colorError
      : isFocused
        ? colorBorderFocus
        : colorBorder;
    const borderWidth = isFocused && !hasError ? 2 : 1;

    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>

        <View
          style={[
            styles.inputContainer,
            { borderColor, borderWidth },
            disabled && styles.inputContainerDisabled,
          ]}
        >
          <TextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor={colorTextSecondary}
            editable={!disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            accessibilityLabel={label}
            {...rest}
          />
          {rightElement}
        </View>

        {/* Web の `.brush-input`（focus 時の墨筆下線）を近似した装飾アクセント。
            エラー時はエラー表示を優先し重ねない */}
        {isFocused && !hasError && (
          <BrushDivider height={FOCUS_ACCENT_HEIGHT} style={styles.focusAccent} />
        )}

        {hasError && (
          <View
            style={styles.errorRow}
            accessibilityRole="alert"
          >
            <Ionicons
              name="alert-circle-outline"
              size={ERROR_ICON_SIZE}
              color={colorError}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing2,
  },
  label: {
    ...textBase,
    color: colorTextPrimary,
  },
  inputContainer: {
    height: INPUT_HEIGHT,
    borderRadius: radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing3,
    backgroundColor: colorBackground,
  },
  inputContainerDisabled: {
    opacity: 0.5,
  },
  focusAccent: {
    marginTop: spacing1,
  },
  input: {
    flex: 1,
    ...textBase,
    color: colorTextPrimary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    marginTop: spacing1,
  },
  errorText: {
    ...textSm,
    color: colorError,
    flex: 1,
  },
});
