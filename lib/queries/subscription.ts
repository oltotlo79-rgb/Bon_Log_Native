/**
 * @module lib/queries/subscription
 * 課金フロー（購入・復元）の TanStack Query フック。
 * プレミアム判定の正はサーバーの users.me（isPremium）。
 * 購入・復元成功後は queryKeys.users.me を invalidate し、
 * RevenueCat Webhook 経由のサーバー DB 更新が反映されるまで反映待ち状態にする（billing.md）。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPremiumOffering,
  getBillingAppUserId,
  identifyBillingUser,
  purchasePremium,
  restorePurchases,
} from '@/lib/billing/purchases';
import type { PremiumOffering, PurchaseResult, RestoreResult } from '@/lib/billing/purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_MASTER } from '@/lib/constants/query';
import { BILLING_USER_IDENTITY_ERROR_MESSAGE } from '@/lib/constants/billing';

export interface PurchasePremiumVariables {
  premiumPackage: PurchasesPackage;
  userId: string;
}

export interface RestorePurchasesVariables {
  userId: string;
}

/**
 * 購入・復元の直前に RevenueCat をサーバーのユーザー ID へ必ず再識別する。
 * logIn 成功後も SDK が保持する ID を確認し、匿名 ID・別ユーザー ID のままなら中断する。
 */
async function requireBillingUserIdentity(userId: string): Promise<void> {
  try {
    if (userId.trim().length === 0) {
      throw new Error(BILLING_USER_IDENTITY_ERROR_MESSAGE);
    }

    await identifyBillingUser(userId);

    const revenueCatUserId = await getBillingAppUserId();
    if (revenueCatUserId !== userId) {
      throw new Error(BILLING_USER_IDENTITY_ERROR_MESSAGE);
    }
  } catch {
    throw new Error(BILLING_USER_IDENTITY_ERROR_MESSAGE);
  }
}

// ---------------------------------------------------------------------------
// usePremiumOfferingQuery
// ---------------------------------------------------------------------------

/**
 * RevenueCat から定期購入 Offering を取得するクエリフック。
 * 価格表示用にのみ使用する（プレミアム判定には使わない — billing.md 絶対規則 1）。
 * Offering は変更頻度が低いため staleTime を STALE_TIME_MASTER に設定する。
 *
 * frontend 向け: data は PremiumOffering | null。null の場合は Offering 未設定。
 */
export function usePremiumOfferingQuery() {
  return useQuery<PremiumOffering | null>({
    queryKey: queryKeys.subscription.offering,
    queryFn: getPremiumOffering,
    staleTime: STALE_TIME_MASTER,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// usePurchasePremiumMutation
// ---------------------------------------------------------------------------

/**
 * プレミアムプランを購入するミューテーションフック。
 * - 購入成功（success）時: queryKeys.users.me を invalidate して購読状態を再取得する
 * - ユーザーキャンセル（userCancelled）: onSuccess で返るので呼び出し元がハンドリング
 * - 保留（pending）/ エラー（error）: 同上
 *
 * Webhook 経由のため反映に数秒かかる可能性がある（billing.md 絶対規則 2）。
 * 呼び出し前に RevenueCat をサーバーの currentUser.id へ再識別し、SDK 上の ID 一致も確認する。
 * success 以外では users.me を invalidate しない。
 *
 * frontend 向け: mutate({ premiumPackage, userId }) で呼び出す。PurchaseResult が onSuccess に来る。
 */
export function usePurchasePremiumMutation() {
  const queryClient = useQueryClient();

  return useMutation<PurchaseResult, Error, PurchasePremiumVariables>({
    mutationFn: async ({ premiumPackage, userId }) => {
      await requireBillingUserIdentity(userId);
      return purchasePremium(premiumPackage);
    },
    onSuccess: async (result) => {
      if (result.kind === 'success') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
      }
    },
    // 429 等のリトライが不要。RevenueCat SDK が内部でリトライするため
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// useRestorePurchasesMutation
// ---------------------------------------------------------------------------

/**
 * 過去の購入を復元するミューテーションフック（審査要件 — billing.md 絶対規則 4）。
 * 復元成功後: queryKeys.users.me を invalidate してサーバーの購読状態を最新化する。
 *
 * 購入と同様に RevenueCat の App User ID を検証し、success 以外では invalidate しない。
 *
 * frontend 向け: mutate({ userId }) で呼び出す。RestoreResult が onSuccess に来る。
 */
export function useRestorePurchasesMutation() {
  const queryClient = useQueryClient();

  return useMutation<RestoreResult, Error, RestorePurchasesVariables>({
    mutationFn: async ({ userId }) => {
      await requireBillingUserIdentity(userId);
      return restorePurchases();
    },
    onSuccess: async (result) => {
      if (result.kind === 'success') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
      }
    },
    retry: false,
  });
}
