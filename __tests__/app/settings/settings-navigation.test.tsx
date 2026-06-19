/**
 * @module __tests__/app/settings/settings-navigation
 * SettingsScreen のナビゲーションテスト。
 * 各メニュー項目を押したときに正しいルートへ遷移することを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import SettingsScreen from '@/app/settings/index';
import { routes } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/lib/queries/auth', () => ({
  useLogoutMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SettingsScreen - ナビゲーション', () => {
  it('「プロフィール設定」を押すと settingsProfile へ遷移する', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'プロフィール設定' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.settingsProfile);
  });

  it('「アカウント設定」を押すと settingsAccount へ遷移する', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'アカウント設定' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.settingsAccount);
  });

  it('「通知設定」を押すと settingsNotifications へ遷移する', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: '通知設定' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.settingsNotifications);
  });

  it('「プレミアムプラン」を押すと settingsSubscription へ遷移する', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'プレミアムプラン' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.settingsSubscription);
  });

  it('「ブロックリスト」を押すと settingsBlocked へ遷移する', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'ブロックリスト' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.settingsBlocked);
  });

  it('「ミュートリスト」を押すと settingsMuted へ遷移する', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'ミュートリスト' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.settingsMuted);
  });

  it('「戻る」ボタンを押すと router.back が呼ばれる', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('「ヘルプ」を押しても例外が発生しない', () => {
    render(<SettingsScreen />);
    expect(() => {
      fireEvent.press(screen.getByRole('button', { name: 'ヘルプ' }));
    }).not.toThrow();
  });

  it('「利用規約」を押しても例外が発生しない', () => {
    render(<SettingsScreen />);
    expect(() => {
      fireEvent.press(screen.getByRole('button', { name: '利用規約' }));
    }).not.toThrow();
  });

  it('「プライバシーポリシー」を押しても例外が発生しない', () => {
    render(<SettingsScreen />);
    expect(() => {
      fireEvent.press(screen.getByRole('button', { name: 'プライバシーポリシー' }));
    }).not.toThrow();
  });

  it('全てのメニュー項目が表示される', () => {
    render(<SettingsScreen />);
    expect(screen.getByRole('button', { name: 'プロフィール設定' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'アカウント設定' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '通知設定' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'プレミアムプラン' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ブロックリスト' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ミュートリスト' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ヘルプ' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '利用規約' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'プライバシーポリシー' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy();
  });
});
