/**
 * @module __tests__/app/settings/security
 * SettingsSecurityScreen のテスト。
 * ヘッダー・戻るボタン・オフラインバナー・ローディング/エラー状態・
 * twoFactorEnabled による有効化/無効化セクションの出し分けを検証する。
 * モック境界: lib/queries/auth の useCurrentUserQuery をモック。ネットワークに出ない。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsSecurityScreen from '@/app/settings/security/index';
import { ERR_LOAD_FAILED } from '@/lib/constants/errors';

const mockRouter = jest.requireMock('expo-router').router;

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockRefetch = jest.fn();

type CurrentUserQueryResult = {
  isLoading: boolean;
  isError: boolean;
  data: { twoFactorEnabled: boolean } | undefined;
  refetch: jest.Mock;
};

const defaultCurrentUserQueryResult: CurrentUserQueryResult = {
  isLoading: false,
  isError: false,
  data: { twoFactorEnabled: false },
  refetch: mockRefetch,
};

const mockUseCurrentUserQuery = jest.fn<CurrentUserQueryResult, []>(
  () => defaultCurrentUserQueryResult
);

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
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
  mockUseCurrentUserQuery.mockReturnValue(defaultCurrentUserQueryResult);
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
});

describe('SettingsSecurityScreen twoFactorEnabled=false（有効化セクションのみ）', () => {
  beforeEach(() => {
    mockUseCurrentUserQuery.mockReturnValue({
      ...defaultCurrentUserQueryResult,
      data: { twoFactorEnabled: false },
    });
  });

  it('有効化セクションのボタンが表示される', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.getByRole('button', { name: '2段階認証を設定する' })).toBeTruthy();
  });

  it('無効化セクションのパスワード入力欄が表示されない', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.queryByLabelText('パスワード')).toBeNull();
  });

  it('オフライン時に有効化ボタンが disabled になる', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<SettingsSecurityScreen />);
    const button = screen.getByRole('button', { name: '2段階認証を設定する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});

describe('SettingsSecurityScreen twoFactorEnabled=true（無効化セクションのみ）', () => {
  beforeEach(() => {
    mockUseCurrentUserQuery.mockReturnValue({
      ...defaultCurrentUserQueryResult,
      data: { twoFactorEnabled: true },
    });
  });

  it('無効化セクションのパスワード入力欄が表示される', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
  });

  it('有効化セクションのボタンが表示されない', () => {
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.queryByRole('button', { name: '2段階認証を設定する' })).toBeNull();
  });
});

describe('SettingsSecurityScreen ローディング状態', () => {
  it('isLoading=true のときローディング表示になり有効化/無効化セクションは表示されない', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      ...defaultCurrentUserQueryResult,
      isLoading: true,
      data: undefined,
    });
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '2段階認証を設定する' })).toBeNull();
  });
});

describe('SettingsSecurityScreen エラー状態', () => {
  it('isError=true のときエラーメッセージと再試行ボタンが表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      ...defaultCurrentUserQueryResult,
      isError: true,
      data: undefined,
    });
    renderWithProviders(<SettingsSecurityScreen />);
    expect(screen.getByText(ERR_LOAD_FAILED)).toBeTruthy();
    expect(screen.getByRole('button', { name: '再試行する' })).toBeTruthy();
  });

  it('再試行ボタンを押すと refetch が呼ばれる', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      ...defaultCurrentUserQueryResult,
      isError: true,
      data: undefined,
    });
    renderWithProviders(<SettingsSecurityScreen />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
