/**
 * @module components/auth/TwoFactorCodeField
 * 2FA コード入力フィールド。
 * TOTP（6桁数字キーパッド）とバックアップコード（通常キーボード）の両モードに対応する。
 * 仕様: docs/design/two-factor-auth.md §4.1
 */

import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import {
  colorBackground,
  colorBorder,
  colorBorderFocus,
  colorError,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  radiusMd,
  textLg,
  textBase,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FIELD_HEIGHT = 52;
const TOTP_MAX_LENGTH = 6;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TwoFactorCodeFieldMode = 'totp' | 'backup';

type TwoFactorCodeFieldProps = {
  mode: TwoFactorCodeFieldMode;
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  hasError?: boolean;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TwoFactorCodeField = forwardRef<TextInput, TwoFactorCodeFieldProps>(
  function TwoFactorCodeField(
    { mode, value, onChangeText, onSubmitEditing, hasError = false, disabled = false },
    ref
  ) {
    const [isFocused, setIsFocused] = useState(false);

    function handleFocus(e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) {
      setIsFocused(true);
      // TextInputProps 型の onFocus は使わないためイベントは消費のみ
      void e;
    }

    function handleBlur(e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) {
      setIsFocused(false);
      void e;
    }

    function handleChangeText(text: string) {
      if (mode === 'totp') {
        // TOTP モードでは数字のみ・先頭 6 文字に切り詰める
        const digitsOnly = text.replace(/\D/g, '');
        onChangeText(digitsOnly.slice(0, TOTP_MAX_LENGTH));
      } else {
        onChangeText(text);
      }
    }

    const borderColor = hasError
      ? colorError
      : isFocused
        ? colorBorderFocus
        : colorBorder;
    const borderWidth = isFocused && !hasError ? 2 : 1;

    const label = mode === 'totp' ? '認証コード' : 'バックアップコード';
    const placeholder = mode === 'totp' ? '000000' : 'XXXX-XXXXXXXX';
    const accessibilityLabel =
      mode === 'totp' ? '認証コード入力フィールド' : 'バックアップコード入力フィールド';

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
            style={[
              styles.input,
              mode === 'backup' && styles.inputBackup,
            ]}
            value={value}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={onSubmitEditing}
            placeholder={placeholder}
            placeholderTextColor={colorTextSecondary}
            keyboardType={mode === 'totp' ? 'number-pad' : 'default'}
            autoComplete={mode === 'totp' ? 'one-time-code' : 'off'}
            textContentType={mode === 'totp' ? 'oneTimeCode' : 'none'}
            autoCapitalize={mode === 'totp' ? 'none' : 'characters'}
            autoCorrect={false}
            returnKeyType="done"
            editable={!disabled}
            accessibilityLabel={accessibilityLabel}
          />
        </View>
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
    height: FIELD_HEIGHT,
    borderRadius: radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing3,
    backgroundColor: colorBackground,
  },
  inputContainerDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    textAlign: 'center',
  },
  inputBackup: {
    // バックアップコードは英数字混在で中央揃えは読みにくいため左揃えにする
    textAlign: 'left',
    letterSpacing: 0,
  },
});
