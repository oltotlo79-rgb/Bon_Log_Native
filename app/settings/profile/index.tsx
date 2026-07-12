/**
 * @module app/settings/profile
 * プロフィール編集画面。
 * 仕様: docs/design/profile-edit.md
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Toast } from '@/components/common/Toast';
import { ProfileImageEditor } from '@/components/profile/ProfileImageEditor';
import { BirthdayField } from '@/components/profile/BirthdayField';
import { LocationField } from '@/components/profile/LocationField';
import { BonsaiHistoryField } from '@/components/profile/BonsaiHistoryField';
import { PublicToggleField } from '@/components/profile/PublicToggleField';
import { DiscardConfirmDialog } from '@/components/profile/DiscardConfirmDialog';
import { useProfileEdit } from '@/hooks/use-profile-edit';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useCurrentUserProfileQuery, useUpdateProfileMutation } from '@/lib/queries/users';
import { useUploadImageMutation } from '@/lib/queries/upload';
import { isApiError } from '@/lib/api/errors';
import {
  ERR_OFFLINE_ACTION,
  ERR_PROFILE_LOAD_FAILED,
  ERR_MEDIA_UPLOAD_FAILED,
  ERR_NICKNAME_RESERVED,
  messageForApiError,
} from '@/lib/constants/errors';
import {
  MAX_NICKNAME_LENGTH,
  MAX_BIO_LENGTH,
} from '@/lib/constants/limits/auth';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorError,
  colorBorder,
  colorBorderLight,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing12,
  radiusMd,
  textBase,
  textSm,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const BIO_MIN_HEIGHT = 80;
const BIO_MAX_HEIGHT = 160;
const BIO_WARNING_THRESHOLD = 30;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsProfileScreen() {
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);
  const nicknameRef = useRef<TextInput>(null);

  const profileQuery = useCurrentUserProfileQuery();
  const uploadImageMutation = useUploadImageMutation();

  const profile = profileQuery.data;

  const {
    form,
    errors,
    isDirty,
    isValid,
    setNickname,
    setBio,
    setLocation,
    setBonsaiStartYear,
    setBonsaiStartMonth,
    setBirthDate,
    setIsPublic,
    setAvatarLocalUri,
    setHeaderLocalUri,
    setAvatarUrl,
    setHeaderUrl,
    handleNicknameBlur,
    handleBioBlur,
    setNicknameError,
    setFormError,
    clearErrors,
    buildUpdateRequest,
  } = useProfileEdit(profile ?? {
    id: '',
    email: '',
    nickname: '',
    avatarUrl: null,
    headerUrl: null,
    bio: null,
    location: null,
    isPublic: true,
    bonsaiStartYear: null,
    bonsaiStartMonth: null,
    birthDate: null,
    isPremium: false,
    twoFactorEnabled: false,
  });

  const updateProfileMutation = useUpdateProfileMutation(profile?.id ?? '');

  const isSaving = updateProfileMutation.isPending || uploadImageMutation.isPending;
  const canSave = isDirty && isValid && !isSaving && isOnline;

  const navigation = useNavigation();

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: { data: { action: { type: string } }; preventDefault: () => void }) => {
      if (!isDirty || isSaving) return;
      e.preventDefault();
      setShowDiscardDialog(true);
    });
    return unsubscribe;
  }, [navigation, isDirty, isSaving]);

  const handleSave = useCallback(async () => {
    if (!canSave || profile === undefined) return;

    if (!isOnline) {
      setFormError(ERR_OFFLINE_ACTION);
      return;
    }

    clearErrors();

    try {
      let uploadedAvatarUrl: string | null = null;
      let uploadedHeaderUrl: string | null = null;

      if (form.avatarLocalUri !== null) {
        try {
          uploadedAvatarUrl = await uploadImageMutation.mutateAsync({
            localUri: form.avatarLocalUri,
          });
          setAvatarUrl(uploadedAvatarUrl);
        } catch {
          setFormError(ERR_MEDIA_UPLOAD_FAILED);
          return;
        }
      }

      if (form.headerLocalUri !== null) {
        try {
          uploadedHeaderUrl = await uploadImageMutation.mutateAsync({
            localUri: form.headerLocalUri,
          });
          setHeaderUrl(uploadedHeaderUrl);
        } catch {
          setFormError(ERR_MEDIA_UPLOAD_FAILED);
          return;
        }
      }

      const updateRequest = buildUpdateRequest(uploadedAvatarUrl, uploadedHeaderUrl);

      await updateProfileMutation.mutateAsync(updateRequest);

      showToast('プロフィールを保存しました');
      router.back();
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === 'VALIDATION_ERROR') {
          // フィールド固有のエラーはフォームにフィードバック
          setNicknameError(ERR_NICKNAME_RESERVED);
          return;
        }
        setFormError(messageForApiError(err.code));
      } else {
        setFormError(messageForApiError('INTERNAL_ERROR'));
      }
    }
  }, [
    canSave,
    profile,
    isOnline,
    form,
    buildUpdateRequest,
    clearErrors,
    setFormError,
    setNicknameError,
    setAvatarUrl,
    setHeaderUrl,
    uploadImageMutation,
    updateProfileMutation,
    showToast,
  ]);

  // エラー状態（isLoading より先に評価しないと data=undefined, isError=true の組み合わせで
  // ローディング分岐に入ってしまい ScreenError に到達できない）
  if (profileQuery.isError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            プロフィールを編集
          </Text>
          <View style={styles.headerSaveArea} />
        </View>
        <ScreenError
          title="プロフィールを読み込めませんでした"
          description={ERR_PROFILE_LOAD_FAILED}
          onRetry={() => void profileQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  // ローディング状態（エラーチェックの後）
  if (profileQuery.isLoading || profile === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            プロフィールを編集
          </Text>
          <View style={styles.headerSaveArea}>
            <Text style={[styles.saveButtonText, styles.saveButtonDisabled]}>保存する</Text>
          </View>
        </View>
        <ScreenLoading variant="spinner" />
      </SafeAreaView>
    );
  }

  const bioLength = form.bio.length;
  const bioOverLimit = bioLength > MAX_BIO_LENGTH;
  const bioNearLimit = bioLength > MAX_BIO_LENGTH - BIO_WARNING_THRESHOLD;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, isSaving && styles.backButtonDisabled]}
          onPress={() => {
            if (isSaving) return;
            if (isDirty) {
              setShowDiscardDialog(true);
            } else {
              router.back();
            }
          }}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="戻る"
          accessibilityState={{ disabled: isSaving }}
        >
          <Text style={[styles.backButtonText, isSaving && styles.disabledText]}>
            ← 戻る
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} accessibilityRole="header">
          プロフィールを編集
        </Text>

        <View style={styles.headerSaveArea}>
          {isSaving ? (
            <ActivityIndicator color={colorActionPrimary} size="small" />
          ) : (
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityLabel="プロフィールを保存する"
              accessibilityState={{ disabled: !canSave }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  !canSave && styles.saveButtonDisabled,
                ]}
              >
                保存する
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 画像編集エリア */}
          <ProfileImageEditor
            avatarUrl={profile.avatarUrl ?? null}
            headerUrl={profile.headerUrl ?? null}
            avatarLocalUri={form.avatarLocalUri}
            headerLocalUri={form.headerLocalUri}
            nickname={form.nickname}
            userId={profile.id}
            onAvatarChange={setAvatarLocalUri}
            onHeaderChange={setHeaderLocalUri}
            onAvatarRemove={() => {
              setAvatarLocalUri(null);
              setAvatarUrl(null);
            }}
            onHeaderRemove={() => {
              setHeaderLocalUri(null);
              setHeaderUrl(null);
            }}
            isDisabled={isSaving}
          />

          <View style={styles.formSection}>
            {/* フォームエラーバナー */}
            <FormErrorMessage message={errors.form} />

            {/* ニックネーム */}
            <View>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>ニックネーム</Text>
                <Text style={styles.requiredMark} accessibilityLabel="（必須）">＊</Text>
              </View>
              <View style={styles.fieldWithCounter}>
                <AuthTextField
                  ref={nicknameRef}
                  label=""
                  value={form.nickname}
                  onChangeText={setNickname}
                  onBlur={handleNicknameBlur}
                  placeholder="表示名（50文字以内）"
                  maxLength={MAX_NICKNAME_LENGTH}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  autoComplete="username"
                  returnKeyType="next"
                  error={errors.nickname}
                  disabled={isSaving}
                  accessibilityLabel="ニックネーム（必須）"
                  rightElement={
                    <Text
                      style={styles.charCounter}
                      accessibilityLabel={`${form.nickname.length}文字 / ${MAX_NICKNAME_LENGTH}文字入力済み`}
                    >
                      {`${form.nickname.length}/${MAX_NICKNAME_LENGTH}`}
                    </Text>
                  }
                />
              </View>
            </View>

            {/* 自己紹介 */}
            <View>
              <Text style={styles.fieldLabel}>自己紹介（任意）</Text>
              <View
                style={[
                  styles.bioContainer,
                  errors.bio ? styles.bioContainerError : styles.bioContainerNormal,
                ]}
              >
                <TextInput
                  value={form.bio}
                  onChangeText={setBio}
                  onBlur={handleBioBlur}
                  placeholder="盆栽への想いや、育てている樹種など..."
                  placeholderTextColor={colorTextSecondary}
                  multiline
                  style={styles.bioInput}
                  editable={!isSaving}
                  accessibilityLabel="自己紹介（任意）"
                />
                <Text
                  style={[
                    styles.bioCounter,
                    bioNearLimit && styles.bioCounterWarning,
                    bioOverLimit && styles.bioCounterError,
                  ]}
                  accessibilityLabel={`${bioLength}文字 / ${MAX_BIO_LENGTH}文字入力済み`}
                >
                  {`${bioLength}/${MAX_BIO_LENGTH}`}
                </Text>
              </View>
              {errors.bio !== null && (
                <View accessibilityRole="alert">
                  <Text style={styles.inlineError}>{errors.bio}</Text>
                </View>
              )}
            </View>

            {/* 居住地 */}
            <LocationField
              value={form.location}
              onChange={setLocation}
              disabled={isSaving}
            />

            {/* 盆栽歴 */}
            <BonsaiHistoryField
              yearValue={form.bonsaiStartYear}
              monthValue={form.bonsaiStartMonth}
              onYearChange={setBonsaiStartYear}
              onMonthChange={setBonsaiStartMonth}
              disabled={isSaving}
            />

            {/* 誕生日 */}
            <BirthdayField
              value={form.birthDate}
              onChange={setBirthDate}
              disabled={isSaving}
            />

            {/* 公開設定 */}
            <PublicToggleField
              value={form.isPublic}
              onChange={setIsPublic}
              disabled={isSaving}
            />

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 破棄確認ダイアログ */}
      <DiscardConfirmDialog
        isVisible={showDiscardDialog}
        onContinue={() => setShowDiscardDialog(false)}
        onDiscard={() => {
          setShowDiscardDialog(false);
          router.back();
        }}
      />

      {/* トースト */}
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
  flex: {
    flex: 1,
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
  backButtonDisabled: {
    opacity: 0.4,
  },
  backButtonText: {
    ...textBase,
    color: colorTextPrimary,
  },
  disabledText: {
    opacity: 0.4,
  },
  headerSaveArea: {
    minWidth: 64,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...textBase,
    fontWeight: '600',
    color: colorActionPrimary,
  },
  saveButtonDisabled: {
    color: colorTextTertiary,
    opacity: 0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing12,
  },
  formSection: {
    paddingHorizontal: spacing4,
    paddingTop: spacing6,
    gap: spacing4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    marginBottom: spacing2,
  },
  fieldLabel: {
    ...textBase,
    color: colorTextPrimary,
  },
  requiredMark: {
    ...textBase,
    color: colorError,
  },
  fieldWithCounter: {
    // AuthTextField がラベルを内包するため専用スタイル不要
  },
  charCounter: {
    ...textSm,
    color: colorTextSecondary,
    paddingRight: spacing2,
  },
  bioContainer: {
    borderWidth: 1,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingTop: spacing3,
    paddingBottom: spacing2,
    minHeight: BIO_MIN_HEIGHT,
    maxHeight: BIO_MAX_HEIGHT,
    backgroundColor: colorBackground,
  },
  bioContainerNormal: {
    borderColor: colorBorder,
  },
  bioContainerError: {
    borderColor: colorError,
  },
  bioInput: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
    textAlignVertical: 'top',
    padding: 0,
    minHeight: BIO_MIN_HEIGHT - spacing3 * 2,
  },
  bioCounter: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'right',
    marginTop: spacing2,
  },
  bioCounterWarning: {
    color: colorTextSecondary,
  },
  bioCounterError: {
    color: colorError,
  },
  inlineError: {
    ...textSm,
    color: colorError,
    marginTop: spacing1,
  },
  bottomSpacer: {
    height: spacing12,
  },
});
