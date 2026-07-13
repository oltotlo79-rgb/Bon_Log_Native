/**
 * @module components/settings/NotificationTypeSettings
 * 通知の種類別トグルセクション（notification-settings.md §3.2）。
 * Web の NotificationPreferences と同じフラットな11種の並びで表示する。
 * 既存の Push 許可カード（セクション 1）の直下に追加するセクション 2 全体を担う。
 * ローディング / エラー / オフライン / 正常の 4 状態を内包する。
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  useNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  resolveNotificationPreference,
} from '@/lib/queries/notifications';
import type { NotificationPreferences } from '@/lib/queries/notifications';
import {
  NOTIFICATION_PREFERENCE_KEYS,
  NOTIFICATION_PREFERENCE_LABELS,
  NOTIFICATION_PREFERENCE_DESCRIPTIONS,
  type NotificationPreferenceKey,
} from '@/lib/constants/notification-settings';
import { NotificationToggleRow } from '@/components/settings/NotificationToggleRow';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import {
  colorActionPrimary,
  colorBackground,
  colorError,
  colorSurfaceKinoko,
  colorTextPrimary,
  colorTextSecondary,
  radiusMd,
  spacing3,
  spacing4,
  spacing6,
  textBase,
  textLg,
  textSm,
} from '@/lib/constants/design-tokens';
import {
  ERR_NOTIFICATION_SETTINGS_LOAD_FAILED,
  ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED,
  ERR_RATE_LIMIT,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';
import { isApiError } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type NotificationTypeSettingsProps = {
  isOnline: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationTypeSettings({ isOnline }: NotificationTypeSettingsProps) {
  const { data, isLoading, isError, refetch } = useNotificationSettingsQuery();
  const updateMutation = useUpdateNotificationSettingsMutation();
  const { toast, showToast, hideToast } = useToast();

  const handleToggle = useCallback(
    (key: NotificationPreferenceKey, newValue: boolean) => {
      if (!isOnline) {
        showToast(ERR_OFFLINE_ACTION, 'error');
        return;
      }

      const patch: Partial<NotificationPreferences> = { [key]: newValue };

      updateMutation.mutate(patch, {
        onError: (error) => {
          const message =
            isApiError(error) && error.code === 'RATE_LIMITED'
              ? ERR_RATE_LIMIT
              : ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED;
          showToast(message, 'error');
        },
      });
    },
    [isOnline, updateMutation, showToast]
  );

  // ---------------------------------------------------------------------------
  // ローディング状態
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.section} accessibilityElementsHidden>
        <View style={styles.sectionHeader}>
          <View style={[styles.skeletonRect, { width: 120, height: 14 }]} />
          <View style={[styles.skeletonRect, { width: 200, height: 12, marginTop: 4 }]} />
        </View>
        {NOTIFICATION_PREFERENCE_KEYS.map((key) => (
          <View key={key} style={styles.skeletonRow}>
            <View style={[styles.skeletonRect, { width: 120, height: 14 }]} />
            <View style={[styles.skeletonRect, { width: 44, height: 24 }]} />
          </View>
        ))}
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // エラー状態（画面全体は乗っ取らない）
  // ---------------------------------------------------------------------------

  if (isError) {
    return (
      <View
        style={styles.section}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <Text style={styles.errorTitle}>設定を読み込めませんでした</Text>
        <Text style={styles.errorDescription}>{ERR_NOTIFICATION_SETTINGS_LOAD_FAILED}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void refetch()}
          accessibilityRole="button"
          accessibilityLabel="再試行"
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // オフライン案内
  // ---------------------------------------------------------------------------

  const preferences = data?.preferences;

  const isToggleDisabled = !isOnline || updateMutation.isPending;

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          通知の種類
        </Text>
        <Text style={styles.sectionDescription}>
          プッシュ通知を受け取る種類を選択できます。
        </Text>

        {!isOnline && (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineNoticeText}>
              通知の種類設定を変更するには、インターネット接続が必要です。接続を確認してください。
            </Text>
          </View>
        )}

        {NOTIFICATION_PREFERENCE_KEYS.map((key, index) => (
          <NotificationToggleRow
            key={key}
            notificationKey={key}
            label={NOTIFICATION_PREFERENCE_LABELS[key]}
            sublabel={NOTIFICATION_PREFERENCE_DESCRIPTIONS[key]}
            value={
              preferences !== undefined
                ? resolveNotificationPreference(preferences, key)
                : true
            }
            onToggle={handleToggle}
            isDisabled={isToggleDisabled}
            isLast={index === NOTIFICATION_PREFERENCE_KEYS.length - 1}
          />
        ))}
      </View>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  section: {
    marginTop: spacing6,
    backgroundColor: colorBackground,
    paddingHorizontal: spacing4,
  },
  sectionHeader: {
    marginBottom: spacing4,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing3,
  },
  sectionDescription: {
    ...textSm,
    color: colorTextSecondary,
    marginBottom: spacing4,
  },
  offlineNotice: {
    backgroundColor: colorSurfaceKinoko,
    borderRadius: radiusMd,
    padding: spacing3,
    marginBottom: spacing4,
  },
  offlineNoticeText: {
    ...textSm,
    color: colorTextSecondary,
  },
  errorTitle: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
    marginBottom: spacing3,
  },
  errorDescription: {
    ...textSm,
    color: colorError,
    marginBottom: spacing4,
  },
  retryButton: {
    height: 44,
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    ...textBase,
    color: colorBackground,
    fontWeight: '600',
  },
  skeletonRect: {
    backgroundColor: colorSurfaceKinoko,
    borderRadius: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
  },
});
