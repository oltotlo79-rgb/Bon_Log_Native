/**
 * @module app/settings/email
 * メールアドレス変更画面（確認メール経由の二段階方式・案B）。
 * アプリは request のみを呼び、confirm はメール内リンクから Web 側で完結させる
 * （lib/queries/auth の useConfirmEmailChangeMutation は今回使用しない）。
 * 導線は app/settings/account から公開済み（ROUTE_SETTINGS_EMAIL）。
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useRequestEmailChangeMutation } from '@/lib/queries/auth';
import { isApiError } from '@/lib/api/errors';
import { validateEmail } from '@/lib/utils/validate-auth';
import {
  ERR_OFFLINE_ACTION,
  ERR_EMAIL_REQUIRED,
  ERR_PASSWORD_REQUIRED,
  ERR_GENERIC,
  messageForEmailChangeRequestError,
} from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorInfo,
  colorInfoBg,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusMd,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const INFO_ICON_SIZE = 20;

/**
 * メール変更確認案内の文言。列挙攻撃対策により newEmail の使用状況に関わらず
 * 常にこの汎用文言のみ表示する（Web の MSG_EMAIL_CHANGE_REQUEST_SENT を踏襲）。
 */
const EMAIL_CHANGE_REQUEST_SENT_MESSAGE =
  '確認メールを送信しました。新しいアドレスに届くメールのリンクから手続きを完了してください。';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

type Step = 'form' | 'sent';

export default function SettingsEmailScreen() {
  const isOnline = useOnlineStatus();

  const [step, setStep] = useState<Step>('form');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const requestEmailChangeMutation = useRequestEmailChangeMutation();

  const allRequiredFilled = newEmail.length > 0 && currentPassword.length > 0;
  const canSubmit = allRequiredFilled && !requestEmailChangeMutation.isPending && isOnline;

  function handleSubmit() {
    if (!isOnline) {
      setFormError(ERR_OFFLINE_ACTION);
      return;
    }
    if (newEmail.length === 0) {
      setFormError(ERR_EMAIL_REQUIRED);
      return;
    }
    if (currentPassword.length === 0) {
      setFormError(ERR_PASSWORD_REQUIRED);
      return;
    }

    const emailFormatError = validateEmail(newEmail);
    if (emailFormatError !== null) {
      setFormError(emailFormatError);
      return;
    }

    setFormError(null);

    requestEmailChangeMutation.mutate(
      { newEmail, currentPassword },
      {
        onSuccess: () => {
          setNewEmail('');
          setCurrentPassword('');
          setStep('sent');
        },
        onError: (err) => {
          setFormError(
            isApiError(err) ? messageForEmailChangeRequestError(err.code) : ERR_GENERIC
          );
        },
      }
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          メールアドレス変更
        </Text>
        <View style={styles.headerRight} />
      </View>

      {step === 'sent' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoBanner} accessibilityRole="alert">
            <Ionicons
              name="mail-outline"
              size={INFO_ICON_SIZE}
              color={colorInfo}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.infoText}>{EMAIL_CHANGE_REQUEST_SENT_MESSAGE}</Text>
          </View>

          <AuthPrimaryButton label="設定に戻る" onPress={() => router.back()} />
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.description}>
              新しいメールアドレス宛に確認メールを送信します。本人確認のため現在のパスワードを入力してください。
            </Text>

            <View style={styles.form}>
              <AuthTextField
                label="新しいメールアドレス"
                value={newEmail}
                onChangeText={setNewEmail}
                editable={!requestEmailChangeMutation.isPending}
                placeholder="mail@example.com"
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />

              <PasswordField
                label="現在のパスワード"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                disabled={requestEmailChangeMutation.isPending}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                accessibilityHint="本人確認のための現在のパスワード"
              />

              <FormErrorMessage message={formError} />

              <AuthPrimaryButton
                label="確認メールを送信"
                onPress={handleSubmit}
                disabled={!canSubmit}
                isLoading={requestEmailChangeMutation.isPending}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  header: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    ...textBase,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 44,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing4,
    gap: spacing6,
    paddingBottom: spacing6,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
  },
  form: {
    gap: spacing4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    backgroundColor: colorInfoBg,
    borderRadius: radiusMd,
    padding: spacing3,
  },
  infoText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
});
