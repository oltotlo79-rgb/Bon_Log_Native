import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorBorderLight,
  colorSuccess,
  colorSuccessBg,
  colorInfo,
  colorInfoBg,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusLg,
  radiusMd,
  textBase,
  textLg,
  textSm,
  textXs,
  letterSpacingWidest,
  shadowWashi,
} from '@/lib/constants/design-tokens';
import {
  BILLING_USER_IDENTITY_ERROR_MESSAGE,
  PLAY_SUBSCRIPTIONS_MANAGEMENT_URL,
  SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS,
  SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS,
} from '@/lib/constants/billing';
import {
  ERR_PURCHASE_FAILED,
  ERR_PURCHASE_PENDING,
  ERR_PURCHASE_RESTORE_FAILED,
} from '@/lib/constants/errors';
import {
  usePremiumOfferingQuery,
  usePurchasePremiumMutation,
  useRestorePurchasesMutation,
} from '@/lib/queries/subscription';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// ユーザー向け定数（インライン禁止ルール対応）
// ---------------------------------------------------------------------------

const LABEL_PREMIUM = 'プレミアム会員';
const LABEL_FREE = '無料プラン';
const LABEL_OFFERING_LOADING = '読み込み中...';
const LABEL_OFFERING_UNAVAILABLE = '価格情報を取得できませんでした';

const MSG_PURCHASE_SUCCESS_PENDING =
  'プレミアムプランへの加入を受け付けました。反映には数秒かかることがあります。';
const MSG_RESTORE_SUCCESS_PENDING =
  '購入の復元を受け付けました。反映には数秒かかることがあります。';
const MSG_REFLECTION_POLLING =
  '購入情報を確認しています。サーバーへの反映までこのままお待ちください。';
const MSG_REFLECTION_TIMEOUT =
  '購入情報の反映を確認できませんでした。しばらく待ってから、再確認してください。';
const LABEL_REFLECTION_RETRY = '購入状態を再確認する';

type ReflectionStatus = 'idle' | 'polling' | 'timedOut';

function mutationErrorMessage(error: Error, fallback: string): string {
  return error.message === BILLING_USER_IDENTITY_ERROR_MESSAGE
    ? BILLING_USER_IDENTITY_ERROR_MESSAGE
    : fallback;
}

export default function SettingsSubscriptionScreen() {
  const { toast, showToast, hideToast } = useToast();

  const { data: currentUser, refetch: refetchCurrentUser } = useCurrentUserQuery();
  const {
    data: offering,
    isLoading: isOfferingLoading,
    isError: isOfferingError,
  } = usePremiumOfferingQuery();
  const purchaseMutation = usePurchasePremiumMutation();
  const restoreMutation = useRestorePurchasesMutation();
  const [reflectionStatus, setReflectionStatus] = useState<ReflectionStatus>('idle');
  const [reflectionAttempts, setReflectionAttempts] = useState(0);

  const isPremium = currentUser?.isPremium === true;
  const currentUserId = currentUser?.id;

  function startReflectionPolling() {
    setReflectionAttempts(0);
    setReflectionStatus('polling');
  }

  useEffect(() => {
    if (reflectionStatus === 'idle') {
      return undefined;
    }

    if (isPremium) {
      return undefined;
    }

    if (reflectionStatus === 'timedOut') {
      return undefined;
    }

    if (reflectionAttempts >= SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS) {
      return undefined;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void (async () => {
        let reflected = false;
        try {
          const result = await refetchCurrentUser();
          if (cancelled) {
            return;
          }

          if (result.data?.isPremium === true) {
            reflected = true;
            setReflectionAttempts(0);
            setReflectionStatus('idle');
          }
        } catch {
          // 一時的な再取得失敗も 1 回として数え、上限までは次の確認を続ける。
        } finally {
          if (!cancelled && !reflected) {
            const nextAttempt = reflectionAttempts + 1;
            if (nextAttempt >= SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS) {
              setReflectionStatus('timedOut');
            } else {
              setReflectionAttempts(nextAttempt);
            }
          }
        }
      })();
    }, SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isPremium, reflectionAttempts, reflectionStatus, refetchCurrentUser]);

  function handlePurchase() {
    if (offering === null || offering === undefined || isPremium) {
      return;
    }

    if (currentUserId === undefined || currentUserId.length === 0) {
      showToast(BILLING_USER_IDENTITY_ERROR_MESSAGE, 'error');
      return;
    }

    purchaseMutation.mutate({ premiumPackage: offering.package, userId: currentUserId }, {
      onSuccess: (result) => {
        if (result.kind === 'userCancelled') {
          // キャンセルはトーストを出さない（billing.md）
          return;
        }
        if (result.kind === 'pending') {
          showToast(ERR_PURCHASE_PENDING, 'warning');
          return;
        }
        if (result.kind === 'error') {
          showToast(ERR_PURCHASE_FAILED, 'error');
          return;
        }
        // success
        showToast(MSG_PURCHASE_SUCCESS_PENDING);
        startReflectionPolling();
      },
      onError: (error) => {
        showToast(mutationErrorMessage(error, ERR_PURCHASE_FAILED), 'error');
      },
    });
  }

  function handleRestore() {
    if (currentUserId === undefined || currentUserId.length === 0) {
      showToast(BILLING_USER_IDENTITY_ERROR_MESSAGE, 'error');
      return;
    }

    restoreMutation.mutate({ userId: currentUserId }, {
      onSuccess: (result) => {
        if (result.kind === 'error') {
          showToast(ERR_PURCHASE_RESTORE_FAILED, 'error');
          return;
        }
        // success
        showToast(MSG_RESTORE_SUCCESS_PENDING);
        startReflectionPolling();
      },
      onError: (error) => {
        showToast(
          mutationErrorMessage(error, ERR_PURCHASE_RESTORE_FAILED),
          'error'
        );
      },
    });
  }

  function handleManage() {
    void Linking.openURL(PLAY_SUBSCRIPTIONS_MANAGEMENT_URL);
  }

  const isPurchasing = purchaseMutation.isPending;
  const isRestoring = restoreMutation.isPending;
  const isAwaitingReflection = reflectionStatus !== 'idle' && !isPremium;
  const isPurchaseDisabled =
    isPurchasing ||
    isRestoring ||
    isAwaitingReflection ||
    offering === null ||
    offering === undefined ||
    currentUserId === undefined;
  const isRestoreDisabled =
    isPurchasing || isRestoring || isAwaitingReflection || currentUserId === undefined;

  const priceLabel = (() => {
    if (isOfferingLoading) return LABEL_OFFERING_LOADING;
    if (isOfferingError || offering === null || offering === undefined) return LABEL_OFFERING_UNAVAILABLE;
    return offering.priceString;
  })();

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
          プレミアムプラン
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* 現在のプラン */}
        <View style={styles.planCard}>
          <Text style={styles.planCardTitle}>現在のプラン</Text>
          <View style={styles.planValueRow}>
            <Text style={[styles.planCardValue, isPremium && styles.planCardValuePremium]}>
              {isPremium ? LABEL_PREMIUM : LABEL_FREE}
            </Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>加入中</Text>
              </View>
            )}
          </View>
        </View>

        {/* 反映待ち案内 */}
        {isAwaitingReflection && (
          <View style={styles.pendingBanner} accessibilityRole="alert">
            <Text style={styles.pendingBannerText}>
              {reflectionStatus === 'timedOut'
                ? MSG_REFLECTION_TIMEOUT
                : MSG_REFLECTION_POLLING}
            </Text>
            {reflectionStatus === 'timedOut' && (
              <TouchableOpacity
                style={styles.reflectionRetryButton}
                onPress={startReflectionPolling}
                accessibilityRole="button"
                accessibilityLabel={LABEL_REFLECTION_RETRY}
              >
                <Text style={styles.reflectionRetryButtonText}>{LABEL_REFLECTION_RETRY}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* プレミアムの特典 */}
        <View style={styles.benefitsCard}>
          <Text style={styles.sectionTitle}>プレミアムの特典</Text>
          <View style={styles.benefitsList}>
            {[
              '投稿文字数 500 → 2,000 文字',
              '画像枚数 4 → 6 枚',
              '動画投稿（1 本）',
              '予約投稿',
              '投稿分析',
            ].map((benefit) => (
              <Text key={benefit} style={styles.benefitItem}>
                ・ {benefit}
              </Text>
            ))}
          </View>
        </View>

        {/* 購入ボタン — プレミアム加入済みなら非表示 */}
        {!isPremium && (
          <TouchableOpacity
            testID="subscription-purchase"
            style={[
              styles.purchaseButton,
              isPurchaseDisabled && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchaseDisabled}
            accessibilityRole="button"
            accessibilityLabel="プレミアムプランを購入する"
            accessibilityState={{ disabled: isPurchaseDisabled }}
          >
            {isPurchasing ? (
              <ActivityIndicator
                size="small"
                color={colorActionPrimaryText}
                accessibilityLabel="購入処理中"
              />
            ) : (
              <>
                <Text style={styles.purchaseButtonText}>プレミアムプランに加入する</Text>
                <Text style={styles.purchasePriceNote}>{priceLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* 購入を復元する */}
        <TouchableOpacity
          testID="subscription-restore"
          style={[styles.restoreButton, isRestoreDisabled && styles.restoreButtonDisabled]}
          onPress={handleRestore}
          disabled={isRestoreDisabled}
          accessibilityRole="button"
          accessibilityLabel="購入を復元する"
          accessibilityState={{ disabled: isRestoreDisabled }}
        >
          {isRestoring ? (
            <ActivityIndicator
              size="small"
              color={colorTextSecondary}
              accessibilityLabel="復元処理中"
            />
          ) : (
            <Text style={styles.restoreButtonText}>購入を復元する</Text>
          )}
        </TouchableOpacity>

        {/* Google Play 管理 */}
        <View style={styles.manageSection}>
          <Text style={styles.manageDescription}>
            Google Play の定期購入管理画面から購読のキャンセルや変更ができます。
          </Text>
          <TouchableOpacity
            testID="subscription-manage"
            style={styles.manageButton}
            onPress={handleManage}
            accessibilityRole="link"
            accessibilityLabel="Google Play の定期購入を管理する"
          >
            <Text style={styles.manageButtonText}>
              Google Play の定期購入を管理する
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

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
  },
  planCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    ...shadowWashi,
    gap: spacing2,
  },
  planCardTitle: {
    ...textSm,
    color: colorTextSecondary,
  },
  planValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
  },
  planCardValue: {
    ...textLg,
    color: colorTextPrimary,
  },
  planCardValuePremium: {
    color: colorSuccess,
  },
  premiumBadge: {
    backgroundColor: colorSuccessBg,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
  },
  premiumBadgeText: {
    ...textXs,
    color: colorSuccess,
    fontWeight: '600',
  },
  pendingBanner: {
    backgroundColor: colorInfoBg,
    borderRadius: radiusMd,
    padding: spacing3,
    borderLeftWidth: 3,
    borderLeftColor: colorInfo,
  },
  pendingBannerText: {
    ...textSm,
    color: colorInfo,
  },
  reflectionRetryButton: {
    minHeight: 44,
    marginTop: spacing3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusMd,
    backgroundColor: colorActionSecondary,
  },
  reflectionRetryButtonText: {
    ...textSm,
    color: colorActionSecondaryText,
    fontWeight: '600',
  },
  benefitsCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    ...shadowWashi,
    gap: spacing4,
  },
  sectionTitle: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  benefitsList: {
    gap: spacing2,
  },
  benefitItem: {
    ...textBase,
    color: colorTextSecondary,
  },
  purchaseButton: {
    backgroundColor: colorActionPrimary,
    borderRadius: radiusLg,
    padding: spacing4,
    alignItems: 'center',
    gap: spacing2,
    minHeight: 44,
    justifyContent: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
    letterSpacing: letterSpacingWidest,
  },
  purchasePriceNote: {
    ...textSm,
    color: colorActionPrimaryText,
    opacity: 0.8,
  },
  restoreButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorActionSecondary,
    borderRadius: radiusMd,
  },
  restoreButtonDisabled: {
    opacity: 0.5,
  },
  restoreButtonText: {
    ...textBase,
    color: colorActionSecondaryText,
  },
  manageSection: {
    gap: spacing4,
    paddingTop: spacing4,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
  },
  manageDescription: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  manageButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageButtonText: {
    ...textBase,
    color: colorTextPrimary,
    textDecorationLine: 'underline',
  },
});
