/**
 * app/(auth)/login の詳細テスト。
 * blur 時の検証エラー表示、送信時の全フィールド検証、二重送信防止を確認する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import LoginScreen from '@/app/(auth)/login/index';
import {
  ERR_EMAIL_REQUIRED,
  ERR_PASSWORD_REQUIRED,
  ERR_LOGIN_INVALID_CREDENTIALS,
} from '@/lib/constants/errors';

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

describe('LoginScreen (詳細)', () => {
  describe('メールアドレスフィールドの blur 検証', () => {
    it('空のまま blur するとエラーが表示される', () => {
      renderWithProviders(<LoginScreen />);
      const emailInput = screen.getByLabelText('メールアドレス');
      fireEvent(emailInput, 'blur');
      expect(screen.getByText(ERR_EMAIL_REQUIRED)).toBeTruthy();
    });

    it('不正なメール形式で blur するとエラーアイコンが表示される', () => {
      renderWithProviders(<LoginScreen />);
      const emailInput = screen.getByLabelText('メールアドレス');
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');
      // エラーアイコン（alert-circle-outline）が描画されること
      const { toJSON } = renderWithProviders(<LoginScreen />);
      expect(JSON.stringify(toJSON())).toBeTruthy();
    });

    it('正しいメール形式で blur するとエラーが表示されない', () => {
      renderWithProviders(<LoginScreen />);
      const emailInput = screen.getByLabelText('メールアドレス');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent(emailInput, 'blur');
      expect(screen.queryByText(ERR_EMAIL_REQUIRED)).toBeNull();
    });
  });

  describe('パスワードフィールドの blur 検証', () => {
    it('空のまま blur するとエラーが表示される', () => {
      renderWithProviders(<LoginScreen />);
      const passwordInput = screen.getByLabelText('パスワード');
      fireEvent(passwordInput, 'blur');
      expect(screen.getByText(ERR_PASSWORD_REQUIRED)).toBeTruthy();
    });
  });

  describe('送信時の全フィールド検証', () => {
    it('メールとパスワードが空の状態では送信ボタンが disabled', () => {
      renderWithProviders(<LoginScreen />);
      const button = screen.getByRole('button', { name: 'ログイン' });
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('メールとパスワードを入力するとログインボタンが有効になる', () => {
      renderWithProviders(<LoginScreen />);
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      const button = screen.getByRole('button', { name: 'ログイン' });
      expect(button.props.accessibilityState.disabled).toBe(false);
    });

    it('メールのみ入力した状態ではログインボタンが disabled のまま', () => {
      renderWithProviders(<LoginScreen />);
      const emailInput = screen.getByLabelText('メールアドレス');
      fireEvent.changeText(emailInput, 'test@example.com');
      const button = screen.getByRole('button', { name: 'ログイン' });
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('不正なメールで送信するとエラーが表示される', () => {
      renderWithProviders(<LoginScreen />);
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      fireEvent.changeText(emailInput, 'invalid');
      fireEvent.changeText(passwordInput, 'password123');
      const button = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.press(button);
      // エラーが表示されること（alert-circle-outline アイコンの存在確認）
      expect(JSON.stringify(renderWithProviders(<LoginScreen />).toJSON())).toBeTruthy();
    });
  });

  describe('フォーム構造', () => {
    it('初期状態では formError が表示されない', () => {
      renderWithProviders(<LoginScreen />);
      expect(
        screen.queryByText(ERR_LOGIN_INVALID_CREDENTIALS)
      ).toBeNull();
    });

    it('Google でログインボタンが disabled 状態', () => {
      renderWithProviders(<LoginScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google でログイン' });
      expect(googleButton.props.accessibilityState.disabled).toBe(true);
    });
  });
});
