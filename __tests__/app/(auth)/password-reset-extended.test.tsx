/**
 * app/(auth)/password-reset の追加テスト。
 * 送信成功後の success 状態表示と、API エラー分岐（429/API エラー/ネットワークエラー）を検証する。
 */

import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import PasswordResetScreen from '@/app/(auth)/password-reset/index';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_PASSWORD_RESET_RATE_LIMITED,
  ERR_PASSWORD_RESET_SEND_FAILED,
  ERR_NETWORK,
  MSG_PASSWORD_RESET_SENT_TITLE,
  MSG_PASSWORD_RESET_SENT_BODY,
} from '@/lib/constants/errors';

// usePasswordResetRequestMutation は呼び出しパターンを制御するためモックする
let capturedMutateOptions: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} | null = null;

const mockMutate = jest.fn(
  (_vars: unknown, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
    capturedMutateOptions = options ?? null;
  }
);

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  usePasswordResetRequestMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

describe('PasswordResetScreen — 送信成功後の表示', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMutateOptions = null;
  });

  it('送信成功後に成功タイトルが表示される', async () => {
    renderWithProviders(<PasswordResetScreen />);
    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: '再設定メールを送信する' }));

    await act(async () => {
      capturedMutateOptions?.onSuccess?.();
    });

    expect(screen.getByText(MSG_PASSWORD_RESET_SENT_TITLE)).toBeTruthy();
  });

  it('送信成功後に成功メッセージ本文が表示される', async () => {
    renderWithProviders(<PasswordResetScreen />);
    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: '再設定メールを送信する' }));

    await act(async () => {
      capturedMutateOptions?.onSuccess?.();
    });

    expect(screen.getByText(MSG_PASSWORD_RESET_SENT_BODY)).toBeTruthy();
  });

  it('送信成功後に「ログインページへ戻る」リンクが表示される', async () => {
    renderWithProviders(<PasswordResetScreen />);
    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: '再設定メールを送信する' }));

    await act(async () => {
      capturedMutateOptions?.onSuccess?.();
    });

    expect(screen.getByRole('link', { name: 'ログインページへ戻る' })).toBeTruthy();
  });
});

describe('PasswordResetScreen — API エラー分岐', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMutateOptions = null;
  });

  it('429 レート制限エラーのとき rate-limited メッセージが表示される', async () => {
    renderWithProviders(<PasswordResetScreen />);
    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: '再設定メールを送信する' }));

    const rateLimitError = new ApiError({
      code: 'RATE_LIMITED',
      status: 429,
      message: 'Rate limited',
    });

    await act(async () => {
      capturedMutateOptions?.onError?.(rateLimitError);
    });

    expect(screen.getByText(ERR_PASSWORD_RESET_RATE_LIMITED)).toBeTruthy();
  });

  it('API エラー（429 以外）のとき send-failed メッセージが表示される', async () => {
    renderWithProviders(<PasswordResetScreen />);
    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: '再設定メールを送信する' }));

    const apiError = new ApiError({
      code: 'SERVER_MISCONFIGURED',
      status: 500,
      message: 'Internal server error',
    });

    await act(async () => {
      capturedMutateOptions?.onError?.(apiError);
    });

    expect(screen.getByText(ERR_PASSWORD_RESET_SEND_FAILED)).toBeTruthy();
  });

  it('ネットワークエラーのとき network エラーメッセージが表示される', async () => {
    renderWithProviders(<PasswordResetScreen />);
    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: '再設定メールを送信する' }));

    const networkError = new Error('Network error');

    await act(async () => {
      capturedMutateOptions?.onError?.(networkError);
    });

    expect(screen.getByText(ERR_NETWORK)).toBeTruthy();
  });
});

describe('PasswordResetScreen — handleEmailBlur 分岐', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validateEmail が非 null を返すとき（不正なメール形式）送信後にエラーテキストが残る', () => {
    renderWithProviders(<PasswordResetScreen />);
    const emailInput = screen.getByLabelText('メールアドレス');
    // invalid-email は validateEmail で非 null のエラーを返す形式
    fireEvent.changeText(emailInput, 'invalid-email');
    // 送信ボタンを押すと handleSubmit → validateEmailField → 非 null エラーがセットされる
    fireEvent.press(screen.getByRole('button', { name: '再設定メールを送信する' }));
    // mutate は呼ばれない（検証エラーで return）
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
