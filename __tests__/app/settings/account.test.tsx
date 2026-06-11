/**
 * app/settings/account の画面テスト。
 * Google Play 審査要件: アプリ内からのアカウント削除導線が必須（store-compliance.md）。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SettingsAccountScreen from '@/app/settings/account/index';

describe('SettingsAccountScreen', () => {
  it('ヘッダーに「アカウント設定」と表示される', () => {
    render(<SettingsAccountScreen />);
    expect(screen.getByRole('header', { name: 'アカウント設定' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    render(<SettingsAccountScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('メールアドレス変更ボタンが表示される', () => {
    render(<SettingsAccountScreen />);
    expect(screen.getByRole('button', { name: 'メールアドレスを変更する' })).toBeTruthy();
  });

  it('パスワード変更ボタンが表示される', () => {
    render(<SettingsAccountScreen />);
    expect(screen.getByRole('button', { name: 'パスワードを変更する' })).toBeTruthy();
  });

  it('【審査要件】アカウント削除ボタンが表示されている（Google Play 要件）', () => {
    render(<SettingsAccountScreen />);
    const deleteButton = screen.getByRole('button', {
      name: 'アカウントを削除する（取り消し不可）',
    });
    expect(deleteButton).toBeTruthy();
  });

  it('アカウント削除ボタンのテキストが確認できる', () => {
    render(<SettingsAccountScreen />);
    expect(screen.getByText('アカウントを削除する')).toBeTruthy();
  });

  it('危険ゾーンの警告文が表示される', () => {
    render(<SettingsAccountScreen />);
    expect(
      screen.getByText('以下の操作は取り消すことができません。慎重に行ってください。')
    ).toBeTruthy();
  });
});
