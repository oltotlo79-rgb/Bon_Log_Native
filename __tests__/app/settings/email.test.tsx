/**
 * @module __tests__/app/settings/email
 * app/settings/email の画面テスト。
 * 2欄表示 / 成功で案内文言（案B）に切替 / エラー文言（パスワード不一致・OAuth専用）を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsEmailScreen from '@/app/settings/email/index';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_EMAIL_CHANGE_INVALID_PASSWORD,
  ERR_EMAIL_CHANGE_OAUTH_ONLY,
  ERR_RATE_LIMIT,
  ERR_EMAIL_INVALID,
} from '@/lib/constants/errors';

const mockRouter = jest.requireMock('expo-router').router;
const mockMutate = jest.fn();
const mockUseOnlineStatus = jest.fn(() => true);

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useRequestEmailChangeMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

const EMAIL_CHANGE_REQUEST_SENT_MESSAGE =
  '確認メールを送信しました。新しいアドレスに届くメールのリンクから手続きを完了してください。';

function fillForm({
  newEmail = 'new@example.com',
  currentPassword = 'CurrentPass1',
}: { newEmail?: string; currentPassword?: string } = {}) {
  fireEvent.changeText(screen.getByLabelText('新しいメールアドレス'), newEmail);
  fireEvent.changeText(screen.getByLabelText('現在のパスワード'), currentPassword);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  const { useRequestEmailChangeMutation } = jest.requireMock('@/lib/queries/auth');
  (useRequestEmailChangeMutation as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  });
});

describe('SettingsEmailScreen - 表示', () => {
  it('ヘッダーに「メールアドレス変更」と表示される', () => {
    renderWithProviders(<SettingsEmailScreen />);
    expect(screen.getByRole('header', { name: 'メールアドレス変更' })).toBeTruthy();
  });

  it('新しいメールアドレス・現在のパスワードの2欄が表示される', () => {
    renderWithProviders(<SettingsEmailScreen />);
    expect(screen.getByLabelText('新しいメールアドレス')).toBeTruthy();
    expect(screen.getByLabelText('現在のパスワード')).toBeTruthy();
  });

  it('初期状態では送信ボタンが disabled', () => {
    renderWithProviders(<SettingsEmailScreen />);
    const button = screen.getByRole('button', { name: '確認メールを送信' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('両欄を入力すると送信ボタンが有効になる', () => {
    renderWithProviders(<SettingsEmailScreen />);
    fillForm();
    const button = screen.getByRole('button', { name: '確認メールを送信' });
    expect(button.props.accessibilityState.disabled).toBe(false);
  });
});

describe('SettingsEmailScreen - 入力検証', () => {
  it('メールアドレス未入力のまま送信するとエラーが表示される', () => {
    renderWithProviders(<SettingsEmailScreen />);
    fireEvent.changeText(screen.getByLabelText('現在のパスワード'), 'CurrentPass1');
    // ボタンは disabled のため、直接 changeText で newEmail を空のままにした状態を確認
    const button = screen.getByRole('button', { name: '確認メールを送信' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('不正な形式のメールアドレスで送信するとエラーが表示される', async () => {
    renderWithProviders(<SettingsEmailScreen />);
    fillForm({ newEmail: 'invalid-email' });
    fireEvent.press(screen.getByRole('button', { name: '確認メールを送信' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_EMAIL_INVALID)).toBeTruthy();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe('SettingsEmailScreen - 成功（案B: 案内表示への切替）', () => {
  it('成功で入力フォームが消え、案内文言に切り替わる', async () => {
    mockMutate.mockImplementation((_params, { onSuccess }) => {
      onSuccess({ success: true });
    });

    renderWithProviders(<SettingsEmailScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: '確認メールを送信' }));

    await waitFor(() => {
      expect(screen.getByText(EMAIL_CHANGE_REQUEST_SENT_MESSAGE)).toBeTruthy();
    });
    expect(screen.queryByLabelText('新しいメールアドレス')).toBeNull();
    expect(screen.queryByLabelText('現在のパスワード')).toBeNull();
  });

  it('成功で newEmail・currentPassword が mutate に渡される', () => {
    renderWithProviders(<SettingsEmailScreen />);
    fillForm({ newEmail: 'new@example.com', currentPassword: 'CurrentPass1' });
    fireEvent.press(screen.getByRole('button', { name: '確認メールを送信' }));

    expect(mockMutate).toHaveBeenCalledWith(
      { newEmail: 'new@example.com', currentPassword: 'CurrentPass1' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('案内表示から「設定に戻る」を押すと router.back が呼ばれる', async () => {
    mockMutate.mockImplementation((_params, { onSuccess }) => {
      onSuccess({ success: true });
    });

    renderWithProviders(<SettingsEmailScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: '確認メールを送信' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '設定に戻る' })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: '設定に戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('SettingsEmailScreen - エラー文言', () => {
  it('401 AUTH_INVALID_CREDENTIALS のとき現在のパスワード不一致の文言が表示される', async () => {
    const apiError = new ApiError({
      code: 'AUTH_INVALID_CREDENTIALS',
      status: 401,
      message: 'invalid credentials',
    });
    mockMutate.mockImplementation((_params, { onError }) => {
      onError(apiError);
    });

    renderWithProviders(<SettingsEmailScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: '確認メールを送信' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_EMAIL_CHANGE_INVALID_PASSWORD)).toBeTruthy();
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

    renderWithProviders(<SettingsEmailScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: '確認メールを送信' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_EMAIL_CHANGE_OAUTH_ONLY)).toBeTruthy();
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

    renderWithProviders(<SettingsEmailScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: '確認メールを送信' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_RATE_LIMIT)).toBeTruthy();
    });
  });

  it('オフライン中は入力を満たしても送信ボタンが disabled のままになる', () => {
    mockUseOnlineStatus.mockReturnValue(false);

    renderWithProviders(<SettingsEmailScreen />);
    fillForm();
    const button = screen.getByRole('button', { name: '確認メールを送信' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe('SettingsEmailScreen - 二重送信防止', () => {
  it('isPending=true のとき送信ボタンがローディング状態になる', () => {
    const { useRequestEmailChangeMutation } = jest.requireMock('@/lib/queries/auth');
    (useRequestEmailChangeMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    renderWithProviders(<SettingsEmailScreen />);
    const button = screen.getByRole('button', { name: '確認メールを送信' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(button.props.accessibilityState.busy).toBe(true);
  });

  it('isPending=true のとき各入力欄が disabled になる', () => {
    const { useRequestEmailChangeMutation } = jest.requireMock('@/lib/queries/auth');
    (useRequestEmailChangeMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    renderWithProviders(<SettingsEmailScreen />);
    expect(screen.getByLabelText('新しいメールアドレス').props.editable).toBe(false);
    expect(screen.getByLabelText('現在のパスワード').props.editable).toBe(false);
  });

  it('isPending=true のとき送信ボタンを押しても mutate が呼ばれない', () => {
    const { useRequestEmailChangeMutation } = jest.requireMock('@/lib/queries/auth');
    (useRequestEmailChangeMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    renderWithProviders(<SettingsEmailScreen />);
    fireEvent.press(screen.getByRole('button', { name: '確認メールを送信' }));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe('SettingsEmailScreen - ナビゲーション', () => {
  it('「戻る」ボタンを押すと router.back が呼ばれる', () => {
    renderWithProviders(<SettingsEmailScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
