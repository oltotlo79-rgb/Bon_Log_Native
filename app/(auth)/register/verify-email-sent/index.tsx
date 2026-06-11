import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing4,
  spacing6,
  spacing8,
  radiusLg,
  textBase,
  textLg,
  text2xl,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { routes } from '@/lib/constants/routes';

export default function VerifyEmailSentScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          メールをご確認ください
        </Text>
        <Text style={styles.icon}>✉</Text>
        <Text style={styles.description}>
          ご登録のメールアドレスに確認メールを送信しました。{'\n'}
          メール内のリンクをクリックして登録を完了してください。
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace(routes.login)}
          accessibilityRole="button"
          accessibilityLabel="ログイン画面へ戻る"
        >
          <Text style={styles.buttonText}>ログイン画面へ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing4,
    paddingVertical: spacing8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing6,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
    letterSpacing: letterSpacingWidest,
  },
  icon: {
    ...text2xl,
    color: colorTextPrimary,
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    height: 44,
    paddingHorizontal: spacing6,
    backgroundColor: colorActionPrimary,
    borderRadius: radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
    letterSpacing: letterSpacingWidest,
  },
});
