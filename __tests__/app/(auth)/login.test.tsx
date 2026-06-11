/**
 * app/(auth)/login の画面テスト。
 * 新規登録・パスワードリセットへのリンクが存在することを確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login/index';
import { routes } from '@/lib/constants/routes';

describe('LoginScreen', () => {
  it('ログインボタンが表示されている', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeTruthy();
  });

  it('Google でログインボタンが表示されている', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('button', { name: 'Google でログイン' })).toBeTruthy();
  });

  it('新規登録へのリンクが表示されている', () => {
    render(<LoginScreen />);
    const link = screen.getByRole('link', { name: 'アカウントをお持ちでない方はこちら' });
    expect(link).toBeTruthy();
  });

  it('パスワードリセットへのリンクが表示されている', () => {
    render(<LoginScreen />);
    const link = screen.getByRole('link', { name: 'パスワードをお忘れの方' });
    expect(link).toBeTruthy();
  });

  it('メールアドレス入力フィールドが表示されている', () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText('メールアドレス入力')).toBeTruthy();
  });

  it('パスワード入力フィールドが表示されている', () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText('パスワード入力')).toBeTruthy();
  });

  it('新規登録リンクが正しいルートを指している', () => {
    render(<LoginScreen />);
    const link = screen.getByRole('link', { name: 'アカウントをお持ちでない方はこちら' });
    expect(link.props.testID).toBe(`link-${routes.register}`);
  });

  it('パスワードリセットリンクが正しいルートを指している', () => {
    render(<LoginScreen />);
    const link = screen.getByRole('link', { name: 'パスワードをお忘れの方' });
    expect(link.props.testID).toBe(`link-${routes.passwordReset}`);
  });
});
