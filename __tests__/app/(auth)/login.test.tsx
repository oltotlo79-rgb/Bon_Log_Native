/**
 * app/(auth)/login の画面テスト。
 * 主要な要素（ボタン・フィールド・リンク）が存在することを確認する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import LoginScreen from '@/app/(auth)/login/index';
import { routes } from '@/lib/constants/routes';

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

describe('LoginScreen', () => {
  it('ログインボタンが表示されている', () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeTruthy();
  });

  it('Google でログインボタンが表示されている', () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.getByRole('button', { name: 'Google でログイン' })).toBeTruthy();
  });

  it('新規登録へのリンクが表示されている', () => {
    renderWithProviders(<LoginScreen />);
    const link = screen.getByRole('link', { name: '新規登録' });
    expect(link).toBeTruthy();
  });

  it('パスワードリセットへのリンクが表示されている', () => {
    renderWithProviders(<LoginScreen />);
    const link = screen.getByRole('link', { name: 'パスワードをお忘れですか？' });
    expect(link).toBeTruthy();
  });

  it('メールアドレス入力フィールドが表示されている', () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy();
  });

  it('パスワード入力フィールドが表示されている', () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
  });

  it('新規登録リンクが正しいルートを指している', () => {
    renderWithProviders(<LoginScreen />);
    const link = screen.getByRole('link', { name: '新規登録' });
    expect(link.props.testID).toBe(`link-${routes.register}`);
  });

  it('パスワードリセットリンクが正しいルートを指している', () => {
    renderWithProviders(<LoginScreen />);
    const link = screen.getByRole('link', { name: 'パスワードをお忘れですか？' });
    expect(link.props.testID).toBe(`link-${routes.passwordReset}`);
  });
});
