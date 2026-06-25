import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  type TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { AuthHeroImage } from '@/components/auth/AuthHeroImage';
import { AuthScreenBackground } from '@/components/auth/AuthScreenBackground';
import { validatePassword } from '@/lib/utils/validate-auth';
import { usePasswordResetConfirmMutation } from '@/lib/queries/auth';
import { isApiError } from '@/lib/api/errors';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorSuccess,
  colorSuccessBg,
  colorError,
  colorErrorBg,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  textBase,
  textXl,
} from '@/lib/constants/design-tokens';
import { routes } from '@/lib/constants/routes';
import { TIMEOUT_AUTO_REDIRECT } from '@/lib/constants/limits';
import {
  ERR_NEW_PASSWORD_REQUIRED,
  ERR_PASSWORD_CONFIRM_REQUIRED,
  ERR_PASSWORD_MISMATCH,
  ERR_RESET_LINK_INVALID,
  ERR_PASSWORD_UPDATE_FAILED,
  ERR_NETWORK,
  MSG_RESET_LINK_INVALID_TITLE,
  MSG_RESET_LINK_INVALID_BODY,
  MSG_PASSWORD_UPDATED_TITLE,
  MSG_PASSWORD_UPDATED_BODY,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 状態の型
// ---------------------------------------------------------------------------

type PageState = 'token-invalid' | 'form' | 'success';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PasswordResetConfirmScreen() {
  const params = useLocalSearchParams();

  // useLocalSearchParams は string | string[] を返すため型ガードで絞る
  const token = typeof params.token === 'string' ? params.token : null;
  const emailParam = typeof params.email === 'string' ? params.email : null;

  const initialPageState: PageState =
    token !== null && token.length > 0 && emailParam !== null && emailParam.length > 0
      ? 'form'
      : 'token-invalid';

  const [pageState, setPageState] = useState<PageState>(initialPageState);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const confirmRef = useRef<TextInput>(null);

  const { mutate: confirmReset, isPending } = usePasswordResetConfirmMutation();

  useEffect(() => {
    if (pageState !== 'success') return;

    const timer = setTimeout(() => {
      router.replace(routes.login);
    }, TIMEOUT_AUTO_REDIRECT);

    return () => clearTimeout(timer);
  }, [pageState]);

  function validatePasswordField(value: string): string | null {
    if (value.length === 0) return ERR_NEW_PASSWORD_REQUIRED;
    return validatePassword(value);
  }

  function validateConfirmField(value: string): string | null {
    if (value.length === 0) return ERR_PASSWORD_CONFIRM_REQUIRED;
    if (value !== password) return ERR_PASSWORD_MISMATCH;
    return null;
  }

  function handlePasswordBlur() {
    setPasswordError(validatePasswordField(password));
  }

  function handleConfirmBlur() {
    setConfirmError(validateConfirmField(confirm));
  }

  const allRequiredFilled = password.length > 0 && confirm.length > 0;

  function handleSubmit() {
    const newPasswordError = validatePasswordField(password);
    const newConfirmError = validateConfirmField(confirm);
    setPasswordError(newPasswordError);
    setConfirmError(newConfirmError);

    if (newPasswordError !== null || newConfirmError !== null) {
      return;
    }

    if (token === null || emailParam === null) {
      setPageState('token-invalid');
      return;
    }

    setFormError(null);

    confirmReset(
      { email: emailParam, token, newPassword: password },
      {
        onSuccess: () => {
          setPageState('success');
        },
        onError: (error) => {
          if (isApiError(error)) {
            if (error.status === 401 || error.code === 'AUTH_INVALID_TOKEN') {
              setPageState('token-invalid');
              return;
            }
            setFormError(ERR_PASSWORD_UPDATE_FAILED);
            return;
          }
          setFormError(ERR_NETWORK);
          void ERR_RESET_LINK_INVALID; // lint 対策: 定数参照
        },
      }
    );
  }

  if (pageState === 'token-invalid') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AuthScreenBackground style={styles.background}>
          <View style={styles.scrollContent}>
            <AuthBrandHeader />

            <AuthHeroImage />

            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerTitle}>{MSG_RESET_LINK_INVALID_TITLE}</Text>
              <Text style={styles.errorBannerBody}>{MSG_RESET_LINK_INVALID_BODY}</Text>
            </View>

            <Pressable
              onPress={() => router.replace(routes.passwordReset)}
              style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
              accessibilityRole="link"
              accessibilityLabel="パスワードリセットを再度リクエスト"
            >
              <Text style={styles.linkText}>パスワードリセットを再度リクエスト</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace(routes.login)}
              style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
              accessibilityRole="link"
              accessibilityLabel="ログインページへ戻る"
            >
              <Text style={styles.linkText}>ログインページへ戻る</Text>
            </Pressable>
          </View>
        </AuthScreenBackground>
      </SafeAreaView>
    );
  }

  if (pageState === 'success') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AuthScreenBackground style={styles.background}>
          <View style={styles.scrollContent}>
            <AuthBrandHeader />

            <AuthHeroImage />

            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>{MSG_PASSWORD_UPDATED_TITLE}</Text>
              <Text style={styles.successBody}>{MSG_PASSWORD_UPDATED_BODY}</Text>
            </View>

            <Pressable
              onPress={() => router.replace(routes.login)}
              style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
              accessibilityRole="link"
              accessibilityLabel="今すぐログインする"
            >
              <Text style={styles.linkText}>今すぐログインする</Text>
            </Pressable>
          </View>
        </AuthScreenBackground>
      </SafeAreaView>
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
            <AuthBrandHeader />

            <AuthHeroImage />

            <Text style={styles.title} accessibilityRole="header">
              新しいパスワードを設定
            </Text>

            <Text style={styles.description}>新しいパスワードを入力してください。</Text>

            <View style={styles.form}>
              <PasswordField
                label="新しいパスワード"
                value={password}
                onChangeText={setPassword}
                onBlur={handlePasswordBlur}
                error={passwordError}
                disabled={isPending}
                placeholder="8文字以上（英字・数字を含む）"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />

              <PasswordField
                ref={confirmRef}
                label="新しいパスワード（確認）"
                value={confirm}
                onChangeText={setConfirm}
                onBlur={handleConfirmBlur}
                error={confirmError}
                disabled={isPending}
                placeholder="もう一度入力"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
              />

              <FormErrorMessage message={formError} />

              <AuthPrimaryButton
                label="パスワードを変更する"
                onPress={handleSubmit}
                disabled={!allRequiredFilled}
                isLoading={isPending}
              />

              <Pressable
                onPress={() => router.replace(routes.login)}
                style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
                accessibilityRole="link"
                accessibilityLabel="ログインページへ戻る"
              >
                <Text style={styles.linkText}>ログインページへ戻る</Text>
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
    paddingHorizontal: spacing4,
    paddingVertical: spacing8,
  },
  title: {
    ...textXl,
    color: colorTextPrimary,
    marginBottom: spacing4,
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    marginBottom: spacing6,
  },
  form: {
    gap: spacing4,
  },
  errorBanner: {
    backgroundColor: colorErrorBg,
    borderLeftWidth: 3,
    borderLeftColor: colorError,
    borderRadius: radiusMd,
    padding: spacing3,
    marginBottom: spacing4,
    gap: spacing3,
  },
  errorBannerTitle: {
    ...textBase,
    color: colorError,
    fontWeight: '600',
  },
  errorBannerBody: {
    ...textBase,
    color: colorError,
  },
  successBanner: {
    backgroundColor: colorSuccessBg,
    borderLeftWidth: 3,
    borderLeftColor: colorSuccess,
    borderRadius: radiusMd,
    padding: spacing3,
    marginBottom: spacing4,
    gap: spacing3,
  },
  successTitle: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  successBody: {
    ...textBase,
    color: colorTextPrimary,
  },
  link: {
    paddingVertical: spacing3,
    alignSelf: 'flex-start',
  },
  linkPressed: {
    opacity: 0.6,
  },
  linkText: {
    ...textBase,
    color: colorTextLink,
    textDecorationLine: 'underline',
  },
});
