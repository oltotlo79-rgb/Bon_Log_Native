/**
 * @module lib/constants/billing
 * 課金・サブスクリプション関連の定数。
 * RevenueCat ダッシュボードの識別子と外部管理 URL を集約する（billing.md / store-compliance.md）。
 */

// ---------------------------------------------------------------------------
// RevenueCat 識別子
// ---------------------------------------------------------------------------

/**
 * RevenueCat ダッシュボードで設定したプレミアム Offering の識別子。
 * getPremiumOffering はこの識別子で Offering を検索し、未設定の場合は current にフォールバックする。
 * ダッシュボードの Offering ID と一致させること。
 */
export const REVENUECAT_PREMIUM_OFFERING_ID = 'premium';

// ---------------------------------------------------------------------------
// 外部管理 URL
// ---------------------------------------------------------------------------

/**
 * Google Play の定期購入管理画面 URL。
 * ユーザーが購読の解約・管理を行う際にここへ誘導する（store-compliance.md）。
 * アプリ内でキャンセル処理を実装せず、Play の標準管理画面へ委ねる（Google Play ポリシー準拠）。
 */
export const PLAY_SUBSCRIPTIONS_MANAGEMENT_URL =
  'https://play.google.com/store/account/subscriptions';
