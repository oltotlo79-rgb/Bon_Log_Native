import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
  colorBorderLight,
  spacing2,
  spacing4,
  spacing6,
  radiusLg,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
  shadowWashi,
} from '@/lib/constants/design-tokens';

export default function SettingsSubscriptionScreen() {
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
        <View style={styles.planCard}>
          <Text style={styles.planCardTitle}>現在のプラン</Text>
          <Text style={styles.planCardValue}>無料プラン</Text>
        </View>

        <View style={styles.benefitsCard}>
          <Text style={styles.sectionTitle}>プレミアムの特典</Text>
          <View style={styles.benefitsList}>
            {[
              '投稿文字数 500 → 2,000 文字',
              '画像枚数 4 → 6 枚',
              '動画投稿（1 本）',
            ].map((benefit, index) => (
              <Text key={index} style={styles.benefitItem}>
                ・ {benefit}
              </Text>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.purchaseButton}
          accessibilityRole="button"
          accessibilityLabel="プレミアムプランを購入する"
        >
          <Text style={styles.purchaseButtonText}>プレミアムプランに加入する</Text>
          <Text style={styles.purchasePriceNote}>
            価格は読み込み中...（RevenueCat 実装後に反映）
          </Text>
        </TouchableOpacity>

        {/*
          Google Play 審査要件: 購入の復元ボタンは必須
          store-compliance.md 参照
        */}
        <TouchableOpacity
          style={styles.restoreButton}
          accessibilityRole="button"
          accessibilityLabel="購入を復元する"
        >
          <Text style={styles.restoreButtonText}>購入を復元する</Text>
        </TouchableOpacity>

        <View style={styles.manageSection}>
          <Text style={styles.manageDescription}>
            Google Play の定期購入管理画面から購読のキャンセルや変更ができます。
          </Text>
          <TouchableOpacity
            style={styles.manageButton}
            accessibilityRole="button"
            accessibilityLabel="Google Play の定期購入を管理する"
          >
            <Text style={styles.manageButtonText}>
              Google Play の定期購入を管理する
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  planCardValue: {
    ...textLg,
    color: colorTextPrimary,
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
  },
  restoreButtonText: {
    ...textBase,
    color: colorTextSecondary,
    textDecorationLine: 'underline',
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
