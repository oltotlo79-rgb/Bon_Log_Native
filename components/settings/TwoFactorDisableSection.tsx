/**
 * @module components/settings/TwoFactorDisableSection
 * 2FA 無効化フロー（パスワード確認 → 確認ダイアログ → 無効化）。
 * Web 版と同じくパスワードで本人確認する（TOTP コードではない）。
 */

import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useDisableTwoFactorMutation } from '@/lib/queries/auth';
import { isApiError, type MobileApiErrorCode } from '@/lib/api/errors';
import {
  messageForApiError,
  ERR_GENERIC,
  ERR_OFFLINE_ACTION,
  ERR_2FA_DISABLE_INCORRECT_PASSWORD,
  ERR_2FA_NOT_ENABLED,
} from '@/lib/constants/errors';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import {
  colorSurface,
  colorSuccessBg,
  colorTextPrimary,
  colorTextSecondary,
  colorError,
  spacing3,
  spacing4,
  radiusLg,
  textLg,
  textSm,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TwoFactorDisableSectionProps = {
  isOnline: boolean;
};

type Step = 'idle' | 'success';

/**
 * 設定画面の 2FA 無効化フロー専用のエラー文言変換。
 * パスワード確認・二重無効化のケースを汎用文言より具体的な案内に上書きする。
 */
function messageForDisableTwoFactorError(code: MobileApiErrorCode): string {
  if (code === 'AUTH_INVALID_CREDENTIALS') return ERR_2FA_DISABLE_INCORRECT_PASSWORD;
  if (code === 'CONFLICT') return ERR_2FA_NOT_ENABLED;
  return messageForApiError(code);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TwoFactorDisableSection({ isOnline }: TwoFactorDisableSectionProps) {
  const [step, setStep] = useState<Step>('idle');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const disableMutation = useDisableTwoFactorMutation();

  function resetToIdle() {
    setStep('idle');
    setPassword('');
    setError(null);
  }

  function handleDisable() {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    setError(null);
    Alert.alert(
      '2段階認証を無効化しますか？',
      '無効にすると、ログイン時に認証アプリのコードが不要になり、アカウントのセキュリティが低下します。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '無効化する',
          style: 'destructive',
          onPress: () => confirmDisable(),
        },
      ]
    );
  }

  function confirmDisable() {
    disableMutation.mutate(
      { password },
      {
        onSuccess: () => {
          setPassword('');
          setStep('success');
        },
        onError: (err) => {
          setError(isApiError(err) ? messageForDisableTwoFactorError(err.code) : ERR_GENERIC);
        },
      }
    );
  }

  const canSubmit = password.length > 0 && !disableMutation.isPending && isOnline;

  if (step === 'success') {
    return (
      <View style={[styles.card, styles.successCard]}>
        <Text style={styles.title}>2段階認証を無効にしました</Text>
        <Text style={styles.description}>
          ログイン時に認証アプリのコードは不要になりました。
        </Text>
        <AuthPrimaryButton label="閉じる" onPress={resetToIdle} />
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.dangerCard]}>
      <Text style={styles.dangerTitle}>2段階認証を無効化</Text>
      <Text style={styles.description}>
        パスワードを入力して、2段階認証を無効にします。
      </Text>

      <PasswordField
        label="パスワード"
        value={password}
        onChangeText={setPassword}
        disabled={disableMutation.isPending}
        placeholder="現在のパスワード"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        accessibilityHint="2段階認証を無効化するための本人確認用パスワード"
      />

      <FormErrorMessage message={error} />

      <AuthPrimaryButton
        label="無効化する"
        onPress={handleDisable}
        disabled={!canSubmit}
        isLoading={disableMutation.isPending}
        accessibilityLabel="2段階認証を無効化する"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  successCard: {
    backgroundColor: colorSuccessBg,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: colorError,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
  },
  dangerTitle: {
    ...textLg,
    color: colorError,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
  },
});
