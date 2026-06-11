/**
 * components/auth/PasswordField のユニットテスト。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PasswordField } from '@/components/auth/PasswordField';

describe('PasswordField', () => {
  it('ラベルが表示される', () => {
    render(<PasswordField label="パスワード" />);
    expect(screen.getByText('パスワード')).toBeTruthy();
  });

  it('初期状態では secureTextEntry が true（非表示）', () => {
    render(<PasswordField label="パスワード" />);
    const input = screen.getByLabelText('パスワード');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('表示切替ボタンが描画されている', () => {
    render(<PasswordField label="パスワード" />);
    expect(screen.getByRole('button', { name: 'パスワードを表示' })).toBeTruthy();
  });

  it('表示切替ボタンを押すと secureTextEntry が false になる', () => {
    render(<PasswordField label="パスワード" />);
    const toggle = screen.getByRole('button', { name: 'パスワードを表示' });
    fireEvent.press(toggle);
    const input = screen.getByLabelText('パスワード');
    expect(input.props.secureTextEntry).toBe(false);
  });

  it('もう一度押すと secureTextEntry が true に戻る', () => {
    render(<PasswordField label="パスワード" />);
    const toggle = screen.getByRole('button', { name: 'パスワードを表示' });
    fireEvent.press(toggle);
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを隠す' }));
    const input = screen.getByLabelText('パスワード');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('表示中は accessibilityLabel が「パスワードを隠す」に変わる', () => {
    render(<PasswordField label="パスワード" />);
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを表示' }));
    expect(screen.getByRole('button', { name: 'パスワードを隠す' })).toBeTruthy();
  });

  it('アイコンが非表示→ eye-off-outline（JSON で確認）', () => {
    const { toJSON } = render(<PasswordField label="パスワード" />);
    expect(JSON.stringify(toJSON())).toContain('eye-off-outline');
  });

  it('表示切替後は eye-outline アイコンになる（JSON で確認）', () => {
    const { toJSON } = render(<PasswordField label="パスワード" />);
    fireEvent.press(screen.getByRole('button', { name: 'パスワードを表示' }));
    expect(JSON.stringify(toJSON())).toContain('eye-outline');
  });

  it('error props が渡されるとエラーテキストが表示される', () => {
    render(<PasswordField label="パスワード" error="エラーです" />);
    expect(screen.getByText('エラーです')).toBeTruthy();
  });

  it('error がある場合 accessibilityRole="alert" のコンテナが描画される', () => {
    const { toJSON } = render(<PasswordField label="パスワード" error="エラーです" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"accessibilityRole":"alert"');
  });

  it('disabled=true のとき入力が無効になる', () => {
    render(<PasswordField label="パスワード" disabled />);
    const input = screen.getByLabelText('パスワード');
    expect(input.props.editable).toBe(false);
  });
});
