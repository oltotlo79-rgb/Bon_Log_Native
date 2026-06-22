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
import type { PurchasesPackage } from 'react-native-purchases';

// ---------------------------------------------------------------------------
// モック設定（lib/billing/purchases がモック境界）
// ---------------------------------------------------------------------------

const mockGetPremiumOffering = jest.fn();
const mockPurchasePremium = jest.fn();
const mockRestorePurchases = jest.fn();

jest.mock('@/lib/billing/purchases', () => ({
  getPremiumOffering: (...args: unknown[]) => mockGetPremiumOffering(...args),
  purchasePremium: (...args: unknown[]) => mockPurchasePremium(...args),
  restorePurchases: (...args: unknown[]) => mockRestorePurchases(...args),
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
  return {
    package: {
      identifier: 'monthly',
      product: {
        priceString: '¥480/月',
        title: 'プレミアムプラン（月額）',
      },
    } as unknown as PurchasesPackage,
    priceString: '¥480/月',
    title: 'プレミアムプラン（月額）',
  };
}

function makePackage(): PurchasesPackage {
  return {
    identifier: 'monthly',
    product: {
      priceString: '¥480/月',
      title: 'プレミアムプラン（月額）',
    },
  } as unknown as PurchasesPackage;
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
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

  it('購入成功（success）: onSettled で users.me が invalidate される', async () => {
    const successResult: PurchaseResult = { kind: 'success' };
    mockPurchasePremium.mockResolvedValue(successResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(pkg);
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
      result.current.mutate(pkg);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('success');
  });

  it('ユーザーキャンセル（userCancelled）: data が kind="userCancelled"', async () => {
    const cancelResult: PurchaseResult = { kind: 'userCancelled' };
    mockPurchasePremium.mockResolvedValue(cancelResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(pkg);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('userCancelled');
  });

  it('決済保留（pending）: data が kind="pending"', async () => {
    const pendingResult: PurchaseResult = { kind: 'pending', message: '保留中' };
    mockPurchasePremium.mockResolvedValue(pendingResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(pkg);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('pending');
  });

  it('購入エラー（error）: data が kind="error"', async () => {
    const errorResult: PurchaseResult = { kind: 'error', message: 'ネットワークエラー' };
    mockPurchasePremium.mockResolvedValue(errorResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(pkg);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('error');
  });

  it('SDK が例外 throw: isError が true になり users.me が invalidate される', async () => {
    mockPurchasePremium.mockRejectedValue(new Error('SDK クラッシュ'));

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePurchasePremiumMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(pkg);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // onSettled は成功・失敗問わず呼ばれる
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.users.me })
    );
  });
});

// ---------------------------------------------------------------------------
// useRestorePurchasesMutation
// ---------------------------------------------------------------------------

describe('useRestorePurchasesMutation', () => {
  it('復元成功（success）: onSettled で users.me が invalidate される', async () => {
    const successResult: RestoreResult = { kind: 'success' };
    mockRestorePurchases.mockResolvedValue(successResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.users.me })
    );
    expect(result.current.data?.kind).toBe('success');
  });

  it('復元エラー（error）: data が kind="error"', async () => {
    const errorResult: RestoreResult = { kind: 'error', message: '復元に失敗' };
    mockRestorePurchases.mockResolvedValue(errorResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.kind).toBe('error');
  });

  it('SDK が例外 throw: isError が true になり users.me が invalidate される', async () => {
    mockRestorePurchases.mockRejectedValue(new Error('SDK エラー'));

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.users.me })
    );
  });

  it('restorePurchases が引数なしで呼ばれる', async () => {
    const successResult: RestoreResult = { kind: 'success' };
    mockRestorePurchases.mockResolvedValue(successResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRestorePurchasesMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRestorePurchases).toHaveBeenCalledTimes(1);
  });
});
