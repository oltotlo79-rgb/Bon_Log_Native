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
  purchasePremium,
  restorePurchases,
} from '@/lib/billing/purchases';
import type { PremiumOffering, PurchaseResult, RestoreResult } from '@/lib/billing/purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_MASTER } from '@/lib/constants/query';

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
 * invalidate 後は users.me の isFetching を確認して反映待ち UI を出すこと。
 *
 * frontend 向け: mutate(premiumPackage) で呼び出す。PurchaseResult が onSuccess に来る。
 */
export function usePurchasePremiumMutation() {
  const queryClient = useQueryClient();

  return useMutation<PurchaseResult, Error, PurchasesPackage>({
    mutationFn: (pkg: PurchasesPackage) => purchasePremium(pkg),
    onSettled: async (_data, _error, _variables) => {
      // 購入試行後は常に users.me を invalidate する（成功・失敗問わず購読状態を最新化する）
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
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
 * frontend 向け: mutate() を引数なしで呼び出す。RestoreResult が onSuccess に来る。
 */
export function useRestorePurchasesMutation() {
  const queryClient = useQueryClient();

  return useMutation<RestoreResult, Error, void>({
    mutationFn: () => restorePurchases(),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
    },
    retry: false,
  });
}
