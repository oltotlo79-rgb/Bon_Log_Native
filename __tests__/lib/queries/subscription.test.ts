/**
 * @module __tests__/lib/queries/subscription
 * lib/queries/subscription のユニットテスト。
 * lib/billing/purchases をモック境界として、ネットワーク・ネイティブ SDK に出ない（testing.md）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  usePremiumOfferingQuery,
  usePurchasePremiumMutation,
  useRestorePurchasesMutation,
} from '@/lib/queries/subscription';
import { queryKeys } from '@/lib/queries/keys';
import type { PremiumOffering, PurchaseResult, RestoreResult } from '@/lib/billing/purchases';
import {
  PACKAGE_TYPE,
  PRODUCT_TYPE,
  type PurchasesPackage,
} from 'react-native-purchases';
import { BILLING_USER_IDENTITY_ERROR_MESSAGE } from '@/lib/constants/billing';

// ---------------------------------------------------------------------------
// モック設定（lib/billing/purchases がモック境界）
// ---------------------------------------------------------------------------

const mockGetPremiumOffering = jest.fn();
const mockGetBillingAppUserId = jest.fn();
const mockIdentifyBillingUser = jest.fn();
const mockPurchasePremium = jest.fn();
const mockRestorePurchases = jest.fn();

jest.mock('@/lib/billing/purchases', () => ({
  getPremiumOffering: (...args: unknown[]) => mockGetPremiumOffering(...args),
  getBillingAppUserId: (...args: unknown[]) => mockGetBillingAppUserId(...args),
  identifyBillingUser: (...args: unknown[]) => mockIdentifyBillingUser(...args),
  purchasePremium: (...args: unknown[]) => mockPurchasePremium(...args),
  restorePurchases: (...args: unknown[]) => mockRestorePurchases(...args),
}));

jest.mock('react-native-purchases', () => ({
  PACKAGE_TYPE: {
    MONTHLY: 'MONTHLY',
  },
  PRODUCT_TYPE: {
    AUTO_RENEWABLE_SUBSCRIPTION: 'AUTO_RENEWABLE_SUBSCRIPTION',
  },
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function makePremiumOffering(): PremiumOffering {
  const premiumPackage = makePackage();
  return {
    package: premiumPackage,
    priceString: '¥480/月',
    title: 'プレミアムプラン（月額）',
  };
}

function makePackage(): PurchasesPackage {
  const presentedOfferingContext = {
    offeringIdentifier: 'premium',
    placementIdentifier: null,
    targetingContext: null,
  };

  return {
    identifier: 'monthly',
    packageType: PACKAGE_TYPE.MONTHLY,
    product: {
      identifier: 'com.bon_log.premium.monthly',
      description: 'Bon Log プレミアムプラン',
      title: 'プレミアムプラン（月額）',
      price: 480,
      priceString: '¥480/月',
      pricePerWeek: null,
      pricePerMonth: 480,
      pricePerYear: 5_760,
      pricePerWeekString: null,
      pricePerMonthString: '¥480/月',
      pricePerYearString: '¥5,760/年',
      currencyCode: 'JPY',
      introPrice: null,
      discounts: null,
      productCategory: null,
      productType: PRODUCT_TYPE.AUTO_RENEWABLE_SUBSCRIPTION,
      subscriptionPeriod: 'P1M',
      defaultOption: null,
      subscriptionOptions: null,
      presentedOfferingIdentifier: 'premium',
      presentedOfferingContext,
    },
    offeringIdentifier: 'premium',
    presentedOfferingContext,
    webCheckoutUrl: null,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockIdentifyBillingUser.mockResolvedValue(undefined);
  mockGetBillingAppUserId.mockResolvedValue('user-1');
});

// ---------------------------------------------------------------------------
// usePremiumOfferingQuery
// ---------------------------------------------------------------------------

describe('usePremiumOfferingQuery', () => {
  it('成功: getPremiumOffering の結果が返る', async () => {
    const offering = makePremiumOffering();
    mockGetPremiumOffering.mockResolvedValue(offering);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePremiumOfferingQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(offering);
    expect(result.current.data?.priceString).toBe('¥480/月');
  });

  it('Offering が設定されていない（null）場合は null が返る', async () => {
    mockGetPremiumOffering.mockResolvedValue(null);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePremiumOfferingQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('SDK エラー: isError が true になる', async () => {
    mockGetPremiumOffering.mockRejectedValue(new Error('SDK エラー'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePremiumOfferingQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('getPremiumOffering が正しく呼ばれる', async () => {
    mockGetPremiumOffering.mockResolvedValue(null);
    const { Wrapper } = createWrapper();

    renderHook(() => usePremiumOfferingQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGetPremiumOffering).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
// usePurchasePremiumMutation
// ---------------------------------------------------------------------------

describe('usePurchasePremiumMutation', () => {
  const pkg = makePackage();
  const variables = { premiumPackage: pkg, userId: 'user-1' };

  it('購入直前にサーバーの userId で identify し、SDK の App User ID 一致後に購入する', async () => {
    const successResult: PurchaseResult = { kind: 'success' };
    mockPurchasePremium.mockResolvedValue(successResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIdentifyBillingUser).toHaveBeenCalledWith('user-1');
    expect(mockGetBillingAppUserId).toHaveBeenCalledTimes(1);
    expect(mockPurchasePremium).toHaveBeenCalledWith(pkg);
    expect(mockIdentifyBillingUser.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetBillingAppUserId.mock.invocationCallOrder[0]
    );
    expect(mockGetBillingAppUserId.mock.invocationCallOrder[0]).toBeLessThan(
      mockPurchasePremium.mock.invocationCallOrder[0]
    );
  });

  it('購入成功（success）時だけ users.me が invalidate される', async () => {
    const successResult: PurchaseResult = { kind: 'success' };
    mockPurchasePremium.mockResolvedValue(successResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.users.me })
    );
  });

  it('購入成功: data が PurchaseResult { kind: "success" }', async () => {
    const successResult: PurchaseResult = { kind: 'success' };
    mockPurchasePremium.mockResolvedValue(successResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('success');
  });

  it('ユーザーキャンセル（userCancelled）では users.me を invalidate しない', async () => {
    const cancelResult: PurchaseResult = { kind: 'userCancelled' };
    mockPurchasePremium.mockResolvedValue(cancelResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('userCancelled');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('決済保留（pending）では users.me を invalidate しない', async () => {
    const pendingResult: PurchaseResult = { kind: 'pending', message: '保留中' };
    mockPurchasePremium.mockResolvedValue(pendingResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('pending');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('購入エラー（error）では users.me を invalidate しない', async () => {
    const errorResult: PurchaseResult = { kind: 'error', message: 'ネットワークエラー' };
    mockPurchasePremium.mockResolvedValue(errorResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('error');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('identify が失敗したら購入 SDK を呼ばず UI 向けエラーを返す', async () => {
    mockIdentifyBillingUser.mockRejectedValue(new Error('identify failed'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(BILLING_USER_IDENTITY_ERROR_MESSAGE);
    expect(mockGetBillingAppUserId).not.toHaveBeenCalled();
    expect(mockPurchasePremium).not.toHaveBeenCalled();
  });

  it('SDK の App User ID がサーバー ID と異なる場合は購入しない', async () => {
    mockGetBillingAppUserId.mockResolvedValue('$RCAnonymousID:anonymous');

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(BILLING_USER_IDENTITY_ERROR_MESSAGE);
    expect(mockPurchasePremium).not.toHaveBeenCalled();
  });

  it('購入 SDK が例外を投げた場合は users.me を invalidate しない', async () => {
    mockPurchasePremium.mockRejectedValue(new Error('SDK クラッシュ'));

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useRestorePurchasesMutation
// ---------------------------------------------------------------------------

describe('useRestorePurchasesMutation', () => {
  const variables = { userId: 'user-1' };

  it('復元直前に identify と App User ID 一致確認を行い、成功時だけ invalidate する', async () => {
    const successResult: RestoreResult = { kind: 'success' };
    mockRestorePurchases.mockResolvedValue(successResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.users.me })
    );
    expect(result.current.data?.kind).toBe('success');
    expect(mockIdentifyBillingUser).toHaveBeenCalledWith('user-1');
    expect(mockGetBillingAppUserId).toHaveBeenCalledTimes(1);
    expect(mockRestorePurchases).toHaveBeenCalledWith();
    expect(mockGetBillingAppUserId.mock.invocationCallOrder[0]).toBeLessThan(
      mockRestorePurchases.mock.invocationCallOrder[0]
    );
  });

  it('復元エラー（error）では users.me を invalidate しない', async () => {
    const errorResult: RestoreResult = { kind: 'error', message: '復元に失敗' };
    mockRestorePurchases.mockResolvedValue(errorResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('error');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('identify が失敗したら復元 SDK を呼ばない', async () => {
    mockIdentifyBillingUser.mockRejectedValue(new Error('identify failed'));

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(BILLING_USER_IDENTITY_ERROR_MESSAGE);
    expect(mockRestorePurchases).not.toHaveBeenCalled();
  });

  it('SDK の App User ID が異なる場合は復元 SDK を呼ばない', async () => {
    mockGetBillingAppUserId.mockResolvedValue('another-user');

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockRestorePurchases).not.toHaveBeenCalled();
  });

  it('復元 SDK が例外を投げた場合は users.me を invalidate しない', async () => {
    mockRestorePurchases.mockRejectedValue(new Error('SDK エラー'));

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(variables);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
