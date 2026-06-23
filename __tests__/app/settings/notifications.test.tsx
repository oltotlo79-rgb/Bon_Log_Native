/**
 * app/settings/notifications/index のコンポーネントテスト。
 * 許可済み / 未許可(canAskAgain) / 完全拒否 の3表示パターン、
 * 「通知を有効にする」ボタン動作、「設定アプリを開く」ボタン動作、
 * オフライン時の無効化を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import SettingsNotificationsScreen from '@/app/settings/notifications/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockGetPermissionStatus = jest.fn();
const mockRegisterDevice = jest.fn();

jest.mock('@/lib/push', () => ({
  getPushPermissionStatus: (...args: unknown[]) => mockGetPermissionStatus(...args),
  registerDeviceForPushNotifications: (...args: unknown[]) => mockRegisterDevice(...args),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

// NotificationTypeSettings（子コンポーネント）が useNotificationSettingsQuery を呼ぶため
// lib/queries/notifications をモックし、QueryClient 未設定エラーを防ぐ。
jest.mock('@/lib/queries/notifications', () => ({
  useNotificationSettingsQuery: jest.fn(() => ({
    data: { preferences: {} },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useUpdateNotificationSettingsMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  resolveNotificationPreference: (_prefs: Record<string, boolean | undefined>, _key: string) => true,
  useNotificationsQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isRefetching: false,
    refetch: jest.fn(),
  })),
  useUnreadCountQuery: jest.fn(() => ({ data: { count: 0 } })),
  useMarkNotificationsReadMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

// Linking.openSettings はモジュール参照で上書きする
jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

const mockRouterBack = jest.requireMock('expo-router').router.back;

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  (Linking.openSettings as jest.Mock).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// 表示パターン
// ---------------------------------------------------------------------------

describe('SettingsNotificationsScreen', () => {
  describe('許可済みの場合', () => {
    beforeEach(() => {
      mockGetPermissionStatus.mockResolvedValue({ granted: true });
    });

    it('「通知は有効です」が表示される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByText('通知は有効です')).toBeTruthy();
      });
    });

    it('「通知を有効にする」ボタンが表示されない', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByText('通知は有効です')).toBeTruthy();
      });

      expect(screen.queryByRole('button', { name: '通知を有効にする' })).toBeNull();
    });

    it('「設定アプリを開く」ボタンが表示されない', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByText('通知は有効です')).toBeTruthy();
      });

      expect(screen.queryByRole('button', { name: '設定アプリを開く' })).toBeNull();
    });
  });

  describe('未許可（canAskAgain=true）の場合', () => {
    beforeEach(() => {
      mockGetPermissionStatus.mockResolvedValue({ granted: false, canAskAgain: true });
      mockRegisterDevice.mockResolvedValue({ granted: true });
    });

    it('「通知を有効にする」ボタンが表示される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '通知を有効にする' })).toBeTruthy();
      });
    });

    it('「通知を有効にする」を押すと registerDeviceForPushNotifications が呼ばれる', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '通知を有効にする' })).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '通知を有効にする' }));
        await Promise.resolve();
      });

      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    });

    it('「設定アプリを開く」ボタンが表示されない', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '通知を有効にする' })).toBeTruthy();
      });

      expect(screen.queryByRole('button', { name: '設定アプリを開く' })).toBeNull();
    });
  });

  describe('完全拒否（canAskAgain=false）の場合', () => {
    beforeEach(() => {
      mockGetPermissionStatus.mockResolvedValue({ granted: false, canAskAgain: false });
    });

    it('「通知が許可されていません。」が表示される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByText('通知が許可されていません。')).toBeTruthy();
      });
    });

    it('「設定アプリを開く」ボタンが表示される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '設定アプリを開く' })).toBeTruthy();
      });
    });

    it('「設定アプリを開く」を押すと Linking.openSettings が呼ばれる', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '設定アプリを開く' })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: '設定アプリを開く' }));

      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });

    it('「通知を有効にする」ボタンが表示されない', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByText('通知が許可されていません。')).toBeTruthy();
      });

      expect(screen.queryByRole('button', { name: '通知を有効にする' })).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // ヘッダー・共通 UI
  // ---------------------------------------------------------------------------

  describe('共通 UI', () => {
    beforeEach(() => {
      mockGetPermissionStatus.mockResolvedValue({ granted: false, canAskAgain: true });
    });

    it('ヘッダーに「通知設定」が表示される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);
      await waitFor(() => {
        expect(screen.getByRole('header', { name: '通知設定' })).toBeTruthy();
      });
    });

    it('戻るボタンが表示される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
      });
    });

    it('戻るボタンを押すと router.back が呼ばれる', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
      });
      fireEvent.press(screen.getByRole('button', { name: '戻る' }));
      expect(mockRouterBack).toHaveBeenCalledTimes(1);
    });

    it('「プッシュ通知」という見出しが表示される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);
      await waitFor(() => {
        expect(screen.getByText('プッシュ通知')).toBeTruthy();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // オフライン時
  // ---------------------------------------------------------------------------

  describe('オフライン時', () => {
    beforeEach(() => {
      mockGetPermissionStatus.mockResolvedValue({ granted: false, canAskAgain: true });
      (
        jest.requireMock('@/hooks/use-online-status')
          .useOnlineStatus as jest.Mock
      ).mockReturnValue(false);
    });

    afterEach(() => {
      // オンラインに戻す
      (
        jest.requireMock('@/hooks/use-online-status')
          .useOnlineStatus as jest.Mock
      ).mockReturnValue(true);
    });

    it('オフラインバナーが表示される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(
          screen.getByText('オフライン中です。通知の設定変更はオンライン時に行ってください。')
        ).toBeTruthy();
      });
    });

    it('「通知を有効にする」ボタンが無効化される', async () => {
      renderWithProviders(<SettingsNotificationsScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '通知を有効にする' })).toBeTruthy();
      });

      const button = screen.getByRole('button', { name: '通知を有効にする' });
      expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBeTruthy();
    });
  });
});
