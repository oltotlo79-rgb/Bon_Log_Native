/**
 * app/settings/subscription の画面テスト。
 * Google Play 審査要件: 購入の復元ボタンが必須（store-compliance.md）。
 * billing.md: プレミアム判定はサーバーの users.me（isPremium）が正。
 */

import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsSubscriptionScreen from '@/app/settings/subscription/index';
import {
  BILLING_USER_IDENTITY_ERROR_MESSAGE,
  PLAY_SUBSCRIPTIONS_MANAGEMENT_URL,
  SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS,
  SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS,
} from '@/lib/constants/billing';
import {
  ERR_PURCHASE_FAILED,
  ERR_PURCHASE_RESTORE_FAILED,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockCurrentUserQuery = jest.fn();
const mockPremiumOfferingQuery = jest.fn();
const mockPurchaseMutate = jest.fn();
const mockRestoreMutate = jest.fn();
const mockRefetchCurrentUser = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockCurrentUserQuery(),
}));

jest.mock('@/lib/queries/subscription', () => ({
  usePremiumOfferingQuery: () => mockPremiumOfferingQuery(),
  usePurchasePremiumMutation: () => ({
    mutate: mockPurchaseMutate,
    isPending: false,
  }),
  useRestorePurchasesMutation: () => ({
    mutate: mockRestoreMutate,
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeCurrentUser(overrides?: Record<string, unknown>) {
  return {
    id: 'user-1',
    nickname: '松の匠',
    isPremium: false,
    ...overrides,
  };
}

function makePremiumOffering() {
  return {
    package: {
      identifier: 'monthly',
      packageType: 'MONTHLY',
      product: {
        identifier: 'com.bon_log.premium.monthly',
        priceString: '¥480/月',
        title: 'プレミアムプラン（月額）',
      },
    },
    priceString: '¥480/月',
    title: 'プレミアムプラン（月額）',
  };
}

function setupDefaultMocks() {
  mockCurrentUserQuery.mockReturnValue({
    data: makeCurrentUser(),
    isFetching: false,
    refetch: mockRefetchCurrentUser,
  });
  mockPremiumOfferingQuery.mockReturnValue({
    data: makePremiumOffering(),
    isLoading: false,
    isError: false,
  });
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  mockRefetchCurrentUser.mockResolvedValue({ data: makeCurrentUser() });
  setupDefaultMocks();
});

// ---------------------------------------------------------------------------
// 基本表示テスト
// ---------------------------------------------------------------------------

describe('SettingsSubscriptionScreen', () => {
  describe('基本表示', () => {
    it('ヘッダーに「プレミアムプラン」と表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByRole('header', { name: 'プレミアムプラン' })).toBeTruthy();
    });

    it('戻るボタンが表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('現在のプランセクションが表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('現在のプラン')).toBeTruthy();
    });

    it('プレミアムの特典セクションが表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('プレミアムの特典')).toBeTruthy();
    });

    it('【審査要件】購入の復元ボタンが表示されている（Google Play 要件）', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      const restoreButton = screen.getByRole('button', { name: '購入を復元する' });
      expect(restoreButton).toBeTruthy();
    });

    it('Google Play 定期購入管理ボタン（subscription-manage testID）が表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByTestId('subscription-manage')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 無料/プレミアムの出し分け
  // -------------------------------------------------------------------------

  describe('無料プランユーザー', () => {
    beforeEach(() => {
      mockCurrentUserQuery.mockReturnValue({
        data: makeCurrentUser({ isPremium: false }),
        isFetching: false,
        refetch: mockRefetchCurrentUser,
      });
    });

    it('「無料プラン」と表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('無料プラン')).toBeTruthy();
    });

    it('購入ボタンが表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(
        screen.getByRole('button', { name: 'プレミアムプランを購入する' })
      ).toBeTruthy();
    });

    it('「加入中」バッジは表示されない', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.queryByText('加入中')).toBeNull();
    });
  });

  describe('プレミアムユーザー', () => {
    beforeEach(() => {
      mockCurrentUserQuery.mockReturnValue({
        data: makeCurrentUser({ isPremium: true }),
        isFetching: false,
        refetch: mockRefetchCurrentUser,
      });
    });

    it('「プレミアム会員」と表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('プレミアム会員')).toBeTruthy();
    });

    it('購入ボタンは表示されない（プレミアム加入済み）', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(
        screen.queryByRole('button', { name: 'プレミアムプランを購入する' })
      ).toBeNull();
    });

    it('「加入中」バッジが表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('加入中')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 価格表示
  // -------------------------------------------------------------------------

  describe('価格表示', () => {
    it('offering 取得中は「読み込み中...」を表示', () => {
      mockPremiumOfferingQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('読み込み中...')).toBeTruthy();
    });

    it('offering エラー時は「価格情報を取得できませんでした」を表示', () => {
      mockPremiumOfferingQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('価格情報を取得できませんでした')).toBeTruthy();
    });

    it('offering が null のとき「価格情報を取得できませんでした」を表示', () => {
      mockPremiumOfferingQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('価格情報を取得できませんでした')).toBeTruthy();
    });

    it('offering が取得できた場合は価格文字列を表示', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('¥480/月')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 購入フロー
  // -------------------------------------------------------------------------

  describe('購入フロー', () => {
    it('購入ボタンを押すと purchaseMutation.mutate が呼ばれる', async () => {
      mockPurchaseMutate.mockImplementation((_pkg: unknown, options?: { onSuccess?: (result: { kind: string }) => void }) => {
        options?.onSuccess?.({ kind: 'success' });
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });

      expect(mockPurchaseMutate).toHaveBeenCalledTimes(1);
      expect(mockPurchaseMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          premiumPackage: expect.objectContaining({ identifier: 'monthly' }),
        }),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('購入成功（success）時にトーストが表示される', async () => {
      mockPurchaseMutate.mockImplementation((_pkg: unknown, options?: { onSuccess?: (result: { kind: string }) => void }) => {
        options?.onSuccess?.({ kind: 'success' });
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });

      expect(
        screen.getByText('プレミアムプランへの加入を受け付けました。反映には数秒かかることがあります。')
      ).toBeTruthy();
    });

    it('購入キャンセル（userCancelled）時はトーストを出さない', async () => {
      mockPurchaseMutate.mockImplementation((_pkg: unknown, options?: { onSuccess?: (result: { kind: string }) => void }) => {
        options?.onSuccess?.({ kind: 'userCancelled' });
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });

      expect(
        screen.queryByText('プレミアムプランへの加入を受け付けました。反映には数秒かかることがあります。')
      ).toBeNull();
    });

    it('購入保留（pending）時に警告トーストが表示される', async () => {
      mockPurchaseMutate.mockImplementation((_pkg: unknown, options?: { onSuccess?: (result: { kind: string; message?: string }) => void }) => {
        options?.onSuccess?.({ kind: 'pending', message: '決済が保留中です。' });
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });

      // ERR_PURCHASE_PENDING の定数値と一致させる
      const pendingMsg = screen.getByText('決済が保留中です。Google Play でご確認ください。');
      expect(pendingMsg).toBeTruthy();
    });

    it('購入エラー（error）時にエラーメッセージトーストが表示される', async () => {
      mockPurchaseMutate.mockImplementation((_pkg: unknown, options?: { onSuccess?: (result: { kind: string; message?: string }) => void }) => {
        options?.onSuccess?.({ kind: 'error', message: '購入に失敗しました。' });
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });

      expect(screen.getByText(ERR_PURCHASE_FAILED)).toBeTruthy();
    });

    it('identify 失敗が mutation error になった場合は案内を表示する', async () => {
      mockPurchaseMutate.mockImplementation(
        (
          _variables: unknown,
          options?: { onError?: (error: Error) => void }
        ) => {
          options?.onError?.(new Error(BILLING_USER_IDENTITY_ERROR_MESSAGE));
        }
      );
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });

      expect(screen.getByText(BILLING_USER_IDENTITY_ERROR_MESSAGE)).toBeTruthy();
    });

    it('offering が null のとき購入ボタンは disabled になっている', () => {
      mockPremiumOfferingQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      const purchaseButton = screen.getByTestId('subscription-purchase');
      expect(purchaseButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 復元フロー
  // -------------------------------------------------------------------------

  describe('復元フロー', () => {
    it('復元ボタンを押すと restoreMutation.mutate が呼ばれる', async () => {
      mockRestoreMutate.mockImplementation((_: unknown, options?: { onSuccess?: (result: { kind: string }) => void }) => {
        options?.onSuccess?.({ kind: 'success' });
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '購入を復元する' }));
      });

      expect(mockRestoreMutate).toHaveBeenCalledTimes(1);
      expect(mockRestoreMutate).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('復元成功（success）時にトーストが表示される', async () => {
      mockRestoreMutate.mockImplementation((_: unknown, options?: { onSuccess?: (result: { kind: string }) => void }) => {
        options?.onSuccess?.({ kind: 'success' });
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '購入を復元する' }));
      });

      expect(
        screen.getByText('購入の復元を受け付けました。反映には数秒かかることがあります。')
      ).toBeTruthy();
    });

    it('復元エラー（error）時にエラートーストが表示される', async () => {
      mockRestoreMutate.mockImplementation((_: unknown, options?: { onSuccess?: (result: { kind: string; message?: string }) => void }) => {
        options?.onSuccess?.({ kind: 'error', message: '復元に失敗しました。' });
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '購入を復元する' }));
      });

      expect(screen.getByText(ERR_PURCHASE_RESTORE_FAILED)).toBeTruthy();
    });

    it('復元前の identify 失敗が mutation error になった場合は案内を表示する', async () => {
      mockRestoreMutate.mockImplementation(
        (
          _variables: unknown,
          options?: { onError?: (error: Error) => void }
        ) => {
          options?.onError?.(new Error(BILLING_USER_IDENTITY_ERROR_MESSAGE));
        }
      );
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '購入を復元する' }));
      });

      expect(screen.getByText(BILLING_USER_IDENTITY_ERROR_MESSAGE)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 反映待ち UI
  // -------------------------------------------------------------------------

  describe('反映待ち UI', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('購入成功時だけ users.me を再確認し、isPremium=true でポーリングを停止する', async () => {
      mockPurchaseMutate.mockImplementation(
        (
          _variables: unknown,
          options?: { onSuccess?: (result: { kind: 'success' }) => void }
        ) => {
          options?.onSuccess?.({ kind: 'success' });
        }
      );
      mockRefetchCurrentUser.mockResolvedValue({
        data: makeCurrentUser({ isPremium: true }),
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });
      expect(
        screen.getByText(
          '購入情報を確認しています。サーバーへの反映までこのままお待ちください。'
        )
      ).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS);
        await Promise.resolve();
      });

      expect(mockRefetchCurrentUser).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText(
          '購入情報を確認しています。サーバーへの反映までこのままお待ちください。'
        )
      ).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(
          SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS *
            SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS
        );
      });
      expect(mockRefetchCurrentUser).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['userCancelled', { kind: 'userCancelled' }],
      ['pending', { kind: 'pending', message: '保留中' }],
      ['error', { kind: 'error', message: '購入失敗' }],
    ])('%s では users.me をポーリングしない', async (_label, mutationResult) => {
      mockPurchaseMutate.mockImplementation(
        (
          _variables: unknown,
          options?: { onSuccess?: (result: typeof mutationResult) => void }
        ) => {
          options?.onSuccess?.(mutationResult);
        }
      );
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });
      await act(async () => {
        jest.advanceTimersByTime(
          SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS *
            SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS
        );
      });

      expect(mockRefetchCurrentUser).not.toHaveBeenCalled();
      expect(
        screen.queryByText(
          '購入情報を確認しています。サーバーへの反映までこのままお待ちください。'
        )
      ).toBeNull();
    });

    it('上限到達後は反映待ち状態を保持し、手動再確認で再開できる', async () => {
      mockPurchaseMutate.mockImplementation(
        (
          _variables: unknown,
          options?: { onSuccess?: (result: { kind: 'success' }) => void }
        ) => {
          options?.onSuccess?.({ kind: 'success' });
        }
      );
      mockRefetchCurrentUser.mockResolvedValue({
        data: makeCurrentUser({ isPremium: false }),
      });
      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'プレミアムプランを購入する' })
        );
      });

      for (let attempt = 0; attempt < SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS; attempt += 1) {
        await act(async () => {
          jest.advanceTimersByTime(SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS);
          await Promise.resolve();
        });
      }

      expect(mockRefetchCurrentUser).toHaveBeenCalledTimes(
        SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS
      );
      expect(
        screen.getByText(
          '購入情報の反映を確認できませんでした。しばらく待ってから、再確認してください。'
        )
      ).toBeTruthy();
      const retryButton = screen.getByRole('button', { name: '購入状態を再確認する' });

      await act(async () => {
        jest.advanceTimersByTime(
          SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS *
            SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS
        );
      });
      expect(mockRefetchCurrentUser).toHaveBeenCalledTimes(
        SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS
      );

      mockRefetchCurrentUser.mockResolvedValue({
        data: makeCurrentUser({ isPremium: true }),
      });
      await act(async () => {
        fireEvent.press(retryButton);
      });
      await act(async () => {
        jest.advanceTimersByTime(SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS);
        await Promise.resolve();
      });

      expect(mockRefetchCurrentUser).toHaveBeenCalledTimes(
        SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS + 1
      );
      expect(
        screen.queryByText(
          '購入情報の反映を確認できませんでした。しばらく待ってから、再確認してください。'
        )
      ).toBeNull();
    });

    it('画面を離れたら予約済みのポーリングを破棄する', async () => {
      mockRestoreMutate.mockImplementation(
        (
          _variables: unknown,
          options?: { onSuccess?: (result: { kind: 'success' }) => void }
        ) => {
          options?.onSuccess?.({ kind: 'success' });
        }
      );
      const view = renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '購入を復元する' }));
      });
      view.unmount();

      await act(async () => {
        jest.advanceTimersByTime(
          SUBSCRIPTION_REFLECTION_POLL_INTERVAL_MS *
            SUBSCRIPTION_REFLECTION_MAX_ATTEMPTS
        );
      });

      expect(mockRefetchCurrentUser).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 管理ボタン
  // -------------------------------------------------------------------------

  describe('管理ボタン', () => {
    it('管理ボタンを押すと Linking.openURL が正しい URL で呼ばれる', async () => {
      // Linking は jest.mock ではなく spyOn で差し替える
      // react-native 内部の NativeLinking モジュール経由なので spyOn が有効
      const linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

      renderWithProviders(<SettingsSubscriptionScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('subscription-manage'));
      });

      expect(linkingSpy).toHaveBeenCalledWith(PLAY_SUBSCRIPTIONS_MANAGEMENT_URL);
      expect(PLAY_SUBSCRIPTIONS_MANAGEMENT_URL).toBe(
        'https://play.google.com/store/account/subscriptions'
      );

      linkingSpy.mockRestore();
    });

    it('subscription-manage testID のボタンが存在する', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByTestId('subscription-manage')).toBeTruthy();
    });

    it('Google Play 定期購入管理のリンクテキストが表示される', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByText('Google Play の定期購入を管理する')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // testID 検証
  // -------------------------------------------------------------------------

  describe('testID', () => {
    it('subscription-purchase の testID が存在する（無料ユーザー）', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByTestId('subscription-purchase')).toBeTruthy();
    });

    it('subscription-restore の testID が存在する', () => {
      renderWithProviders(<SettingsSubscriptionScreen />);
      expect(screen.getByTestId('subscription-restore')).toBeTruthy();
    });
  });
});
