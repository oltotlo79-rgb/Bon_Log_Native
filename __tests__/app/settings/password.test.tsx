/**
 * @module __tests__/app/settings/password
 * app/settings/password の画面テスト。
 * 3欄表示 / 再入力不一致検証 / 成功バナー・フォームクリア / エラーコード別文言 / 二重送信防止を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsPasswordScreen from '@/app/settings/password/index';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_PASSWORD_MISMATCH,
  ERR_PASSWORD_CHANGE_INVALID_CURRENT,
  ERR_PASSWORD_CHANGE_WEAK,
  ERR_PASSWORD_CHANGE_OAUTH_ONLY,
  ERR_RATE_LIMIT,
} from '@/lib/constants/errors';

const mockRouter = jest.requireMock('expo-router').router;
const mockMutate = jest.fn();
const mockUseOnlineStatus = jest.fn(() => true);

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useChangePasswordMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

function fillForm({
  current = 'CurrentPass1',
  next = 'NewPassword2',
  confirm = 'NewPassword2',
}: { current?: string; next?: string; confirm?: string } = {}) {
  fireEvent.changeText(screen.getByLabelText('現在のパスワード'), current);
  fireEvent.changeText(screen.getByLabelText('新しいパスワード'), next);
  fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), confirm);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  const { useChangePasswordMutation } = jest.requireMock('@/lib/queries/auth');
  (useChangePasswordMutation as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  });
});

describe('SettingsPasswordScreen - 表示', () => {
  it('ヘッダーに「パスワード変更」と表示される', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    expect(screen.getByRole('header', { name: 'パスワード変更' })).toBeTruthy();
  });

  it('現在のパスワード・新しいパスワード・確認用の3欄が表示される', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    expect(screen.getByLabelText('現在のパスワード')).toBeTruthy();
    expect(screen.getByLabelText('新しいパスワード')).toBeTruthy();
    expect(screen.getByLabelText('新しいパスワード（確認）')).toBeTruthy();
  });

  it('初期状態では送信ボタンが disabled', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    const button = screen.getByRole('button', { name: 'パスワードを変更する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});

describe('SettingsPasswordScreen - 再入力一致検証', () => {
  it('確認用パスワードが不一致のときエラーが表示される', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    fillForm({ confirm: 'Different99' });
    expect(screen.getByText(ERR_PASSWORD_MISMATCH)).toBeTruthy();
  });

  it('確認用パスワードが不一致のとき送信ボタンが disabled のままになる', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    fillForm({ confirm: 'Different99' });
    const button = screen.getByRole('button', { name: 'パスワードを変更する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('不一致のまま送信を試みても mutate が呼ばれない', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    fillForm({ confirm: 'Different99' });
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('全欄が一致すると送信ボタンが有効になる', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    fillForm();
    const button = screen.getByRole('button', { name: 'パスワードを変更する' });
    expect(button.props.accessibilityState.disabled).toBe(false);
  });
});

describe('SettingsPasswordScreen - 成功', () => {
  it('成功でバナーが表示される', async () => {
    mockMutate.mockImplementation((_params, { onSuccess }) => {
      onSuccess({ success: true });
    });

    renderWithProviders(<SettingsPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await waitFor(() => {
      expect(screen.getByText('パスワードを変更しました。')).toBeTruthy();
    });
  });

  it('成功でフォームがクリアされる', async () => {
    mockMutate.mockImplementation((_params, { onSuccess }) => {
      onSuccess({ success: true });
    });

    renderWithProviders(<SettingsPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await waitFor(() => {
      expect(screen.getByLabelText('現在のパスワード').props.value).toBe('');
      expect(screen.getByLabelText('新しいパスワード').props.value).toBe('');
      expect(screen.getByLabelText('新しいパスワード（確認）').props.value).toBe('');
    });
  });

  it('成功で currentPassword・newPassword が mutate に渡される', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    fillForm({ current: 'CurrentPass1', next: 'NewPassword2', confirm: 'NewPassword2' });
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    expect(mockMutate).toHaveBeenCalledWith(
      { currentPassword: 'CurrentPass1', newPassword: 'NewPassword2' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });
});

describe('SettingsPasswordScreen - エラー文言', () => {
  it('401 AUTH_INVALID_CREDENTIALS のとき現パスワード不一致の文言が表示される', async () => {
    const apiError = new ApiError({
      code: 'AUTH_INVALID_CREDENTIALS',
      status: 401,
      message: 'invalid credentials',
    });
    mockMutate.mockImplementation((_params, { onError }) => {
      onError(apiError);
    });

    renderWithProviders(<SettingsPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_PASSWORD_CHANGE_INVALID_CURRENT)).toBeTruthy();
    });
  });

  it('400 VALIDATION_ERROR のとき強度不足の文言が表示される', async () => {
    const apiError = new ApiError({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'weak password',
    });
    mockMutate.mockImplementation((_params, { onError }) => {
      onError(apiError);
    });

    renderWithProviders(<SettingsPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_PASSWORD_CHANGE_WEAK)).toBeTruthy();
    });
  });

  it('409 CONFLICT のとき OAuth 専用アカウントの文言が表示される', async () => {
    const apiError = new ApiError({
      code: 'CONFLICT',
      status: 409,
      message: 'oauth only account',
    });
    mockMutate.mockImplementation((_params, { onError }) => {
      onError(apiError);
    });

    renderWithProviders(<SettingsPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_PASSWORD_CHANGE_OAUTH_ONLY)).toBeTruthy();
    });
  });

  it('429 RATE_LIMITED のときレート制限の文言が表示される', async () => {
    const apiError = new ApiError({
      code: 'RATE_LIMITED',
      status: 429,
      message: 'too many requests',
    });
    mockMutate.mockImplementation((_params, { onError }) => {
      onError(apiError);
    });

    renderWithProviders(<SettingsPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_RATE_LIMIT)).toBeTruthy();
    });
  });

  it('オフライン中は入力を満たしても送信ボタンが disabled のままになる', () => {
    mockUseOnlineStatus.mockReturnValue(false);

    renderWithProviders(<SettingsPasswordScreen />);
    fillForm();
    const button = screen.getByRole('button', { name: 'パスワードを変更する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    // canSubmit が false のため disabled ボタンへの press は mutate を呼ばない
    fireEvent.press(button);
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe('SettingsPasswordScreen - 二重送信防止', () => {
  it('isPending=true のとき送信ボタンがローディング状態になる', () => {
    const { useChangePasswordMutation } = jest.requireMock('@/lib/queries/auth');
    (useChangePasswordMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    renderWithProviders(<SettingsPasswordScreen />);
    const button = screen.getByRole('button', { name: 'パスワードを変更する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(button.props.accessibilityState.busy).toBe(true);
  });

  it('isPending=true のとき各入力欄が disabled になる', () => {
    const { useChangePasswordMutation } = jest.requireMock('@/lib/queries/auth');
    (useChangePasswordMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    renderWithProviders(<SettingsPasswordScreen />);
    expect(screen.getByLabelText('現在のパスワード').props.editable).toBe(false);
    expect(screen.getByLabelText('新しいパスワード').props.editable).toBe(false);
    expect(screen.getByLabelText('新しいパスワード（確認）').props.editable).toBe(false);
  });

  it('isPending=true のとき送信ボタンを押しても mutate が呼ばれない', () => {
    const { useChangePasswordMutation } = jest.requireMock('@/lib/queries/auth');
    (useChangePasswordMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    renderWithProviders(<SettingsPasswordScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe('SettingsPasswordScreen - ナビゲーション', () => {
  it('「戻る」ボタンを押すと router.back が呼ばれる', () => {
    renderWithProviders(<SettingsPasswordScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
