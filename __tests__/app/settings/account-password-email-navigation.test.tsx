/**
 * @module __tests__/app/settings/account-password-email-navigation
 * app/settings/account のパスワード変更・メールアドレス変更導線に関するテスト。
 * パスワード変更導線は ROUTE_SETTINGS_PASSWORD への遷移を提供する一方、
 * メールアドレス変更導線はサーバー本番 DB マイグレーション適用まで非公開のため存在しないことを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsAccountScreen from '@/app/settings/account/index';
import { ROUTE_SETTINGS_PASSWORD } from '@/lib/constants/routes';

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

describe('SettingsAccountScreen - メールアドレス変更導線（非公開）', () => {
  it('メールアドレス変更へのボタン・テキストが存在しない', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(screen.queryByText('メールアドレスを変更')).toBeNull();
    expect(screen.queryByRole('button', { name: 'メールアドレスを変更' })).toBeNull();
  });

  it('パスワード変更を押しても /settings/email への push は呼ばれない', () => {
    renderWithProviders(<SettingsAccountScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));
    expect(mockRouter.push).not.toHaveBeenCalledWith('/settings/email');
  });
});
