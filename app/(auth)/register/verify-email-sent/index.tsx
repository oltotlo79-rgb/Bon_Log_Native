import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthScreenBackground } from '@/components/auth/AuthScreenBackground';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorSurfaceMuted,
  spacing6,
  spacing8,
  radiusFull,
  textBase,
  textSm,
  textXl,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { routes } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_CIRCLE_SIZE = 80;
const ICON_SIZE = 36;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VerifyEmailSentScreen() {
  function handleBackToLogin() {
    router.replace(routes.login);
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

        <AuthPrimaryButton
          label="ログイン画面へ戻る"
          onPress={handleBackToLogin}
          accessibilityLabel="ログイン画面へ戻る"
        />
      </View>
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
});
