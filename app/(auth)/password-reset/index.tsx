import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorder,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  radiusLg,
  textBase,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

export default function PasswordResetScreen() {
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
            登録したメールアドレスを入力してください。{'\n'}
            パスワード再設定用のリンクをお送りします。
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor={colorTextSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="メールアドレス入力"
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              accessibilityRole="button"
              accessibilityLabel="再設定メールを送信する"
            >
              <Text style={styles.primaryButtonText}>再設定メールを送信する</Text>
            </TouchableOpacity>
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
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing4,
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    lineHeight: 24,
    marginBottom: spacing6,
  },
  form: {
    gap: spacing4,
  },
  inputGroup: {
    gap: spacing2,
  },
  label: {
    ...textBase,
    color: colorTextPrimary,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
  },
  primaryButton: {
    height: 44,
    backgroundColor: colorActionPrimary,
    borderRadius: radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing2,
  },
  primaryButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
    letterSpacing: letterSpacingWidest,
  },
});
