/**
 * @module __tests__/app/settings/security
 * SettingsSecurityScreen のテスト。
 * ヘッダー・戻るボタン・オフラインバナー・2FA有効化/無効化セクションの表示を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsSecurityScreen from '@/app/settings/security/index';

const mockRouter = jest.requireMock('expo-router').router;

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock('@/lib/queries/auth', () => ({
  useTwoFactorSetupMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useEnableTwoFactorMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useDisableTwoFactorMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
});

describe('SettingsSecurityScreen 表示', () => {
  it('ヘッダー「セキュリティ設定」が表示される', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.getByRole('header', { name: 'セキュリティ設定' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('2段階認証の説明文が表示される', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    expect(
      screen.getByText(
        '2段階認証を設定すると、ログイン時にパスワードに加えて認証アプリのコードが必要になり、アカウントの安全性が高まります。'
      )
    ).toBeTruthy();
  });

  it('有効化セクションのボタンが表示される', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.getByRole('button', { name: '2段階認証を設定する' })).toBeTruthy();
  });

  it('無効化セクションのパスワード入力欄が表示される', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
  });
});

describe('SettingsSecurityScreen オフライン', () => {
  it('オフライン時に有効化ボタンが disabled になる', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<SettingsSecurityScreen />);
    const button = screen.getByRole('button', { name: '2段階認証を設定する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
