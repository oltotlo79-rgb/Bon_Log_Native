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
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { AuthHeroImage } from '@/components/auth/AuthHeroImage';
import { AuthScreenBackground } from '@/components/auth/AuthScreenBackground';
import { AuthCardFrame } from '@/components/auth/AuthCardFrame';
import { ResendVerificationButton } from '@/components/auth/ResendVerificationButton';
import { GoogleTermsAgreementModal } from '@/components/auth/GoogleTermsAgreementModal';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import { validateEmail } from '@/lib/utils/validate-auth';
import { useLoginMutation } from '@/lib/queries/auth';
import { useTermsVersion } from '@/lib/queries/legal';
import { useAuth } from '@/lib/auth/use-auth';
import { useGoogleAuth } from '@/lib/auth';
import { isApiError, isTermsAcceptanceRequired } from '@/lib/api/errors';
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
  radiusMd,
  spacing2,
  spacing3,
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
  ERR_LOGIN_INVALID_CREDENTIALS,
  ERR_EMAIL_NOT_VERIFIED,
  ERR_LOGIN_RATE_LIMITED,
  ERR_LOGIN_FAILED,
  ERR_NETWORK,
  ERR_SESSION_REUSE_DETECTED,
  ERR_SESSION_EXPIRED,
  ERR_GENERIC,
  ERR_VERIFY_EMAIL_RESEND_RATE_LIMITED,
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
  const [showGoogleTermsModal, setShowGoogleTermsModal] = useState(false);
  // モーダルを開かせた（＝初回表示のトリガーとなった）エラー参照。
  // モーダル内で再送して同じ TERMS_ACCEPTANCE_REQUIRED が再発しても別インスタンスになるため、
  // この参照との差分でモーダル内エラー表示（再送分のみ）を判定できる。
  const [modalOpenedForError, setModalOpenedForError] = useState<Error | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const { toast, showToast, hideToast } = useToast();

  const { mutate: login, isPending } = useLoginMutation();
  const { lastAuthFailureReason } = useAuth();
  const { signIn: googleSignIn, isLoading: isGoogleLoading, isAvailable: isGoogleAvailable, error: googleError } = useGoogleAuth();
  const { version: termsVersion } = useTermsVersion();

  const [prevGoogleError, setPrevGoogleError] = useState(googleError);
  // 新規ユーザー作成時のみサーバーが 403 TERMS_ACCEPTANCE_REQUIRED を返す（auth-tokens.md）。
  // レンダー中に前回値と比較して更新する React 公式パターン（副作用ではなく派生 state の調整）。
  if (googleError !== prevGoogleError) {
    setPrevGoogleError(googleError);
    if (isTermsAcceptanceRequired(googleError) && !showGoogleTermsModal) {
      setShowGoogleTermsModal(true);
      setModalOpenedForError(googleError);
    }
  }

  function handleGoogleTermsCancel() {
    setShowGoogleTermsModal(false);
    setModalOpenedForError(null);
  }

  function handleGoogleTermsConfirm() {
    googleSignIn({ termsAccepted: true, termsVersion })
      .then(() => {
        setShowGoogleTermsModal(false);
        setModalOpenedForError(null);
      })
      .catch(() => {
        // エラーは googleError 経由でモーダル内に表示する
      });
  }

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
    if (isGoogleLoading) return;

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
          if (error instanceof TypeError) {
            setFormError(ERR_NETWORK);
          } else {
            setFormError(ERR_LOGIN_FAILED);
          }
        },
      }
    );
  }

  function handleResendError(error: unknown) {
    const message =
      isApiError(error) && error.code === 'RATE_LIMITED'
        ? ERR_VERIFY_EMAIL_RESEND_RATE_LIMITED
        : ERR_GENERIC;
    showToast(message, 'error');
  }

  function handleResendSuccess() {
    router.push(routes.verifyEmailSent);
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

            <AuthCardFrame>
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
                  disabled={isPending || isGoogleLoading}
                  placeholder="mail@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityHint="メールアドレスを入力してください"
                  testID="login-email-input"
                />

                <PasswordField
                  ref={passwordRef}
                  label="パスワード"
                  value={password}
                  onChangeText={setPassword}
                  onBlur={handlePasswordBlur}
                  error={passwordError}
                  disabled={isPending || isGoogleLoading}
                  placeholder="8文字以上（英字・数字を含む）"
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="done"
                  accessibilityHint="8文字以上の英字と数字を含むパスワード"
                  testID="login-password-input"
                />

                <FormErrorMessage message={formError} />

                {isEmailVerifiedError && email.length > 0 && (
                  <ResendVerificationButton
                    email={email}
                    onSuccess={handleResendSuccess}
                    onError={handleResendError}
                  />
                )}

                <AuthPrimaryButton
                  label="ログイン"
                  onPress={handleSubmit}
                  disabled={!allRequiredFilled || isGoogleLoading}
                  isLoading={isPending}
                  testID="login-submit-button"
                />

                <AuthDivider />

                <GoogleSignInButton
                  label="Google でログイン"
                  disabled={!isGoogleAvailable || isPending}
                  loading={isGoogleLoading}
                  onPress={() => {
                    void googleSignIn();
                  }}
                />

                <FormErrorMessage
                  message={showGoogleTermsModal ? null : googleError?.message ?? null}
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
            </AuthCardFrame>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthScreenBackground>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />

      <GoogleTermsAgreementModal
        visible={showGoogleTermsModal}
        onConfirm={handleGoogleTermsConfirm}
        onCancel={handleGoogleTermsCancel}
        isSubmitting={isGoogleLoading}
        error={
          showGoogleTermsModal && googleError !== null && googleError !== modalOpenedForError
            ? googleError.message
            : null
        }
      />
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
