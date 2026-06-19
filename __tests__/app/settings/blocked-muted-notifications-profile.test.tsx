/**
 * app/settings/blocked, muted, notifications, profile の画面テスト。
 * 各画面の基本表示要素（ヘッダー・戻るボタン・コンテンツ）を検証する。
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsBlockedScreen from '@/app/settings/blocked/index';
import SettingsMutedScreen from '@/app/settings/muted/index';
import SettingsNotificationsScreen from '@/app/settings/notifications/index';
import SettingsProfileScreen from '@/app/settings/profile/index';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(() => Promise.resolve({ data: { items: [], nextCursor: null }, error: undefined })),
    POST: jest.fn(),
    DELETE: jest.fn(),
    PATCH: jest.fn(),
  },
  isApiError: (e: unknown) => e instanceof Error && (e as Error).name === 'ApiError',
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock('@/lib/push', () => ({
  getPushPermissionStatus: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  registerDeviceForPushNotifications: jest.fn(async () => ({ granted: true })),
}));

const mockRouterBack = jest.requireMock('expo-router').router.back;

describe('SettingsBlockedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「ブロックリスト」と表示される', () => {
    renderWithProviders(<SettingsBlockedScreen />);
    expect(screen.getByRole('header', { name: 'ブロックリスト' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    renderWithProviders(<SettingsBlockedScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    renderWithProviders(<SettingsBlockedScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('空状態のメッセージが表示される', async () => {
    renderWithProviders(<SettingsBlockedScreen />);
    await waitFor(() => {
      expect(screen.getByText('ブロック中のユーザーはいません')).toBeTruthy();
    });
  });
});

describe('SettingsMutedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「ミュートリスト」と表示される', () => {
    renderWithProviders(<SettingsMutedScreen />);
    expect(screen.getByRole('header', { name: 'ミュートリスト' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    renderWithProviders(<SettingsMutedScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    renderWithProviders(<SettingsMutedScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('空状態のメッセージが表示される', async () => {
    renderWithProviders(<SettingsMutedScreen />);
    await waitFor(() => {
      expect(screen.getByText('ミュート中のユーザーはいません')).toBeTruthy();
    });
  });
});

describe('SettingsNotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockPush = jest.requireMock('@/lib/push');
    (mockPush.getPushPermissionStatus as jest.Mock).mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });
  });

  it('ヘッダーに「通知設定」と表示される', () => {
    render(<SettingsNotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知設定' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    render(<SettingsNotificationsScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    render(<SettingsNotificationsScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('カードに「プッシュ通知」という見出しが表示される', () => {
    render(<SettingsNotificationsScreen />);
    expect(screen.getByText('プッシュ通知')).toBeTruthy();
  });

  it('通知の説明文が表示される', () => {
    render(<SettingsNotificationsScreen />);
    expect(
      screen.getByText('いいね・コメント・フォローなどの通知をお知らせします。')
    ).toBeTruthy();
  });
});

describe('SettingsProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「プロフィールを編集」と表示される', () => {
    renderWithProviders(<SettingsProfileScreen />);
    expect(screen.getByRole('header', { name: 'プロフィールを編集' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    renderWithProviders(<SettingsProfileScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    renderWithProviders(<SettingsProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('プロフィール取得中または取得後に「プロフィールを編集」ヘッダーが表示される', () => {
    renderWithProviders(<SettingsProfileScreen />);
    expect(screen.getByRole('header', { name: 'プロフィールを編集' })).toBeTruthy();
  });
});
