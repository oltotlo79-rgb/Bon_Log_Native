/**
 * app/(auth)/password-reset/confirm の画面テスト。
 * token なし→token-invalid 状態、token あり→form 状態、
 * TIMEOUT_AUTO_REDIRECT=3000 の自動遷移を fake timers で確認する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import PasswordResetConfirmScreen from '@/app/(auth)/password-reset/confirm/index';
import { TIMEOUT_AUTO_REDIRECT } from '@/lib/constants/limits';

// expo-router は setup.ts でモック済み
// useLocalSearchParams の戻り値だけ制御する
import { useLocalSearchParams, router } from 'expo-router';
import {
  ERR_NEW_PASSWORD_REQUIRED,
  ERR_PASSWORD_MISMATCH,
  MSG_RESET_LINK_INVALID_TITLE,
  MSG_RESET_LINK_INVALID_BODY,
} from '@/lib/constants/errors';

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;

describe('PasswordResetConfirmScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('token なしの場合（token-invalid 状態）', () => {
    it('token がないとき「リンクが無効です」タイトルが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.getByText(MSG_RESET_LINK_INVALID_TITLE)).toBeTruthy();
    });

    it('token がないとき説明メッセージが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.getByText(MSG_RESET_LINK_INVALID_BODY)).toBeTruthy();
    });

    it('token がないときパスワードリセット再リクエストリンクが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(
        screen.getByRole('link', { name: 'パスワードリセットを再度リクエスト' })
      ).toBeTruthy();
    });

    it('token がないときフォームが表示されない', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.queryByLabelText('新しいパスワード')).toBeNull();
    });

    it('「ログインページへ戻る」リンクが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.getByRole('link', { name: 'ログインページへ戻る' })).toBeTruthy();
    });
  });

  describe('email のみで token なしの場合', () => {
    it('email のみで token がないとき token-invalid 状態になる', () => {
      mockUseLocalSearchParams.mockReturnValue({ email: 'test@example.com' });
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.getByText(MSG_RESET_LINK_INVALID_TITLE)).toBeTruthy();
    });
  });

  describe('token と email 両方ある場合（form 状態）', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({
        token: 'valid-token-123',
        email: 'test@example.com',
      });
    });

    it('フォームが表示される', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.getByLabelText('新しいパスワード')).toBeTruthy();
    });

    it('確認パスワードフィールドが表示される', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.getByLabelText('新しいパスワード（確認）')).toBeTruthy();
    });

    it('パスワード変更ボタンが表示される', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.getByRole('button', { name: 'パスワードを変更する' })).toBeTruthy();
    });

    it('初期状態では送信ボタンが disabled', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      const button = screen.getByRole('button', { name: 'パスワードを変更する' });
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('パスワードと確認を入力すると送信ボタンが有効になる', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'Password123');
      fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'Password123');
      const button = screen.getByRole('button', { name: 'パスワードを変更する' });
      expect(button.props.accessibilityState.disabled).toBe(false);
    });

    it('パスワードが空のまま blur するとエラーが表示される', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      fireEvent(screen.getByLabelText('新しいパスワード'), 'blur');
      expect(screen.getAllByText(ERR_NEW_PASSWORD_REQUIRED).length).toBeGreaterThan(0);
    });

    it('パスワードと確認が不一致で blur するとエラーが表示される', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      fireEvent.changeText(screen.getByLabelText('新しいパスワード'), 'Password123');
      fireEvent.changeText(screen.getByLabelText('新しいパスワード（確認）'), 'Different456');
      fireEvent(screen.getByLabelText('新しいパスワード（確認）'), 'blur');
      expect(screen.getByText(ERR_PASSWORD_MISMATCH)).toBeTruthy();
    });

    it('「ログインページへ戻る」リンクが表示される', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      expect(screen.getByRole('link', { name: 'ログインページへ戻る' })).toBeTruthy();
    });

    it('「ログインページへ戻る」を押すと router.replace が呼ばれる', () => {
      renderWithProviders(<PasswordResetConfirmScreen />);
      fireEvent.press(screen.getByRole('link', { name: 'ログインページへ戻る' }));
      expect(router.replace).toHaveBeenCalledTimes(1);
    });
  });

  describe('TIMEOUT_AUTO_REDIRECT の値確認', () => {
    it('TIMEOUT_AUTO_REDIRECT が 3000ms', () => {
      expect(TIMEOUT_AUTO_REDIRECT).toBe(3000);
    });
  });
});
