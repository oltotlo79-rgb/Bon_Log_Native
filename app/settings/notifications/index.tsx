import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getPushPermissionStatus,
  registerDeviceForPushNotifications,
} from '@/lib/push';
import type { PushPermissionStatus } from '@/lib/push';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import { ERR_PUSH_SUBSCRIBE_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceKinoko,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextInverse,
  colorActionPrimary,
  colorActionSecondary,
  colorActionSecondaryText,
  colorInfo,
  colorInfoBg,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusLg,
  radiusMd,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 許可状態の表示用ラベル
// ---------------------------------------------------------------------------

type PermissionDisplayState =
  | { kind: 'loading' }
  | { kind: 'granted' }
  | { kind: 'denied-can-ask' }
  | { kind: 'denied-permanent' }
  | { kind: 'error' };

function toDisplayState(
  status: PushPermissionStatus | null,
  isLoading: boolean,
  hasError: boolean
): PermissionDisplayState {
  if (isLoading) return { kind: 'loading' };
  if (hasError) return { kind: 'error' };
  if (status === null) return { kind: 'error' };
  if (status.granted) return { kind: 'granted' };
  return status.canAskAgain ? { kind: 'denied-can-ask' } : { kind: 'denied-permanent' };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsNotificationsScreen() {
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();

  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const loadPermissionStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setHasLoadError(false);
    try {
      const status = await getPushPermissionStatus();
      setPermissionStatus(status);
    } catch {
      // オフライン時や予期しないエラーは穏便に処理する
      setHasLoadError(true);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    // getPushPermissionStatus は OS API の一回読みであり TanStack Query フックが存在しない。
    // 外部ストア購読パターンへの移行は core に Push 許可状態フックの追加が必要。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPermissionStatus().catch(() => undefined);
  }, [loadPermissionStatus]);

  async function handleEnableNotifications() {
    setIsRequesting(true);
    try {
      const result = await registerDeviceForPushNotifications();
      setPermissionStatus(result);
    } catch {
      showToast(ERR_PUSH_SUBSCRIBE_FAILED, 'error');
    } finally {
      setIsRequesting(false);
    }
  }

  function handleOpenOsSettings() {
    void Linking.openSettings();
  }

  const displayState = toDisplayState(permissionStatus, isLoadingStatus, hasLoadError);

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
          通知設定
        </Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {!isOnline && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <Text style={styles.offlineBannerText}>
              オフライン中です。通知の設定変更はオンライン時に行ってください。
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>プッシュ通知</Text>
          <Text style={styles.cardDescription}>
            いいね・コメント・フォローなどの通知をお知らせします。
          </Text>

          <View style={styles.statusRow}>
            {displayState.kind === 'loading' && (
              <ActivityIndicator
                size="small"
                color={colorActionPrimary}
                accessibilityLabel="通知設定を確認中"
              />
            )}

            {displayState.kind === 'granted' && (
              <View style={styles.statusGranted}>
                <Text style={styles.statusGrantedText}>通知は有効です</Text>
              </View>
            )}

            {displayState.kind === 'error' && (
              <View style={styles.statusError}>
                <Text style={styles.statusErrorText}>
                  通知設定を読み込めませんでした。
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => void loadPermissionStatus()}
                  accessibilityRole="button"
                  accessibilityLabel="再読み込み"
                >
                  <Text style={styles.retryButtonText}>再読み込み</Text>
                </TouchableOpacity>
              </View>
            )}

            {displayState.kind === 'denied-can-ask' && (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isRequesting || !isOnline) && styles.primaryButtonDisabled,
                ]}
                onPress={() => void handleEnableNotifications()}
                disabled={isRequesting || !isOnline}
                accessibilityRole="button"
                accessibilityLabel="通知を有効にする"
              >
                {isRequesting ? (
                  <ActivityIndicator
                    size="small"
                    color={colorTextInverse}
                    accessibilityLabel="処理中"
                  />
                ) : (
                  <Text style={styles.primaryButtonText}>通知を有効にする</Text>
                )}
              </TouchableOpacity>
            )}

            {displayState.kind === 'denied-permanent' && (
              <View style={styles.permanentDenied}>
                <View style={styles.permanentDeniedInfo}>
                  <Text style={styles.permanentDeniedMessage}>
                    通知が許可されていません。
                  </Text>
                  <Text style={styles.permanentDeniedHint}>
                    OS の設定アプリから通知を許可してください。
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleOpenOsSettings}
                  accessibilityRole="button"
                  accessibilityLabel="設定アプリを開く"
                >
                  <Text style={styles.secondaryButtonText}>設定アプリを開く</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

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
  content: {
    flex: 1,
    padding: spacing4,
    gap: spacing4,
  },
  offlineBanner: {
    backgroundColor: colorSurfaceKinoko,
    borderRadius: radiusMd,
    padding: spacing3,
  },
  offlineBannerText: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  cardTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  cardDescription: {
    ...textSm,
    color: colorTextSecondary,
  },
  statusRow: {
    marginTop: spacing2,
    minHeight: 44,
    justifyContent: 'center',
  },
  statusGranted: {
    backgroundColor: colorInfoBg,
    borderRadius: radiusMd,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
  },
  statusGrantedText: {
    ...textBase,
    color: colorInfo,
  },
  statusError: {
    gap: spacing2,
  },
  statusErrorText: {
    ...textSm,
    color: colorTextSecondary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing3,
  },
  retryButtonText: {
    ...textBase,
    color: colorActionPrimary,
  },
  permanentDenied: {
    gap: spacing3,
  },
  permanentDeniedInfo: {
    backgroundColor: colorSurfaceKinoko,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
  },
  permanentDeniedMessage: {
    ...textBase,
    color: colorTextPrimary,
  },
  permanentDeniedHint: {
    ...textSm,
    color: colorTextSecondary,
  },
  primaryButton: {
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing6,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...textBase,
    color: colorTextInverse,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colorActionSecondary,
    borderRadius: radiusMd,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing6,
  },
  secondaryButtonText: {
    ...textBase,
    color: colorActionSecondaryText,
    fontWeight: '600',
  },
});
