import { useCallback } from 'react';
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
import { PLAY_SUBSCRIPTIONS_MANAGEMENT_URL } from '@/lib/constants/billing';
import {
  ERR_PURCHASE_FAILED,
  ERR_PURCHASE_PENDING,
  ERR_GENERIC,
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
const MSG_RESTORE_SUCCESS = '購入の復元が完了しました。';

export default function SettingsSubscriptionScreen() {
  const { toast, showToast, hideToast } = useToast();

  const { data: currentUser, isFetching: isUserFetching } = useCurrentUserQuery();
  const {
    data: offering,
    isLoading: isOfferingLoading,
    isError: isOfferingError,
  } = usePremiumOfferingQuery();
  const purchaseMutation = usePurchasePremiumMutation();
  const restoreMutation = useRestorePurchasesMutation();

  const isPremium = currentUser?.isPremium === true;

  // purchase 完了または restore 完了後、users.me が refetch 中かつ isPremium 未反映のときに案内を出す
  const showPendingReflection =
    isUserFetching &&
    !isPremium &&
    (purchaseMutation.isSuccess || restoreMutation.isSuccess);

  const handlePurchase = useCallback(() => {
    if (offering === null || offering === undefined || isPremium) {
      return;
    }
    purchaseMutation.mutate(offering.package, {
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
          const message = result.message.length > 0 ? result.message : ERR_PURCHASE_FAILED;
          showToast(message, 'error');
          return;
        }
        // success
        showToast(MSG_PURCHASE_SUCCESS_PENDING);
      },
    });
  }, [offering, isPremium, purchaseMutation, showToast]);

  const handleRestore = useCallback(() => {
    restoreMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.kind === 'error') {
          const message = result.message.length > 0 ? result.message : ERR_GENERIC;
          showToast(message, 'error');
          return;
        }
        // success
        showToast(MSG_RESTORE_SUCCESS);
      },
    });
  }, [restoreMutation, showToast]);

  const handleManage = useCallback(() => {
    void Linking.openURL(PLAY_SUBSCRIPTIONS_MANAGEMENT_URL);
  }, []);

  const isPurchasing = purchaseMutation.isPending;
  const isRestoring = restoreMutation.isPending;

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
        {showPendingReflection && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>
              {MSG_PURCHASE_SUCCESS_PENDING}
            </Text>
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
              (isPurchasing || offering === null || offering === undefined) &&
                styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || offering === null || offering === undefined}
            accessibilityRole="button"
            accessibilityLabel="プレミアムプランを購入する"
            accessibilityState={{ disabled: isPurchasing || offering === null || offering === undefined }}
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
          style={[styles.restoreButton, isRestoring && styles.restoreButtonDisabled]}
          onPress={handleRestore}
          disabled={isRestoring}
          accessibilityRole="button"
          accessibilityLabel="購入を復元する"
          accessibilityState={{ disabled: isRestoring }}
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
