import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  Keyboard,
  type TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TwoFactorCodeField } from '@/components/auth/TwoFactorCodeField';
import type { TwoFactorCodeFieldMode } from '@/components/auth/TwoFactorCodeField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { AuthScreenBackground } from '@/components/auth/AuthScreenBackground';
import { useVerifyTwoFactorMutation } from '@/lib/queries/auth';
import { isApiError } from '@/lib/api/errors';
import {
  ERR_2FA_INVALID_CODE,
  ERR_2FA_TICKET_EXPIRED,
  ERR_2FA_RATE_LIMITED,
  ERR_2FA_NO_TICKET,
  ERR_2FA_SERVER_ERROR,
  ERR_NETWORK,
} from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorActionSecondary,
  colorActionSecondaryText,
  colorSurfaceMuted,
  spacing3,
  spacing4,
  spacing8,
  radiusFull,
  radiusLg,
  textBase,
  textXl,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const SHIELD_CIRCLE_SIZE = 72;
const SHIELD_ICON_SIZE = 36;

// ---------------------------------------------------------------------------
// エラーの種別: チケット消費（フォーム無効化）か再試行可能か
// ---------------------------------------------------------------------------

type ErrorKind = 'ticket-consumed' | 'retryable' | null;

function classifyError(error: Error): { kind: ErrorKind; message: string } {
  // チケット未保持: 直接遷移した場合の不正アクセス防御
  if (error.message.includes('2FA ticket is not available')) {
    return { kind: 'ticket-consumed', message: ERR_2FA_NO_TICKET };
  }

  if (isApiError(error)) {
    if (error.code === 'AUTH_2FA_INVALID_CODE') {
      return { kind: 'ticket-consumed', message: ERR_2FA_INVALID_CODE };
    }
    if (error.code === 'AUTH_2FA_TICKET_EXPIRED') {
      return { kind: 'ticket-consumed', message: ERR_2FA_TICKET_EXPIRED };
    }
    if (error.code === 'RATE_LIMITED') {
      return { kind: 'ticket-consumed', message: ERR_2FA_RATE_LIMITED };
    }
    return { kind: 'retryable', message: ERR_2FA_SERVER_ERROR };
  }
  return { kind: 'retryable', message: ERR_NETWORK };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TwoFactorVerifyScreen() {
  const [mode, setMode] = useState<TwoFactorCodeFieldMode>('totp');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  const codeFieldRef = useRef<TextInput>(null);

  const { mutate: verifyTwoFactor, isPending } = useVerifyTwoFactorMutation();

  // チケット未保持でも最初の送信試行時に classifyError が検知して無効化する。
  // マウント時の自動チェックは API を汚染するため行わない。

  const isFormDisabled = isPending || errorKind === 'ticket-consumed';
  const canSubmit = code.length >= 1 && !isFormDisabled;

  const totpDescription =
    '認証アプリに表示されている 6 桁のコードを入力してください。コードは一定時間で変わります。最新のコードをご確認ください。';
  const backupDescription =
    '認証アプリが利用できない場合は、バックアップコードを入力してください。バックアップコードは 1 回のみ使用できます。';

  function handleModeSwitch(newMode: TwoFactorCodeFieldMode) {
    setMode(newMode);
    setCode('');
    setFormError(null);
    setTimeout(() => {
      codeFieldRef.current?.focus();
    }, 0);
  }

  function handleSubmit() {
    if (!canSubmit) return;

    Keyboard.dismiss();

    verifyTwoFactor(
      { code },
      {
        onSuccess: () => {
          router.replace(routes.feed);
        },
        onError: (error) => {
          const { kind, message } = classifyError(error);
          setFormError(message);
          setErrorKind(kind);
        },
      }
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthScreenBackground style={styles.background}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={SHIELD_ICON_SIZE}
                color={colorTextPrimary}
                accessibilityRole="image"
                accessibilityLabel="セキュリティ"
              />
            </View>

            <Text style={styles.title} accessibilityRole="header">
              2 段階認証
            </Text>

            <Text style={styles.description}>
              {mode === 'totp' ? totpDescription : backupDescription}
            </Text>

            <View style={styles.form}>
              <TwoFactorCodeField
                ref={codeFieldRef}
                mode={mode}
                value={code}
                onChangeText={setCode}
                onSubmitEditing={handleSubmit}
                hasError={formError !== null}
                disabled={isFormDisabled}
              />

              <FormErrorMessage message={formError} />

              {errorKind === 'ticket-consumed' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.returnButton,
                    pressed && styles.returnButtonPressed,
                  ]}
                  onPress={() => router.replace(routes.login)}
                  accessibilityRole="button"
                  accessibilityLabel="ログイン画面へ戻る"
                >
                  <Text style={styles.returnButtonText}>ログイン画面へ戻る</Text>
                </Pressable>
              )}

              <AuthPrimaryButton
                label="確認する"
                onPress={handleSubmit}
                disabled={!canSubmit}
                isLoading={isPending}
              />

              {errorKind !== 'ticket-consumed' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.switchLink,
                    pressed && styles.switchLinkPressed,
                  ]}
                  onPress={() =>
                    handleModeSwitch(mode === 'totp' ? 'backup' : 'totp')
                  }
                  disabled={isFormDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={
                    mode === 'totp'
                      ? 'バックアップコードを使用する'
                      : '認証アプリのコードを使用する'
                  }
                >
                  <Text style={styles.switchLinkText}>
                    {mode === 'totp'
                      ? 'バックアップコードを使用する'
                      : '認証アプリのコードを使用する'}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.backLink,
                  pressed && styles.backLinkPressed,
                ]}
                onPress={() => router.replace(routes.login)}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="ログイン画面に戻る"
              >
                <Text style={styles.backLinkText}>ログイン画面に戻る</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  background: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing8,
    alignItems: 'center',
  },
  iconCircle: {
    width: SHIELD_CIRCLE_SIZE,
    height: SHIELD_CIRCLE_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing8,
  },
  title: {
    ...textXl,
    color: colorTextPrimary,
    textAlign: 'center',
    marginBottom: spacing4,
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
    marginBottom: spacing8,
  },
  form: {
    width: '100%',
    gap: spacing4,
  },
  returnButton: {
    height: 48,
    borderRadius: radiusLg,
    backgroundColor: colorActionSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnButtonPressed: {
    opacity: 0.8,
  },
  returnButtonText: {
    ...textBase,
    color: colorActionSecondaryText,
    fontWeight: '600',
  },
  switchLink: {
    paddingVertical: spacing3,
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  switchLinkPressed: {
    opacity: 0.6,
  },
  switchLinkText: {
    ...textBase,
    color: colorTextLink,
    textDecorationLine: 'underline',
  },
  backLink: {
    paddingVertical: spacing3,
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  backLinkPressed: {
    opacity: 0.6,
  },
  backLinkText: {
    ...textBase,
    color: colorTextSecondary,
    textDecorationLine: 'underline',
  },
});
