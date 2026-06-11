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
import { router } from 'expo-router';
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
import { routes } from '@/lib/constants/routes';

export default function PasswordResetConfirmScreen() {
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
            新しいパスワードを設定
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>新しいパスワード</Text>
              <TextInput
                style={styles.input}
                placeholder="8文字以上"
                placeholderTextColor={colorTextSecondary}
                secureTextEntry
                accessibilityLabel="新しいパスワード入力"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>パスワードの確認</Text>
              <TextInput
                style={styles.input}
                placeholder="もう一度入力してください"
                placeholderTextColor={colorTextSecondary}
                secureTextEntry
                accessibilityLabel="パスワード確認入力"
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace(routes.login)}
              accessibilityRole="button"
              accessibilityLabel="パスワードを変更する"
            >
              <Text style={styles.primaryButtonText}>パスワードを変更する</Text>
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
