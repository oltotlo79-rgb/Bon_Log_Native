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

/**
 * RevenueCat の App User ID をサーバーの currentUser.id に固定できなかった場合の案内。
 * 匿名 ID や別ユーザー ID のまま購入・復元へ進ませないため、処理を中断して再試行を促す。
 */
export const BILLING_USER_IDENTITY_ERROR_MESSAGE =
  '課金アカウントを確認できませんでした。通信状況を確認して、もう一度お試しください。';

// ---------------------------------------------------------------------------
// Webhook 反映確認
// ---------------------------------------------------------------------------

/** RevenueCat Webhook がサーバーの購読状態へ反映されるまでの再確認間隔。 */
export const SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS = 2_000;

/** users.me を再確認する最大回数。合計待ち時間を有限にして画面離脱時に停止できるようにする。 */
export const SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS = 5;

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
