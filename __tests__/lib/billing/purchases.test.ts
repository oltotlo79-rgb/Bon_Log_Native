/**
 * @module __tests__/lib/billing/purchases
 * lib/billing/purchases のユニットテスト。
 * react-native-purchases は __tests__/setup.ts で一元モック済み。
 * lib/billing/purchases の各分岐を網羅する（billing.md / testing.md）。
 */

import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  initBilling,
  identifyBillingUser,
  resetBillingUser,
  getPremiumOffering,
  purchasePremium,
  restorePurchases,
} from '@/lib/billing/purchases';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makePurchasesError(code: string, message = 'error'): { code: string; message: string; userInfo: Record<string, unknown> } {
  return { code, message, userInfo: {} };
}

function makePackage(): PurchasesPackage {
  return {
    identifier: 'monthly',
    packageType: 'MONTHLY',
    product: {
      identifier: 'com.bon_log.premium.monthly',
      description: 'プレミアムプラン月額',
      title: 'プレミアムプラン（月額）',
      price: 480,
      priceString: '¥480/月',
      currencyCode: 'JPY',
      pricePerWeek: null,
      pricePerMonth: 480,
      pricePerYear: null,
      pricePerWeekString: null,
      pricePerMonthString: '¥480/月',
      pricePerYearString: null,
      introPrice: null,
      discounts: null,
      productCategory: 'SUBSCRIPTION',
      defaultOption: null,
      subscriptionOptions: [],
      presentedOfferingIdentifier: 'premium',
      presentedOfferingContext: { offeringIdentifier: 'premium', placementIdentifier: null, targetingContext: null },
    },
    offeringIdentifier: 'premium',
    presentedOfferingContext: { offeringIdentifier: 'premium', placementIdentifier: null, targetingContext: null },
  } as unknown as PurchasesPackage;
}

function makeOffering(pkg: PurchasesPackage) {
  return {
    identifier: 'premium',
    serverDescription: 'プレミアム',
    metadata: {},
    monthly: pkg,
    annual: null,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    weekly: null,
    lifetime: null,
    availablePackages: [pkg],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // デフォルトは Android プラットフォーム
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
});

// ---------------------------------------------------------------------------
// initBilling
// ---------------------------------------------------------------------------

describe('initBilling', () => {
  it('Android + API キーあり: Purchases.configure が呼ばれる', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY = 'android-key-test';

    initBilling();

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'android-key-test' });
    expect(Purchases.configure).toHaveBeenCalledTimes(1);

    delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  });

  it('Android + API キーなし: Purchases.configure は呼ばれない（no-op）', () => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

    initBilling();

    expect(Purchases.configure).not.toHaveBeenCalled();
  });

  it('iOS + API キーあり: Purchases.configure が iOS キーで呼ばれる', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'ios-key-test';

    initBilling();

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'ios-key-test' });

    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  });

  it('iOS + API キーなし: Purchases.configure は呼ばれない（no-op）', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

    initBilling();

    expect(Purchases.configure).not.toHaveBeenCalled();
  });

  it('Web プラットフォーム: Purchases.configure は呼ばれない（no-op）', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY = 'android-key-test';

    initBilling();

    expect(Purchases.configure).not.toHaveBeenCalled();

    delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  });

  it('未知のプラットフォーム: Purchases.configure は呼ばれない（no-op）', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'windows' });

    initBilling();

    expect(Purchases.configure).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// identifyBillingUser
// ---------------------------------------------------------------------------

describe('identifyBillingUser', () => {
  it('Android: Purchases.logIn がユーザー ID で呼ばれる', async () => {
    await identifyBillingUser('user-123');

    expect(Purchases.logIn).toHaveBeenCalledWith('user-123');
    expect(Purchases.logIn).toHaveBeenCalledTimes(1);
  });

  it('iOS: Purchases.logIn がユーザー ID で呼ばれる', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    await identifyBillingUser('user-ios');

    expect(Purchases.logIn).toHaveBeenCalledWith('user-ios');
  });

  it('Web プラットフォーム: Purchases.logIn は呼ばれない（no-op）', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    await identifyBillingUser('user-web');

    expect(Purchases.logIn).not.toHaveBeenCalled();
  });

  it('非サポートプラットフォーム: Purchases.logIn は呼ばれない（no-op）', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'windows' });

    await identifyBillingUser('user-win');

    expect(Purchases.logIn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resetBillingUser
// ---------------------------------------------------------------------------

describe('resetBillingUser', () => {
  it('Android: Purchases.logOut が呼ばれる', async () => {
    await resetBillingUser();

    expect(Purchases.logOut).toHaveBeenCalledTimes(1);
  });

  it('iOS: Purchases.logOut が呼ばれる', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    await resetBillingUser();

    expect(Purchases.logOut).toHaveBeenCalledTimes(1);
  });

  it('Web プラットフォーム: Purchases.logOut は呼ばれない（no-op）', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    await resetBillingUser();

    expect(Purchases.logOut).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getPremiumOffering
// ---------------------------------------------------------------------------

describe('getPremiumOffering', () => {
  it('REVENUECAT_PREMIUM_OFFERING_ID に一致する Offering が存在する場合は月額パッケージを返す', async () => {
    const pkg = makePackage();
    const offering = makeOffering(pkg);

    jest.mocked(Purchases.getOfferings).mockResolvedValue({
      all: { premium: offering },
      current: null,
    } as unknown as Awaited<ReturnType<typeof Purchases.getOfferings>>);

    const result = await getPremiumOffering();

    expect(result).not.toBeNull();
    expect(result?.priceString).toBe('¥480/月');
    expect(result?.title).toBe('プレミアムプラン（月額）');
    expect(result?.package).toBe(pkg);
  });

  it('プレミアム Offering がない場合は current にフォールバックする', async () => {
    const pkg = makePackage();
    const offering = makeOffering(pkg);

    jest.mocked(Purchases.getOfferings).mockResolvedValue({
      all: {},
      current: offering,
    } as unknown as Awaited<ReturnType<typeof Purchases.getOfferings>>);

    const result = await getPremiumOffering();

    expect(result).not.toBeNull();
    expect(result?.priceString).toBe('¥480/月');
  });

  it('Offering が null の場合は null を返す', async () => {
    jest.mocked(Purchases.getOfferings).mockResolvedValue({
      all: {},
      current: null,
    } as unknown as Awaited<ReturnType<typeof Purchases.getOfferings>>);

    const result = await getPremiumOffering();

    expect(result).toBeNull();
  });

  it('Offering にパッケージがない場合は null を返す', async () => {
    const emptyOffering = {
      identifier: 'premium',
      serverDescription: 'プレミアム',
      metadata: {},
      monthly: null,
      annual: null,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
      weekly: null,
      lifetime: null,
      availablePackages: [],
    };

    jest.mocked(Purchases.getOfferings).mockResolvedValue({
      all: { premium: emptyOffering },
      current: null,
    } as unknown as Awaited<ReturnType<typeof Purchases.getOfferings>>);

    const result = await getPremiumOffering();

    expect(result).toBeNull();
  });

  it('月額がなく年額がある場合は年額パッケージを返す', async () => {
    const pkg = makePackage();
    const offering = {
      ...makeOffering(pkg),
      monthly: null,
      annual: pkg,
    };

    jest.mocked(Purchases.getOfferings).mockResolvedValue({
      all: { premium: offering },
      current: null,
    } as unknown as Awaited<ReturnType<typeof Purchases.getOfferings>>);

    const result = await getPremiumOffering();

    expect(result).not.toBeNull();
    expect(result?.package).toBe(pkg);
  });

  it('月額・年額ともになく availablePackages[0] がある場合はそれを返す', async () => {
    const pkg = makePackage();
    const offering = {
      ...makeOffering(pkg),
      monthly: null,
      annual: null,
      availablePackages: [pkg],
    };

    jest.mocked(Purchases.getOfferings).mockResolvedValue({
      all: { premium: offering },
      current: null,
    } as unknown as Awaited<ReturnType<typeof Purchases.getOfferings>>);

    const result = await getPremiumOffering();

    expect(result).not.toBeNull();
    expect(result?.package).toBe(pkg);
  });
});

// ---------------------------------------------------------------------------
// purchasePremium
// ---------------------------------------------------------------------------

describe('purchasePremium', () => {
  const pkg = makePackage();

  it('成功: { kind: "success" } を返す', async () => {
    jest.mocked(Purchases.purchasePackage).mockResolvedValue({
      customerInfo: {} as unknown as Awaited<ReturnType<typeof Purchases.getCustomerInfo>>,
    } as unknown as Awaited<ReturnType<typeof Purchases.purchasePackage>>);

    const result = await purchasePremium(pkg);

    expect(result.kind).toBe('success');
  });

  it('ユーザーキャンセル（PURCHASE_CANCELLED_ERROR）: { kind: "userCancelled" } を返す', async () => {
    const cancelError = makePurchasesError(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR);
    jest.mocked(Purchases.purchasePackage).mockRejectedValue(cancelError);

    const result = await purchasePremium(pkg);

    expect(result.kind).toBe('userCancelled');
  });

  it('決済保留（PAYMENT_PENDING_ERROR）: { kind: "pending" } を返す', async () => {
    const pendingError = makePurchasesError(
      PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR,
      '決済が保留されています'
    );
    jest.mocked(Purchases.purchasePackage).mockRejectedValue(pendingError);

    const result = await purchasePremium(pkg);

    expect(result.kind).toBe('pending');
    if (result.kind === 'pending') {
      expect(result.message).toBe('決済が保留されています');
    }
  });

  it('その他の PurchasesError: { kind: "error" } を返す', async () => {
    const unknownError = makePurchasesError(
      PURCHASES_ERROR_CODE.NETWORK_ERROR,
      'ネットワークエラー'
    );
    jest.mocked(Purchases.purchasePackage).mockRejectedValue(unknownError);

    const result = await purchasePremium(pkg);

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toBe('ネットワークエラー');
    }
  });

  it('非 PurchasesError（Error インスタンス）: { kind: "error" } でメッセージを含む', async () => {
    jest.mocked(Purchases.purchasePackage).mockRejectedValue(
      new Error('予期しないエラー')
    );

    const result = await purchasePremium(pkg);

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toBe('予期しないエラー');
    }
  });

  it('非 PurchasesError（string など）: { kind: "error" } でフォールバックメッセージ', async () => {
    jest.mocked(Purchases.purchasePackage).mockRejectedValue('string error');

    const result = await purchasePremium(pkg);

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toBe('購入中に予期しないエラーが発生しました。');
    }
  });
});

// ---------------------------------------------------------------------------
// restorePurchases
// ---------------------------------------------------------------------------

describe('restorePurchases', () => {
  it('成功: { kind: "success" } を返す', async () => {
    jest.mocked(Purchases.restorePurchases).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof Purchases.restorePurchases>>
    );

    const result = await restorePurchases();

    expect(result.kind).toBe('success');
  });

  it('PurchasesError: { kind: "error" } でメッセージを返す', async () => {
    const purchasesError = makePurchasesError(
      PURCHASES_ERROR_CODE.NETWORK_ERROR,
      '復元時のネットワークエラー'
    );
    jest.mocked(Purchases.restorePurchases).mockRejectedValue(purchasesError);

    const result = await restorePurchases();

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toBe('復元時のネットワークエラー');
    }
  });

  it('非 PurchasesError（Error インスタンス）: { kind: "error" } でメッセージを含む', async () => {
    jest.mocked(Purchases.restorePurchases).mockRejectedValue(
      new Error('復元予期しないエラー')
    );

    const result = await restorePurchases();

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toBe('復元予期しないエラー');
    }
  });

  it('非 PurchasesError（string など）: フォールバックメッセージを返す', async () => {
    jest.mocked(Purchases.restorePurchases).mockRejectedValue('unknown');

    const result = await restorePurchases();

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toBe('購入の復元中に予期しないエラーが発生しました。');
    }
  });
});
