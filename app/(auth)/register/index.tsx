import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  type TextInput,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { AuthTermsAgreement } from '@/components/auth/AuthTermsAgreement';
import { validateEmail, validatePassword, validateNickname } from '@/lib/utils/validate-auth';
import { MAX_NICKNAME_LENGTH } from '@/lib/constants/limits/auth';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  spacing2,
  spacing4,
  spacing6,
  spacing8,
  textBase,
  textXl,
} from '@/lib/constants/design-tokens';
import { routes } from '@/lib/constants/routes';
import {
  ERR_EMAIL_REQUIRED,
  ERR_PASSWORD_REQUIRED,
  ERR_PASSWORD_CONFIRM_REQUIRED,
  ERR_PASSWORD_MISMATCH,
  ERR_TERMS_AGREEMENT_REQUIRED,
  ERR_NETWORK,
  messageForRegisterError,
} from '@/lib/constants/errors';
import { useRegisterMutation } from '@/lib/queries/auth';
import { isApiError } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RegisterScreen() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [termsChecked, setTermsChecked] = useState(false);

  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { mutate: register, isPending } = useRegisterMutation();

  function validateEmailField(value: string): string | null {
    if (value.length === 0) return ERR_EMAIL_REQUIRED;
    return validateEmail(value);
  }

  function validatePasswordField(value: string): string | null {
    if (value.length === 0) return ERR_PASSWORD_REQUIRED;
    return validatePassword(value);
  }

  function validateConfirmField(value: string, passwordValue: string): string | null {
    if (value.length === 0) return ERR_PASSWORD_CONFIRM_REQUIRED;
    if (value !== passwordValue) return ERR_PASSWORD_MISMATCH;
    return null;
  }

  function handleNicknameBlur() {
    setNicknameError(validateNickname(nickname));
  }

  function handleEmailBlur() {
    setEmailError(validateEmailField(email));
  }

  function handlePasswordBlur() {
    setPasswordError(validatePasswordField(password));
  }

  function handleConfirmBlur() {
    setConfirmError(validateConfirmField(confirm, password));
  }

  const allRequiredFilled =
    nickname.length > 0 &&
    email.length > 0 &&
    password.length > 0 &&
    confirm.length > 0;

  function handleSubmit() {
    const newNicknameError = validateNickname(nickname);
    const newEmailError = validateEmailField(email);
    const newPasswordError = validatePasswordField(password);
    const newConfirmError = validateConfirmField(confirm, password);
    setNicknameError(newNicknameError);
    setEmailError(newEmailError);
    setPasswordError(newPasswordError);
    setConfirmError(newConfirmError);

    if (!termsChecked) {
      setFormError(ERR_TERMS_AGREEMENT_REQUIRED);
      return;
    }

    if (
      newNicknameError !== null ||
      newEmailError !== null ||
      newPasswordError !== null ||
      newConfirmError !== null
    ) {
      return;
    }

    setFormError(null);

    register(
      { nickname, email, password },
      {
        onSuccess: () => {
          router.replace(routes.verifyEmailSent);
        },
        onError: (error) => {
          if (isApiError(error)) {
            setFormError(messageForRegisterError(error.code));
          } else {
            setFormError(ERR_NETWORK);
          }
        },
      }
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title} accessibilityRole="header">
            新規登録
          </Text>

          <View style={styles.form}>
            <AuthTextField
              label="ニックネーム"
              value={nickname}
              onChangeText={setNickname}
              onBlur={handleNicknameBlur}
              error={nicknameError}
              disabled={isPending}
              placeholder="表示名（50文字以内）"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              maxLength={MAX_NICKNAME_LENGTH}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <AuthTextField
              ref={emailRef}
              label="メールアドレス"
              value={email}
              onChangeText={setEmail}
              onBlur={handleEmailBlur}
              error={emailError}
              disabled={isPending}
              placeholder="mail@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <PasswordField
              ref={passwordRef}
              label="パスワード"
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
              label="パスワード（確認）"
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

            <AuthTermsAgreement
              checked={termsChecked}
              onToggle={() => setTermsChecked((prev) => !prev)}
              disabled={isPending}
            />

            <FormErrorMessage message={formError} />

            <AuthPrimaryButton
              label="新規登録"
              onPress={handleSubmit}
              disabled={!allRequiredFilled}
              isLoading={isPending}
            />

            <AuthDivider />

            <GoogleSignInButton
              label="Google で登録"
              disabled
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>既にアカウントをお持ちの方は</Text>
              <Link href={routes.login} accessibilityRole="link">
                <Text style={styles.footerLink}>ログイン</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
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
    marginBottom: spacing6,
  },
  form: {
    gap: spacing4,
  },
  footer: {
    marginTop: spacing6,
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  footerText: {
    ...textBase,
    color: colorTextSecondary,
  },
  footerLink: {
    ...textBase,
    color: colorActionPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
