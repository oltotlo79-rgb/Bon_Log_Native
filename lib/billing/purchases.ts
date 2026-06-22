/**
 * @module lib/billing/purchases
 * RevenueCat SDK ラッパー。SDK 呼び出しをこのモジュールに閉じ込めることで
 * テスト時のモック差し替えを単一箇所で行えるようにする（billing.md）。
 *
 * プレミアム判定の正はサーバー DB の isPremium。
 * RevenueCat SDK の entitlement を機能解放の根拠にしない（billing.md 絶対規則 1）。
 */

import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import type {
  PurchasesPackage,
  PurchasesError,
} from 'react-native-purchases';
import {
  REVENUECAT_PREMIUM_OFFERING_ID,
  PLAY_SUBSCRIPTIONS_MANAGEMENT_URL,
} from '@/lib/constants/billing';

// ---------------------------------------------------------------------------
// 公開型
// ---------------------------------------------------------------------------

/**
 * プレミアム Offering の情報。価格表示用に frontend へ渡す。
 * 価格はハードコードせず RevenueCat から取得した値を使う（billing.md）。
 */
export type PremiumOffering = {
  /** RevenueCat Package オブジェクト（purchasePremium に渡す） */
  readonly package: PurchasesPackage;
  /** ローカライズ済み価格文字列（例: "¥480/月"） */
  readonly priceString: string;
  /** 商品タイトル */
  readonly title: string;
};

/**
 * 購入操作の型判別 union。
 * ユーザーキャンセルを別ケースに分離し、エラー扱いしないことを型レベルで示す（billing.md）。
 */
export type PurchaseResult =
  | { kind: 'success' }
  | { kind: 'userCancelled' }
  | { kind: 'pending'; message: string }
  | { kind: 'error'; message: string };

/**
 * 復元操作の型判別 union。
 * 復元後の購読状態はサーバーの users.me クエリを invalidate して確認する。
 */
export type RestoreResult =
  | { kind: 'success' }
  | { kind: 'error'; message: string };

// ---------------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------------

/**
 * SDK が reject した値が RevenueCat の PurchasesError かを判定する型ガード。
 * PurchasesError は interface のため instanceof が使えない。code フィールドで判別する（any/as 禁止）。
 */
function isPurchasesError(err: unknown): err is PurchasesError {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    typeof err.code === 'string'
  );
}

/** エラーコードがユーザーキャンセルかを判定する型ガード */
function isCancelledError(err: PurchasesError): boolean {
  return err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

/** エラーコードが決済保留かを判定する型ガード */
function isPendingError(err: PurchasesError): boolean {
  return err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR;
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/**
 * アプリ起動時に 1 回呼び出す RevenueCat 初期化。
 * - API キー未設定・Web 環境・非サポートプラットフォームでは安全に no-op となる。
 * - Android のみ ANDROID キーを使用。iOS キーは将来の iOS リリース用に分岐を用意する（billing.md）。
 */
export function initBilling(): void {
  const os = Platform.OS;

  // android / ios 以外（web 等）では SDK を初期化しない
  if (os !== 'android' && os !== 'ios') {
    return;
  }

  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

  const apiKey = os === 'android' ? androidKey : iosKey;

  if (!apiKey) {
    // キー未設定の場合は no-op（開発環境・未設定環境でクラッシュさせない）
    return;
  }

  Purchases.configure({ apiKey });
}

/**
 * ログイン後にサーバーのユーザー ID で RevenueCat を identify する。
 * Web=Stripe 購読者との整合のため、サーバーのユーザー ID を appUserID として使う。
 */
export async function identifyBillingUser(userId: string): Promise<void> {
  const os = Platform.OS;
  if (os !== 'android' && os !== 'ios') {
    return;
  }

  await Purchases.logIn(userId);
}

/**
 * ログアウト時に RevenueCat のユーザーをリセットする（fail-safe）。
 * この関数が失敗しても呼び出し元のログアウト処理を止めない。
 */
export async function resetBillingUser(): Promise<void> {
  const os = Platform.OS;
  if (os !== 'android' && os !== 'ios') {
    return;
  }

  await Purchases.logOut();
}

/**
 * RevenueCat から定期購読の Offering を取得し、プレミアム Package を返す。
 * 価格は RevenueCat が提供するローカライズ済み文字列をそのまま使う（ハードコード禁止）。
 *
 * @returns PremiumOffering | null — Offering が設定されていない場合は null
 */
export async function getPremiumOffering(): Promise<PremiumOffering | null> {
  const offerings = await Purchases.getOfferings();

  // REVENUECAT_PREMIUM_OFFERING_ID に一致する Offering を探す。
  // 未設定の場合は current Offering にフォールバックする（RevenueCat ダッシュボードで current を設定済みの想定）。
  const offering =
    offerings.all[REVENUECAT_PREMIUM_OFFERING_ID] ?? offerings.current;

  if (offering === null || offering === undefined) {
    return null;
  }

  // 月額プランを優先して取得する（月額が無ければ年額 → 最初の利用可能なパッケージ）
  const pkg = offering.monthly ?? offering.annual ?? offering.availablePackages[0];

  if (pkg === undefined || pkg === null) {
    return null;
  }

  return {
    package: pkg,
    priceString: pkg.product.priceString,
    title: pkg.product.title,
  };
}

/**
 * プレミアム Package を購入する。
 * 購入後の機能解放はサーバーの users.me（isPremium）を invalidate して確認する（billing.md）。
 *
 * @returns PurchaseResult — ユーザーキャンセルは 'userCancelled'、保留は 'pending'、それ以外のエラーは 'error'
 */
export async function purchasePremium(
  premiumPackage: PurchasesPackage
): Promise<PurchaseResult> {
  try {
    await Purchases.purchasePackage(premiumPackage);
    return { kind: 'success' };
  } catch (err: unknown) {
    if (isPurchasesError(err)) {
      if (isCancelledError(err)) {
        return { kind: 'userCancelled' };
      }
      if (isPendingError(err)) {
        return { kind: 'pending', message: err.message };
      }
      return { kind: 'error', message: err.message };
    }

    const message =
      err instanceof Error ? err.message : '購入中に予期しないエラーが発生しました。';
    return { kind: 'error', message };
  }
}

/**
 * 過去の購入を復元する（審査要件）。
 * 復元後の購読状態確認はサーバーの users.me クエリ invalidate に委ねる。
 *
 * @returns RestoreResult
 */
export async function restorePurchases(): Promise<RestoreResult> {
  try {
    await Purchases.restorePurchases();
    return { kind: 'success' };
  } catch (err: unknown) {
    if (isPurchasesError(err)) {
      return { kind: 'error', message: err.message };
    }

    const message =
      err instanceof Error ? err.message : '購入の復元中に予期しないエラーが発生しました。';
    return { kind: 'error', message };
  }
}

// 管理 URL を再エクスポートして billing モジュール経由でアクセスできるようにする
export { PLAY_SUBSCRIPTIONS_MANAGEMENT_URL };
