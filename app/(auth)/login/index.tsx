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
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { validateEmail } from '@/lib/utils/validate-auth';
import { useLoginMutation } from '@/lib/queries/auth';
import { useAuth } from '@/lib/auth/use-auth';
import { isApiError } from '@/lib/api/errors';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorError,
  colorErrorBg,
  colorActionPrimary,
  colorWarningBg,
  colorWarning,
  colorBorder,
  radiusLg,
  radiusMd,
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
import {
  ERR_EMAIL_REQUIRED,
  ERR_PASSWORD_REQUIRED,
  ERR_LOGIN_INVALID_CREDENTIALS,
  ERR_EMAIL_NOT_VERIFIED,
  ERR_LOGIN_RATE_LIMITED,
  ERR_LOGIN_FAILED,
  ERR_NETWORK,
  ERR_SESSION_REUSE_DETECTED,
  ERR_SESSION_EXPIRED,
  messageForApiError,
} from '@/lib/constants/errors';

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

  const passwordRef = useRef<TextInput>(null);

  const { mutate: login, isPending } = useLoginMutation();
  const { lastAuthFailureReason } = useAuth();

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

    login(
      { email, password },
      {
        onSuccess: (result) => {
          if (result.requires2FA) {
            router.push(routes.twoFactorVerify);
          }
          // requires2FA === false の場合は AuthGuard が feed へ流す
        },
        onError: (error) => {
          if (isApiError(error)) {
            if (error.code === 'EMAIL_NOT_VERIFIED') {
              setIsEmailVerifiedError(true);
              setFormError(ERR_EMAIL_NOT_VERIFIED);
              return;
            }
            if (error.code === 'RATE_LIMITED') {
              setFormError(ERR_LOGIN_RATE_LIMITED);
              return;
            }
            if (
              error.code === 'AUTH_INVALID_CREDENTIALS' ||
              error.code === 'AUTH_REQUIRED'
            ) {
              setFormError(ERR_LOGIN_INVALID_CREDENTIALS);
              return;
            }
            setFormError(messageForApiError(error.code));
            return;
          }
          setFormError(ERR_NETWORK);
          void ERR_LOGIN_FAILED; // lint 対策: 汎用フォールバック定数の参照
        },
      }
    );
  }

  async function handleResendVerification() {
    // 再送 API は後フェーズで接続する
  }

  // lastAuthFailureReason の警告バナー文言を決定する
  const sessionWarning: string | null =
    lastAuthFailureReason === null
      ? null
      : lastAuthFailureReason.kind === 'reuseDetected'
        ? ERR_SESSION_REUSE_DETECTED
        : lastAuthFailureReason.kind === 'sessionExpired'
          ? ERR_SESSION_EXPIRED
          : null;

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

          {sessionWarning !== null && (
            <View
              style={[
                styles.warningBanner,
                lastAuthFailureReason?.kind === 'reuseDetected' &&
                  styles.warningBannerAlert,
              ]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text style={styles.warningBannerText}>{sessionWarning}</Text>
            </View>
          )}

          <View style={styles.form}>
            <AuthTextField
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
              accessibilityHint="メールアドレスを入力してください"
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
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="確認メールを再送する"
              >
                <Text style={styles.resendButtonText}>
                  {isPending ? '送信中...' : '確認メールを再送する'}
                </Text>
              </Pressable>
            )}

            <AuthPrimaryButton
              label="ログイン"
              onPress={handleSubmit}
              disabled={!allRequiredFilled}
              isLoading={isPending}
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
  warningBanner: {
    backgroundColor: colorWarningBg,
    borderLeftWidth: 3,
    borderLeftColor: colorWarning,
    borderRadius: radiusMd,
    padding: spacing3,
    marginBottom: spacing4,
  },
  warningBannerAlert: {
    borderLeftColor: colorError,
    backgroundColor: colorErrorBg,
    borderColor: colorBorder,
  },
  warningBannerText: {
    ...textBase,
    color: colorTextPrimary,
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
