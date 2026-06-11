import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { validateEmail } from '@/lib/utils/validate-auth';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorSuccess,
  colorSuccessBg,
  colorTextLink,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  textBase,
  textSm,
  textXl,
} from '@/lib/constants/design-tokens';
import { routes } from '@/lib/constants/routes';
import { router } from 'expo-router';
import {
  ERR_EMAIL_REQUIRED,
  // API 接続後フェーズで使用（現段階は送信未接続のため未使用）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ERR_PASSWORD_RESET_RATE_LIMITED,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ERR_PASSWORD_RESET_SEND_FAILED,
  MSG_PASSWORD_RESET_SENT_TITLE,
  MSG_PASSWORD_RESET_SENT_BODY,
  MSG_PASSWORD_RESET_SENT_HINT,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PasswordResetScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // API 接続後に setIsSuccess(true) で成功状態に切り替える
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSuccess, setIsSuccess] = useState(false);

  function validateEmailField(value: string): string | null {
    if (value.length === 0) return ERR_EMAIL_REQUIRED;
    return validateEmail(value);
  }

  function handleEmailBlur() {
    setEmailError(validateEmailField(email));
  }

  const allRequiredFilled = email.length > 0;

  function handleSubmit() {
    const newEmailError = validateEmailField(email);
    setEmailError(newEmailError);

    if (newEmailError !== null) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    // API 接続は後フェーズで差し替える。現段階は検証完了後に何もしない。
    // 接続後は以下のパターン:
    //   成功（存在しないメールも200を返す設計）→ setIsSuccess(true)
    //   429 → setFormError(ERR_PASSWORD_RESET_RATE_LIMITED)
    //   5xx → setFormError(ERR_PASSWORD_RESET_SEND_FAILED)
    //   network error → setFormError(ERR_NETWORK)
    setIsSubmitting(false);
  }

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.scrollContent}>
          <Text style={styles.title} accessibilityRole="header">
            パスワードの再設定
          </Text>

          <View style={styles.successBanner}>
            <Text style={styles.successTitle}>{MSG_PASSWORD_RESET_SENT_TITLE}</Text>
            <Text style={styles.successBody}>{MSG_PASSWORD_RESET_SENT_BODY}</Text>
          </View>

          <Text style={styles.hint}>{MSG_PASSWORD_RESET_SENT_HINT}</Text>

          <Pressable
            onPress={() => router.replace(routes.login)}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
            accessibilityRole="link"
            accessibilityLabel="ログインページへ戻る"
          >
            <Text style={styles.linkText}>← ログインページへ戻る</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
            パスワードの再設定
          </Text>

          <Text style={styles.description}>
            登録したメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
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
              returnKeyType="done"
            />

            <FormErrorMessage message={formError} />

            <AuthPrimaryButton
              label="再設定メールを送信する"
              onPress={handleSubmit}
              disabled={!allRequiredFilled}
              isLoading={isSubmitting}
            />

            <Pressable
              onPress={() => router.replace(routes.login)}
              style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
              accessibilityRole="link"
              accessibilityLabel="ログインページへ戻る"
            >
              <Text style={styles.linkText}>← ログインページへ戻る</Text>
            </Pressable>
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
  hint: {
    ...textSm,
    color: colorTextSecondary,
    marginBottom: spacing6,
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
