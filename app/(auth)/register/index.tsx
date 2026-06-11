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
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorBorder,
  colorBorderFocus,
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
import { routes } from '@/lib/constants/routes';

export default function RegisterScreen() {
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
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ニックネーム</Text>
              <TextInput
                style={styles.input}
                placeholder="ニックネーム"
                placeholderTextColor={colorTextSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="ニックネーム入力"
              />
            </View>

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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>パスワード</Text>
              <TextInput
                style={styles.input}
                placeholder="8文字以上"
                placeholderTextColor={colorTextSecondary}
                secureTextEntry
                accessibilityLabel="パスワード入力"
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              accessibilityRole="button"
              accessibilityLabel="登録する"
            >
              <Text style={styles.primaryButtonText}>登録する</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              accessibilityRole="button"
              accessibilityLabel="Google で登録"
            >
              <Text style={styles.secondaryButtonText}>Google で登録</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Link href={routes.login} accessibilityRole="link">
              <Text style={styles.link}>すでにアカウントをお持ちの方</Text>
            </Link>
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colorBorder,
  },
  dividerText: {
    ...textBase,
    color: colorTextSecondary,
  },
  secondaryButton: {
    height: 44,
    backgroundColor: colorActionSecondary,
    borderRadius: radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colorBorder,
  },
  secondaryButtonText: {
    ...textBase,
    color: colorActionSecondaryText,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing8,
    alignItems: 'center',
  },
  link: {
    ...textBase,
    color: colorBorderFocus,
    textDecorationLine: 'underline',
  },
});
