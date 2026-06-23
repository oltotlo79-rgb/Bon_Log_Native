import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthScreenBackground } from '@/components/auth/AuthScreenBackground';
import { ResendVerificationButton } from '@/components/auth/ResendVerificationButton';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorSurfaceMuted,
  colorSuccessBg,
  colorSuccess,
  colorBorder,
  radiusFull,
  radiusMd,
  spacing3,
  spacing6,
  spacing8,
  textBase,
  textSm,
  textXl,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { routes } from '@/lib/constants/routes';
import {
  ERR_GENERIC,
  ERR_VERIFY_EMAIL_RESEND_RATE_LIMITED,
} from '@/lib/constants/errors';
import { isApiError } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_CIRCLE_SIZE = 80;
const ICON_SIZE = 36;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VerifyEmailSentScreen() {
  const params = useLocalSearchParams();
  const rawEmail = params['email'];
  const email = typeof rawEmail === 'string' ? rawEmail : '';

  const [resendSuccess, setResendSuccess] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  function handleBackToLogin() {
    router.replace(routes.login);
  }

  function handleResendSuccess() {
    setResendSuccess(true);
  }

  function handleResendError(error: unknown) {
    const message =
      isApiError(error) && error.code === 'RATE_LIMITED'
        ? ERR_VERIFY_EMAIL_RESEND_RATE_LIMITED
        : ERR_GENERIC;
    showToast(message, 'error');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthScreenBackground style={styles.background}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="mail-outline"
            size={ICON_SIZE}
            color={colorActionPrimary}
            accessibilityRole="image"
            accessibilityLabel="メール"
          />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          メールをご確認ください
        </Text>

        <Text style={styles.description}>
          ご登録のメールアドレスに確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。
        </Text>

        <Text style={styles.hint}>
          メールが届かない場合は、迷惑メールフォルダもご確認ください。
        </Text>

        {resendSuccess && (
          <View
            style={styles.successBanner}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.successBannerText}>
              確認メールを再送しました。しばらく経ってもメールが届かない場合は、迷惑メールフォルダもご確認ください。
            </Text>
          </View>
        )}

        {email.length > 0 && (
          <ResendVerificationButton
            email={email}
            onSuccess={handleResendSuccess}
            onError={handleResendError}
            style={styles.resendButton}
          />
        )}

        <AuthPrimaryButton
          label="ログイン画面へ戻る"
          onPress={handleBackToLogin}
          accessibilityLabel="ログイン画面へ戻る"
        />
      </View>
      </AuthScreenBackground>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing8,
    gap: spacing6,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...textXl,
    color: colorTextPrimary,
    textAlign: 'center',
    letterSpacing: letterSpacingWidest,
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  hint: {
    ...textSm,
    color: colorTextTertiary,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: colorSuccessBg,
    borderLeftWidth: 3,
    borderLeftColor: colorSuccess,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing3,
    alignSelf: 'stretch',
  },
  successBannerText: {
    ...textSm,
    color: colorTextPrimary,
  },
  resendButton: {
    alignSelf: 'stretch',
  },
});
