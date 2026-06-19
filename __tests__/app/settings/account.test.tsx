/**
 * app/settings/account の画面テスト。
 * Google Play 審査要件: アプリ内からのアカウント削除導線が必須（store-compliance.md）。
 * useCurrentUserProfileQuery / useDeleteAccountMutation が TanStack Query を使うため
 * renderWithProviders で QueryClientProvider を提供する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsAccountScreen from '@/app/settings/account/index';

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

describe('SettingsAccountScreen', () => {
  it('ヘッダーに「アカウント設定」と表示される', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(screen.getByRole('header', { name: 'アカウント設定' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('メールアドレス変更ボタンが表示される', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(screen.getByRole('button', { name: 'メールアドレスを変更する' })).toBeTruthy();
  });

  it('パスワード変更ボタンが表示される', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(screen.getByRole('button', { name: 'パスワードを変更する' })).toBeTruthy();
  });

  it('【審査要件】アカウント削除ボタンが表示されている（Google Play 要件）', () => {
    renderWithProviders(<SettingsAccountScreen />);
    const deleteButton = screen.getByRole('button', {
      name: 'アカウントを削除する',
    });
    expect(deleteButton).toBeTruthy();
  });

  it('アカウント削除ボタンのテキストが確認できる', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(screen.getAllByText('アカウントを削除する').length).toBeGreaterThan(0);
  });

  it('危険ゾーンの警告文が表示される', () => {
    renderWithProviders(<SettingsAccountScreen />);
    expect(
      screen.getByText(/元に戻すことはできません/)
    ).toBeTruthy();
  });
});
