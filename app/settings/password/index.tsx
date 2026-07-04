/**
 * @module app/settings/password
 * パスワード変更画面。
 * クライアント側検証は再入力一致のみ（強度検証はサーバーが正 — CLAUDE.md 機能制約）。
 * 仕様: Bon_Log_cfw の components/settings/PasswordChangeForm の文言・入力項目を踏襲する。
 * OAuth 専用アカウントの事前判定は行わない（サーバーが 409 CONFLICT を返す）。
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  type TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useChangePasswordMutation } from '@/lib/queries/auth';
import { isApiError } from '@/lib/api/errors';
import {
  ERR_OFFLINE_ACTION,
  ERR_PASSWORD_MISMATCH,
  ERR_GENERIC,
  messageForChangePasswordError,
} from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorSuccess,
  colorSuccessBg,
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

const SUCCESS_ICON_SIZE = 18;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsPasswordScreen() {
  const isOnline = useOnlineStatus();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const changePasswordMutation = useChangePasswordMutation();

  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const confirmFieldError = confirmMismatch ? ERR_PASSWORD_MISMATCH : null;

  const allRequiredFilled =
    currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;
  const canSubmit =
    allRequiredFilled && !confirmMismatch && !changePasswordMutation.isPending && isOnline;

  function handleSubmit() {
    if (!isOnline) {
      setFormError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!allRequiredFilled || confirmMismatch) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setSuccessMessage('パスワードを変更しました。');
        },
        onError: (err) => {
          setFormError(isApiError(err) ? messageForChangePasswordError(err.code) : ERR_GENERIC);
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
          パスワード変更
        </Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.description}>ログインに使用するパスワードを変更します。</Text>

          {successMessage !== null && (
            <View style={styles.successBanner} accessibilityRole="alert">
              <Ionicons
                name="checkmark-circle-outline"
                size={SUCCESS_ICON_SIZE}
                color={colorSuccess}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            <PasswordField
              label="現在のパスワード"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              disabled={changePasswordMutation.isPending}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
              accessibilityHint="本人確認のための現在のパスワード"
            />

            <PasswordField
              ref={newPasswordRef}
              label="新しいパスワード"
              value={newPassword}
              onChangeText={setNewPassword}
              disabled={changePasswordMutation.isPending}
              placeholder="8文字以上（英字・数字を含む）"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />

            <PasswordField
              ref={confirmPasswordRef}
              label="新しいパスワード（確認）"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={confirmFieldError}
              disabled={changePasswordMutation.isPending}
              placeholder="もう一度入力"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <FormErrorMessage message={formError} />

            <AuthPrimaryButton
              label="パスワードを変更する"
              onPress={handleSubmit}
              disabled={!canSubmit}
              isLoading={changePasswordMutation.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    backgroundColor: colorSuccessBg,
    borderRadius: radiusMd,
    padding: spacing3,
  },
  successText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
});
