/**
 * @module lib/billing
 * RevenueCat 連携のパブリック API。
 * 初期化・ユーザー識別・Offering 取得・購入・復元の 5 機能を提供する。
 */

export {
  initBilling,
  identifyBillingUser,
  resetBillingUser,
  getPremiumOffering,
} from '@/lib/billing/purchases';

export type { PremiumOffering, PurchaseResult, RestoreResult } from '@/lib/billing/purchases';

export { purchasePremium, restorePurchases } from '@/lib/billing/purchases';
