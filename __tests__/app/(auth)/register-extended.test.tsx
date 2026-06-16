/**
 * @module __tests__/app/(auth)/register-extended
 * RegisterScreen の接続テスト（mutation 成功→遷移 / 409/400/429 エラー文言 / 二重送信防止）。
 * register.test.tsx の既存テストと重複しないよう新規ケースのみを扱う。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '@/app/(auth)/register/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_EMAIL_ALREADY_REGISTERED,
  ERR_REGISTER_RATE_LIMITED,
  ERR_INVALID_INPUT,
  ERR_REGISTER_FAILED,
  ERR_NETWORK,
} from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;

// useRegisterMutation は各テストで上書き可能なように jest.fn() で管理する
const mockMutate = jest.fn();

// useGoogleAuth のモック（expo-auth-session の実コードが iosClientId 必須でエラーになるのを防ぐ）
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  useGoogleAuth: jest.fn(() => ({
    signIn: jest.fn(),
    isLoading: false,
    isAvailable: false,
    error: null,
  })),
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useRegisterMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

// 全フィールドを埋めてチェックボックスを true にするヘルパー
function fillAndCheck() {
  fireEvent.changeText(screen.getByLabelText('ニックネーム'), 'テストユーザー');
  fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
  fireEvent.changeText(screen.getByLabelText('パスワード'), 'Password123');
  fireEvent.changeText(screen.getByLabelText('パスワード（確認）'), 'Password123');
  fireEvent.press(screen.getByRole('checkbox'));
}

describe('RegisterScreen - 接続テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mutation 成功 → verify-email-sent 遷移', () => {
    it('登録成功後に verify-email-sent 画面へ遷移する', async () => {
      mockMutate.mockImplementation((_params, { onSuccess }) => {
        onSuccess({ success: true });
      });

      renderWithProviders(<RegisterScreen />);
      fillAndCheck();
      fireEvent.press(screen.getByRole('button', { name: '新規登録' }));

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(routes.verifyEmailSent);
      });
    });
  });

  describe('エラー文言表示', () => {
    it('409 CONFLICT（メール重複）のとき ERR_EMAIL_ALREADY_REGISTERED が表示される', async () => {
      const conflictError = new ApiError({
        code: 'CONFLICT',
        status: 409,
        message: 'Email already registered',
      });
      mockMutate.mockImplementation((_params, { onError }) => {
        onError(conflictError);
      });

      renderWithProviders(<RegisterScreen />);
      fillAndCheck();
      fireEvent.press(screen.getByRole('button', { name: '新規登録' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_EMAIL_ALREADY_REGISTERED)).toBeTruthy();
      });
    });

    it('400 VALIDATION_ERROR のとき ERR_INVALID_INPUT が表示される', async () => {
      const validationError = new ApiError({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Validation failed',
      });
      mockMutate.mockImplementation((_params, { onError }) => {
        onError(validationError);
      });

      renderWithProviders(<RegisterScreen />);
      fillAndCheck();
      fireEvent.press(screen.getByRole('button', { name: '新規登録' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_INVALID_INPUT)).toBeTruthy();
      });
    });

    it('429 RATE_LIMITED のとき ERR_REGISTER_RATE_LIMITED が表示される', async () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'Too many requests',
      });
      mockMutate.mockImplementation((_params, { onError }) => {
        onError(rateLimitError);
      });

      renderWithProviders(<RegisterScreen />);
      fillAndCheck();
      fireEvent.press(screen.getByRole('button', { name: '新規登録' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_REGISTER_RATE_LIMITED)).toBeTruthy();
      });
    });

    it('ApiError でない一般エラーのとき ERR_NETWORK が表示される', async () => {
      mockMutate.mockImplementation((_params, { onError }) => {
        onError(new Error('Network error'));
      });

      renderWithProviders(<RegisterScreen />);
      fillAndCheck();
      fireEvent.press(screen.getByRole('button', { name: '新規登録' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_NETWORK)).toBeTruthy();
      });
    });

    it('不明な ApiError コードのとき ERR_REGISTER_FAILED が表示される', async () => {
      const unknownError = new ApiError({
        code: 'INTERNAL_ERROR',
        status: 500,
        message: 'Internal server error',
      });
      mockMutate.mockImplementation((_params, { onError }) => {
        onError(unknownError);
      });

      renderWithProviders(<RegisterScreen />);
      fillAndCheck();
      fireEvent.press(screen.getByRole('button', { name: '新規登録' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_REGISTER_FAILED)).toBeTruthy();
      });
    });
  });

  describe('二重送信防止', () => {
    it('isPending=true のとき送信ボタンがローディング状態になる', () => {
      const { useRegisterMutation } = jest.requireMock('@/lib/queries/auth');
      (useRegisterMutation as jest.Mock).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      renderWithProviders(<RegisterScreen />);
      // isPending=true のとき各フィールドが disabled になる
      expect(screen.getByLabelText('ニックネーム').props.editable).toBe(false);
    });

    it('フォーム未入力の状態では送信ボタンが disabled のため mutate が呼ばれない', () => {
      renderWithProviders(<RegisterScreen />);
      // 全フィールド未入力のまま送信ボタン（disabled）をプレス
      const button = screen.getByRole('button', { name: '新規登録' });
      expect(button.props.accessibilityState.disabled).toBe(true);
      fireEvent.press(button);
      // disabled ボタンのため mutate は呼ばれない
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});
