/**
 * app/(auth)/register の画面テスト。
 * パスワード不一致・同意未チェック・フィールド検証を確認する。
 * useRegisterMutation（TanStack useMutation）を使うため QueryClientProvider が必要。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import RegisterScreen from '@/app/(auth)/register/index';
import { routes } from '@/lib/constants/routes';
import {
  ERR_EMAIL_REQUIRED,
  ERR_PASSWORD_REQUIRED,
  ERR_PASSWORD_CONFIRM_REQUIRED,
  ERR_PASSWORD_MISMATCH,
  ERR_TERMS_AGREEMENT_REQUIRED,
} from '@/lib/constants/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// useRegisterMutation のネットワーク呼び出しをモック
jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useRegisterMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

describe('RegisterScreen', () => {
  it('新規登録タイトルが表示される', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByRole('header', { name: '新規登録' })).toBeTruthy();
  });

  it('ニックネームフィールドが表示される', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByLabelText('ニックネーム')).toBeTruthy();
  });

  it('メールアドレスフィールドが表示される', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy();
  });

  it('パスワードフィールドが表示される', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
  });

  it('パスワード（確認）フィールドが表示される', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByLabelText('パスワード（確認）')).toBeTruthy();
  });

  it('利用規約同意チェックボックスが表示される', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('新規登録ボタンが表示される', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByRole('button', { name: '新規登録' })).toBeTruthy();
  });

  it('Google で登録ボタンが disabled 状態', () => {
    renderWithProviders(<RegisterScreen />);
    const googleButton = screen.getByRole('button', { name: 'Google で登録' });
    expect(googleButton.props.accessibilityState.disabled).toBe(true);
  });

  it('ログインへのリンクが表示される', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByRole('link', { name: 'ログイン' })).toBeTruthy();
  });

  it('ログインリンクが正しいルートを指している', () => {
    renderWithProviders(<RegisterScreen />);
    const link = screen.getByRole('link', { name: 'ログイン' });
    expect(link.props.testID).toBe(`link-${routes.login}`);
  });

  describe('送信ボタンの有効化条件', () => {
    it('全フィールド未入力のとき送信ボタンが disabled', () => {
      renderWithProviders(<RegisterScreen />);
      const button = screen.getByRole('button', { name: '新規登録' });
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('全フィールドを入力すると送信ボタンが有効になる', () => {
      renderWithProviders(<RegisterScreen />);
      fireEvent.changeText(screen.getByLabelText('ニックネーム'), 'テストユーザー');
      fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
      fireEvent.changeText(screen.getByLabelText('パスワード'), 'Password123');
      fireEvent.changeText(screen.getByLabelText('パスワード（確認）'), 'Password123');
      const button = screen.getByRole('button', { name: '新規登録' });
      expect(button.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('利用規約未同意の送信', () => {
    it('同意チェックなしで送信するとエラーメッセージが表示される', () => {
      renderWithProviders(<RegisterScreen />);
      fireEvent.changeText(screen.getByLabelText('ニックネーム'), 'テストユーザー');
      fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
      fireEvent.changeText(screen.getByLabelText('パスワード'), 'Password123');
      fireEvent.changeText(screen.getByLabelText('パスワード（確認）'), 'Password123');
      fireEvent.press(screen.getByRole('button', { name: '新規登録' }));
      expect(screen.getByText(ERR_TERMS_AGREEMENT_REQUIRED)).toBeTruthy();
    });
  });

  describe('パスワード不一致', () => {
    it('パスワードと確認が異なる場合、blur でエラーが表示される', () => {
      renderWithProviders(<RegisterScreen />);
      fireEvent.changeText(screen.getByLabelText('パスワード'), 'Password123');
      fireEvent.changeText(screen.getByLabelText('パスワード（確認）'), 'Different456');
      fireEvent(screen.getByLabelText('パスワード（確認）'), 'blur');
      expect(screen.getByText(ERR_PASSWORD_MISMATCH)).toBeTruthy();
    });

    it('パスワードと確認が一致する場合、blur でエラーが表示されない', () => {
      renderWithProviders(<RegisterScreen />);
      fireEvent.changeText(screen.getByLabelText('パスワード'), 'Password123');
      fireEvent.changeText(screen.getByLabelText('パスワード（確認）'), 'Password123');
      fireEvent(screen.getByLabelText('パスワード（確認）'), 'blur');
      expect(screen.queryByText(ERR_PASSWORD_MISMATCH)).toBeNull();
    });
  });

  describe('blur 時の個別フィールド検証', () => {
    it('メールアドレスが空のまま blur するとエラーが表示される', () => {
      renderWithProviders(<RegisterScreen />);
      fireEvent(screen.getByLabelText('メールアドレス'), 'blur');
      expect(screen.getByText(ERR_EMAIL_REQUIRED)).toBeTruthy();
    });

    it('パスワードが空のまま blur するとエラーが表示される', () => {
      renderWithProviders(<RegisterScreen />);
      fireEvent(screen.getByLabelText('パスワード'), 'blur');
      expect(screen.getByText(ERR_PASSWORD_REQUIRED)).toBeTruthy();
    });

    it('確認パスワードが空のまま blur するとエラーが表示される', () => {
      renderWithProviders(<RegisterScreen />);
      fireEvent(screen.getByLabelText('パスワード（確認）'), 'blur');
      expect(screen.getByText(ERR_PASSWORD_CONFIRM_REQUIRED)).toBeTruthy();
    });
  });

  describe('利用規約同意チェックボックス', () => {
    it('チェックボックスを押すと checked 状態が切り替わる', () => {
      renderWithProviders(<RegisterScreen />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.props.accessibilityState.checked).toBe(false);
      fireEvent.press(checkbox);
      expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(true);
    });
  });
});
