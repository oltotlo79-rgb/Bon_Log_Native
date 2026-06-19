/**
 * @module app/settings/account
 * アカウント設定画面（削除導線を含む）。
 * Google Play 審査要件: アプリ内からのアカウント削除導線が必須。
 * 仕様: docs/design/account-deletion.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Toast } from '@/components/common/Toast';
import { DeletionWarningDialog } from '@/components/settings/DeletionWarningDialog';
import { DeletionConfirmDialog } from '@/components/settings/DeletionConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useCurrentUserProfileQuery, useDeleteAccountMutation } from '@/lib/queries/users';
import { isApiError } from '@/lib/api/errors';
import {
  ERR_OFFLINE_ACTION,
  ERR_ACCOUNT_DELETE_FAILED,
  ERR_RATE_LIMIT,
  ERR_FORBIDDEN,
  messageForApiError,
} from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorError,
  colorBorder,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusLg,
  textBase,
  textSm,
  textLg,
  letterSpacingWidest,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ALERT_ICON_SIZE = 20;
const CHEVRON_SIZE = 20;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsAccountScreen() {
  const isOnline = useOnlineStatus();
  const { toast, hideToast } = useToast();

  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const profileQuery = useCurrentUserProfileQuery();
  const deleteAccountMutation = useDeleteAccountMutation();

  const isPremium = profileQuery.data?.isPremium ?? false;
  const isDeleting = deleteAccountMutation.isPending;

  function handleDeletePress() {
    setDeleteError(null);
    setShowWarningDialog(true);
  }

  function handleWarningConfirm() {
    setShowWarningDialog(false);
    setShowConfirmDialog(true);
  }

  function handleWarningCancel() {
    setShowWarningDialog(false);
  }

  function handleConfirmCancel() {
    setShowConfirmDialog(false);
    setDeleteError(null);
  }

  async function handleDeleteConfirm() {
    if (!isOnline) {
      setDeleteError(ERR_OFFLINE_ACTION);
      return;
    }

    setDeleteError(null);

    try {
      await deleteAccountMutation.mutateAsync();
      // mutateAsync 後の画面遷移は useDeleteAccountMutation 内部の onSettled → signOut が行う
      // ここでトーストを表示してもよいが、signOut で画面が切り替わるため不要
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === 'RATE_LIMITED') {
          setDeleteError(ERR_RATE_LIMIT);
        } else if (err.code === 'AUTH_REQUIRED' || err.code === 'GUEST_NOT_ALLOWED') {
          setDeleteError(ERR_FORBIDDEN);
        } else {
          setDeleteError(messageForApiError(err.code));
        }
      } else {
        setDeleteError(ERR_ACCOUNT_DELETE_FAILED);
      }
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      {/* ヘッダー */}
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
          アカウント設定
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ログイン情報セクション */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ログイン情報</Text>
        </View>

        <View style={styles.group}>
          <TouchableOpacity
            style={[styles.item, styles.itemBorder]}
            accessibilityRole="button"
            accessibilityLabel="メールアドレスを変更する"
          >
            <Text style={styles.itemLabel}>メールアドレスを変更</Text>
            <Ionicons
              name="chevron-forward"
              size={CHEVRON_SIZE}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel="パスワードを変更する"
          >
            <Text style={styles.itemLabel}>パスワードを変更</Text>
            <Ionicons
              name="chevron-forward"
              size={CHEVRON_SIZE}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </TouchableOpacity>
        </View>

        {/* 危険ゾーンセクション */}
        <View style={styles.dangerSectionHeader}>
          <View style={styles.dangerSeparator} />
          <Text style={styles.dangerSectionLabel}>危険ゾーン</Text>
          <View style={styles.dangerSeparator} />
        </View>

        <View style={styles.dangerGroup}>
          {/*
            Google Play 審査要件: アプリ内からのアカウント削除導線が必須
            store-compliance.md §アカウント 参照
          */}
          <TouchableOpacity
            style={styles.dangerItem}
            onPress={handleDeletePress}
            accessibilityRole="button"
            accessibilityLabel="アカウントを削除する"
            accessibilityHint="この操作は取り消せません。タップすると確認画面が表示されます。"
            activeOpacity={0.7}
          >
            <Ionicons
              name="warning-outline"
              size={ALERT_ICON_SIZE}
              color={colorError}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.dangerItemLabel}>アカウントを削除する</Text>
            <Ionicons
              name="chevron-forward"
              size={CHEVRON_SIZE}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.dangerHint}>
          アカウントを削除すると、投稿・コメント・フォロー関係を含むすべてのデータが削除され、元に戻すことはできません。
        </Text>
      </ScrollView>

      {/* 第1ダイアログ（警告） */}
      <DeletionWarningDialog
        isVisible={showWarningDialog}
        isPremium={isPremium}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />

      {/* 第2ダイアログ（意思確認） */}
      <DeletionConfirmDialog
        isVisible={showConfirmDialog}
        onConfirm={handleDeleteConfirm}
        onCancel={handleConfirmCancel}
        isDeleting={isDeleting}
        error={deleteError}
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
  scrollContent: {
    padding: spacing4,
    gap: spacing6,
    paddingBottom: spacing6,
  },
  sectionHeader: {
    paddingHorizontal: spacing2,
    paddingBottom: spacing2,
  },
  sectionLabel: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
    letterSpacing: letterSpacingWidest,
  },
  group: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    ...shadowWashi,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    minHeight: 56,
    paddingVertical: spacing2,
    gap: spacing3,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  itemLabel: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  dangerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
  },
  dangerSeparator: {
    flex: 1,
    height: 1,
    backgroundColor: colorBorder,
  },
  dangerSectionLabel: {
    ...textSm,
    color: colorError,
    letterSpacing: letterSpacingWidest,
    fontWeight: '600',
  },
  dangerGroup: {
    backgroundColor: colorBackground,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: colorBorder,
    overflow: 'hidden',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    minHeight: 56,
    paddingVertical: spacing2,
    gap: spacing3,
    backgroundColor: colorBackground,
  },
  dangerItemLabel: {
    ...textBase,
    color: colorError,
    flex: 1,
  },
  dangerHint: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 18,
    marginTop: -spacing3,
  },
});
