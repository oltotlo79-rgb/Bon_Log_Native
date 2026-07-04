/**
 * @module __tests__/app/settings/account-password-email-navigation
 * app/settings/account のパスワード変更・メールアドレス変更導線に関するテスト。
 * サーバー本番 DB マイグレーション適用完了の連絡を受け、メールアドレス変更導線は
 * パスワード変更導線と並んで公開されている。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsAccountScreen from '@/app/settings/account/index';
import { ROUTE_SETTINGS_PASSWORD, ROUTE_SETTINGS_EMAIL } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(() => Promise.resolve({ data: undefined, error: undefined })),
    POST: jest.fn(() => Promise.resolve({ data: undefined, error: undefined })),
    DELETE: jest.fn(() => Promise.resolve({ data: undefined, error: undefined })),
    PATCH: jest.fn(() => Promise.resolve({ data: undefined, error: undefined })),
  },
  isApiError: () => false,
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SettingsAccountScreen - パスワード変更導線', () => {
  it('「パスワードを変更」を押すと ROUTE_SETTINGS_PASSWORD へ遷移する', () => {
    renderWithProviders(<SettingsAccountScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));
    expect(mockRouter.push).toHaveBeenCalledWith(ROUTE_SETTINGS_PASSWORD);
  });
});

describe('SettingsAccountScreen - メールアドレス変更導線（公開後）', () => {
  it('「メールアドレスを変更」ボタンが表示される', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(screen.getByRole('button', { name: 'メールアドレスを変更する' })).toBeTruthy();
  });

  it('「メールアドレスを変更」を押すと ROUTE_SETTINGS_EMAIL へ遷移する', () => {
    renderWithProviders(<SettingsAccountScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'メールアドレスを変更する' }));
    expect(mockRouter.push).toHaveBeenCalledWith(ROUTE_SETTINGS_EMAIL);
  });

  it('パスワード変更・メールアドレス変更の両ボタンが並んで存在する', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(screen.getByRole('button', { name: 'パスワードを変更する' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'メールアドレスを変更する' })).toBeTruthy();
  });
});
