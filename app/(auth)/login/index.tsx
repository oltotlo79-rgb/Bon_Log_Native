import React, { useRef, useState } from 'react';
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
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { validateEmail } from '@/lib/utils/validate-auth';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorError,
  colorErrorBg,
  colorActionPrimary,
  radiusLg,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  textBase,
  textXl,
  text2xl,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { routes } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// エラー文言（auth-forms.md §1.5 準拠）
// ---------------------------------------------------------------------------

const ERR_PASSWORD_REQUIRED = 'パスワードを入力してください';
const ERR_EMAIL_REQUIRED = 'メールアドレスを入力してください';
// API 接続後にエラーハンドリングで使用する定数。現段階では送信未接続のため未使用。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ERR_LOGIN_INVALID_CREDENTIALS = 'メールアドレスまたはパスワードが間違っています';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ERR_EMAIL_NOT_VERIFIED =
  'メールアドレスがまだ確認されていません。確認メールのリンクをクリックするか、下のボタンから再送してください。';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MSG_LOGIN_RATE_LIMITED =
  'ログイン試行回数の上限に達しました。しばらく待ってから再試行してください。';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MSG_LOGIN_ERROR = 'ログイン中にエラーが発生しました。再度お試しください。';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEmailVerifiedError, setIsEmailVerifiedError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  function validateEmailField(value: string): string | null {
    if (value.length === 0) return ERR_EMAIL_REQUIRED;
    return validateEmail(value);
  }

  function validatePasswordField(value: string): string | null {
    if (value.length === 0) return ERR_PASSWORD_REQUIRED;
    return null;
  }

  function handleEmailBlur() {
    setEmailError(validateEmailField(email));
  }

  function handlePasswordBlur() {
    setPasswordError(validatePasswordField(password));
  }

  const allRequiredFilled = email.length > 0 && password.length > 0;

  function handleSubmit() {
    const newEmailError = validateEmailField(email);
    const newPasswordError = validatePasswordField(password);
    setEmailError(newEmailError);
    setPasswordError(newPasswordError);

    if (newEmailError !== null || newPasswordError !== null) {
      return;
    }

    setFormError(null);
    setIsEmailVerifiedError(false);
    setIsSubmitting(true);

    // API 接続は後フェーズで差し替える。現段階は検証完了後に何もしない。
    // 接続後は以下のパターン:
    //   成功 → queryClient.clear() → router.replace(routes.feed)
    //   ERR_EMAIL_NOT_VERIFIED → setIsEmailVerifiedError(true), setFormError(...)
    //   ERR_LOGIN_INVALID_CREDENTIALS → setFormError(ERR_LOGIN_INVALID_CREDENTIALS)
    //   429 → setFormError(MSG_LOGIN_RATE_LIMITED)
    //   network error → setFormError(ERR_NETWORK)
    //   other → setFormError(MSG_LOGIN_ERROR)
    setIsSubmitting(false);
  }

  async function handleResendVerification() {
    // API 接続後に実装する（再送 API → 成功で router.replace(routes.verifyEmailSent)）
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
          <View
            style={styles.header}
            accessibilityRole="header"
            accessibilityLabel="BON-LOG 盆栽SNS"
          >
            <Text style={styles.logo}>BON-LOG</Text>
            <Text style={styles.tagline}>盆栽SNS</Text>
          </View>

          <Text style={styles.title} accessibilityRole="header">
            ログイン
          </Text>

          <View style={styles.form}>
            <AuthTextField
              label="メールアドレス"
              value={email}
              onChangeText={setEmail}
              onBlur={handleEmailBlur}
              error={emailError}
              disabled={isSubmitting}
              placeholder="mail@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityHint="メールアドレスを入力してください"
            />

            <PasswordField
              ref={passwordRef}
              label="パスワード"
              value={password}
              onChangeText={setPassword}
              onBlur={handlePasswordBlur}
              error={passwordError}
              disabled={isSubmitting}
              placeholder="8文字以上（英字・数字を含む）"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              accessibilityHint="8文字以上の英字と数字を含むパスワード"
            />

            <FormErrorMessage message={formError} />

            {isEmailVerifiedError && (
              <Pressable
                style={({ pressed }) => [
                  styles.resendButton,
                  pressed && styles.resendButtonPressed,
                ]}
                onPress={handleResendVerification}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="確認メールを再送する"
              >
                <Text style={styles.resendButtonText}>
                  {isSubmitting ? '送信中...' : '確認メールを再送する'}
                </Text>
              </Pressable>
            )}

            <AuthPrimaryButton
              label="ログイン"
              onPress={handleSubmit}
              disabled={!allRequiredFilled}
              isLoading={isSubmitting}
            />

            <AuthDivider />

            <GoogleSignInButton
              label="Google でログイン"
              disabled
            />
          </View>

          <View style={styles.footer}>
            <Link href={routes.passwordReset} accessibilityRole="link">
              <Text style={styles.link}>パスワードをお忘れですか？</Text>
            </Link>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>アカウントをお持ちでない方は</Text>
              <Link href={routes.register} accessibilityRole="link">
                <Text style={styles.footerLink}>新規登録</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing8,
  },
  logo: {
    ...text2xl,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
  },
  tagline: {
    ...textBase,
    color: colorTextSecondary,
    marginTop: spacing2,
  },
  title: {
    ...textXl,
    color: colorTextPrimary,
    marginBottom: spacing6,
  },
  form: {
    gap: spacing4,
  },
  resendButton: {
    backgroundColor: colorErrorBg,
    borderColor: colorError,
    borderWidth: 1,
    borderRadius: radiusLg,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    alignItems: 'center',
  },
  resendButtonPressed: {
    opacity: 0.7,
  },
  resendButtonText: {
    ...textBase,
    color: colorError,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing6,
    alignItems: 'center',
    gap: spacing4,
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
  link: {
    ...textBase,
    color: colorTextLink,
    textDecorationLine: 'underline',
  },
  footerLink: {
    ...textBase,
    color: colorActionPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

