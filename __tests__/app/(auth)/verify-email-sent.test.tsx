/**
 * app/(auth)/register/verify-email-sent の画面テスト。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import VerifyEmailSentScreen from '@/app/(auth)/register/verify-email-sent/index';

// expo-router は setup.ts でモック済み
import { router } from 'expo-router';

describe('VerifyEmailSentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('タイトルが表示される', () => {
    render(<VerifyEmailSentScreen />);
    expect(screen.getByRole('header', { name: 'メールをご確認ください' })).toBeTruthy();
  });

  it('説明テキストが表示される', () => {
    render(<VerifyEmailSentScreen />);
    expect(
      screen.getByText(
        'ご登録のメールアドレスに確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。'
      )
    ).toBeTruthy();
  });

  it('ヒントテキストが表示される', () => {
    render(<VerifyEmailSentScreen />);
    expect(
      screen.getByText('メールが届かない場合は、迷惑メールフォルダもご確認ください。')
    ).toBeTruthy();
  });

  it('「ログイン画面へ戻る」ボタンが表示される', () => {
    render(<VerifyEmailSentScreen />);
    expect(screen.getByRole('button', { name: 'ログイン画面へ戻る' })).toBeTruthy();
  });

  it('メールアイコンが JSON に含まれる', () => {
    const { toJSON } = render(<VerifyEmailSentScreen />);
    expect(JSON.stringify(toJSON())).toContain('mail-outline');
  });

  it('「ログイン画面へ戻る」を押すと router.replace が呼ばれる', () => {
    render(<VerifyEmailSentScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'ログイン画面へ戻る' }));
    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});
