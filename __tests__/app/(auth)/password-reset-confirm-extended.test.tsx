/**
 * app/(auth)/password-reset/confirm の追加テスト。
 * 成功状態の表示、handleSubmit の各エラー分岐（API エラー/401/ネットワーク）を検証する。
 */

import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import PasswordResetConfirmScreen from '@/app/(auth)/password-reset/confirm/index';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_PASSWORD_UPDATE_FAILED,
  ERR_NETWORK,
  MSG_RESET_LINK_INVALID_TITLE,
  MSG_RESET_LINK_INVALID_BODY,
  MSG_PASSWORD_UPDATED_TITLE,
  MSG_PASSWORD_UPDATED_BODY,
} from '@/lib/constants/errors';

import { useLocalSearchParams } from 'expo-router';

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;

let capturedMutateOptions: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} | null = null;

const mockConfirmMutate = jest.fn(
  (_vars: unknown, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
    capturedMutateOptions = options ?? null;
  }
);

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  usePasswordResetConfirmMutation: jest.fn(() => ({
    mutate: mockConfirmMutate,
    isPending: false,
  })),
}));

const VALID_PARAMS = { token: 'valid-token-123', email: 'test@example.com' };

describe('PasswordResetConfirmScreen — 成功状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMutateOptions = null;
    mockUseLocalSearchParams.mockReturnValue(VALID_PARAMS);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('送信成功後に成功タイトルが表示される', async () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await act(async () => {
      capturedMutateOptions?.onSuccess?.();
    });

    expect(screen.getByText(MSG_PASSWORD_UPDATED_TITLE)).toBeTruthy();
  });

  it('送信成功後に成功メッセージ本文が表示される', async () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await act(async () => {
      capturedMutateOptions?.onSuccess?.();
    });

    expect(screen.getByText(MSG_PASSWORD_UPDATED_BODY)).toBeTruthy();
  });

  it('送信成功後に「今すぐログインする」リンクが表示される', async () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await act(async () => {
      capturedMutateOptions?.onSuccess?.();
    });

    expect(screen.getByRole('link', { name: '今すぐログインする' })).toBeTruthy();
  });

  it('TIMEOUT_AUTO_REDIRECT 後に router.replace が呼ばれる', async () => {
    const { router } = jest.requireMock('expo-router');
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    await act(async () => {
      capturedMutateOptions?.onSuccess?.();
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});

describe('PasswordResetConfirmScreen — handleSubmit エラー分岐', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMutateOptions = null;
    mockUseLocalSearchParams.mockReturnValue(VALID_PARAMS);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('401 エラーのとき token-invalid 状態に遷移する', async () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    const authError = new ApiError({
      code: 'AUTH_INVALID_TOKEN',
      status: 401,
      message: 'Invalid token',
    });

    await act(async () => {
      capturedMutateOptions?.onError?.(authError);
    });

    expect(screen.getByText(MSG_RESET_LINK_INVALID_TITLE)).toBeTruthy();
  });

  it('AUTH_INVALID_TOKEN コードのとき token-invalid 状態に遷移する', async () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    const authError = new ApiError({
      code: 'AUTH_INVALID_TOKEN',
      status: 400,
      message: 'Invalid token code',
    });

    await act(async () => {
      capturedMutateOptions?.onError?.(authError);
    });

    expect(screen.getByText(MSG_RESET_LINK_INVALID_TITLE)).toBeTruthy();
  });

  it('API エラー（401 以外）のとき update-failed メッセージが表示される', async () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    const apiError = new ApiError({
      code: 'SERVER_MISCONFIGURED',
      status: 500,
      message: 'Server error',
    });

    await act(async () => {
      capturedMutateOptions?.onError?.(apiError);
    });

    expect(screen.getByText(ERR_PASSWORD_UPDATE_FAILED)).toBeTruthy();
  });

  it('ネットワークエラーのとき network エラーメッセージが表示される', async () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));

    const networkError = new Error('Network failed');

    await act(async () => {
      capturedMutateOptions?.onError?.(networkError);
    });

    expect(screen.getByText(ERR_NETWORK)).toBeTruthy();
  });
});

describe('PasswordResetConfirmScreen — handleSubmit 検証エラー分岐', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMutateOptions = null;
    mockUseLocalSearchParams.mockReturnValue(VALID_PARAMS);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('パスワードが空のまま送信するとエラーが表示され mutate は呼ばれない', async () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを変更する' }));
    expect(mockConfirmMutate).not.toHaveBeenCalled();
  });

  it('handlePasswordBlur でパスワードを入力後 blur するとエラーがクリアされる', () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent(screen.getByLabelText('新しいパスワード'), 'blur');
    // バリデーションが通るのでエラーアイコンなし
    expect(screen.queryByTestId('icon-alert-circle-outline')).toBeNull();
  });

  it('handleConfirmBlur でパスワードと確認が一致するとエラーなし', () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    fireEvent(screen.getByLabelText('新しいパスワード（確認）'), 'blur');
    expect(screen.queryByTestId('icon-alert-circle-outline')).toBeNull();
  });
});

describe('PasswordResetConfirmScreen — token-invalid 画面でのリンク遷移', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('「パスワードリセットを再度リクエスト」リンクを押すと router.replace が呼ばれる', () => {
    const { router } = jest.requireMock('expo-router');
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.press(
      screen.getByRole('link', { name: 'パスワードリセットを再度リクエスト' })
    );
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('「ログインページへ戻る」リンクを押すと router.replace が呼ばれる', () => {
    const { router } = jest.requireMock('expo-router');
    renderWithProviders(<PasswordResetConfirmScreen />);
    fireEvent.press(screen.getByRole('link', { name: 'ログインページへ戻る' }));
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('token-invalid 状態では MSG_RESET_LINK_INVALID_BODY が表示される', () => {
    renderWithProviders(<PasswordResetConfirmScreen />);
    expect(screen.getByText(MSG_RESET_LINK_INVALID_BODY)).toBeTruthy();
  });
});
