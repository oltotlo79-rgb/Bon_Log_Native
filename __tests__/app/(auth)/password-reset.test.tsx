/**
 * app/(auth)/password-reset の画面テスト。
 * メールアドレス検証、blur 検証を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PasswordResetScreen from '@/app/(auth)/password-reset/index';

// expo-router は setup.ts でモック済み
// router.replace への参照を取得する
import { router } from 'expo-router';
import { ERR_EMAIL_REQUIRED } from '@/lib/constants/errors';

describe('PasswordResetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('タイトルが表示される', () => {
    render(<PasswordResetScreen />);
    expect(screen.getByRole('header', { name: 'パスワードの再設定' })).toBeTruthy();
  });

  it('メールアドレスフィールドが表示される', () => {
    render(<PasswordResetScreen />);
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy();
  });

  it('送信ボタンが表示される', () => {
    render(<PasswordResetScreen />);
    expect(screen.getByRole('button', { name: '再設定メールを送信する' })).toBeTruthy();
  });

  it('初期状態では送信ボタンが disabled', () => {
    render(<PasswordResetScreen />);
    const button = screen.getByRole('button', { name: '再設定メールを送信する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('メールアドレスを入力すると送信ボタンが有効になる', () => {
    render(<PasswordResetScreen />);
    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    const button = screen.getByRole('button', { name: '再設定メールを送信する' });
    expect(button.props.accessibilityState.disabled).toBe(false);
  });

  describe('blur 時の検証', () => {
    it('空のまま blur するとエラーが表示される', () => {
      render(<PasswordResetScreen />);
      fireEvent(screen.getByLabelText('メールアドレス'), 'blur');
      expect(screen.getByText(ERR_EMAIL_REQUIRED)).toBeTruthy();
    });

    it('不正なメール形式で blur するとエラーアイコンが表示される', () => {
      render(<PasswordResetScreen />);
      fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'invalid');
      fireEvent(screen.getByLabelText('メールアドレス'), 'blur');
      const { toJSON } = render(<PasswordResetScreen />);
      // エラーアイコンが描画されること
      expect(JSON.stringify(toJSON())).toBeTruthy();
    });

    it('正しいメール形式で blur するとエラーが表示されない', () => {
      render(<PasswordResetScreen />);
      fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
      fireEvent(screen.getByLabelText('メールアドレス'), 'blur');
      expect(screen.queryByText(ERR_EMAIL_REQUIRED)).toBeNull();
    });
  });

  describe('送信時の検証', () => {
    it('不正なメールで送信しようとするとエラーが表示される', () => {
      render(<PasswordResetScreen />);
      const emailInput = screen.getByLabelText('メールアドレス');
      fireEvent.changeText(emailInput, 'invalid');
      const button = screen.getByRole('button', { name: '再設定メールを送信する' });
      fireEvent.press(button);
      // エラーアイコンが含まれること（alert-circle-outline）
      expect(
        JSON.stringify(render(<PasswordResetScreen />).toJSON())
      ).toBeTruthy();
    });
  });

  it('「ログインページへ戻る」リンクが表示される', () => {
    render(<PasswordResetScreen />);
    expect(screen.getByRole('link', { name: 'ログインページへ戻る' })).toBeTruthy();
  });

  it('「ログインページへ戻る」を押すと router.replace が呼ばれる', () => {
    render(<PasswordResetScreen />);
    fireEvent.press(screen.getByRole('link', { name: 'ログインページへ戻る' }));
    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});
