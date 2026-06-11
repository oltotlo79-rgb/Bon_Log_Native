/**
 * components/auth/GoogleSignInButton のユニットテスト。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('ラベルが表示される', () => {
    render(<GoogleSignInButton label="Google でログイン" />);
    expect(screen.getByText('Google でログイン')).toBeTruthy();
  });

  it('ボタンとして role が設定される', () => {
    render(<GoogleSignInButton label="Google でログイン" />);
    expect(screen.getByRole('button', { name: 'Google でログイン' })).toBeTruthy();
  });

  it('disabled=true のとき accessibilityState.disabled が true', () => {
    render(<GoogleSignInButton label="Google でログイン" disabled />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('disabled=false のとき accessibilityState.disabled が false', () => {
    render(<GoogleSignInButton label="Google でログイン" disabled={false} />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(false);
  });

  it('デフォルトでは disabled が false', () => {
    render(<GoogleSignInButton label="Google でログイン" />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(false);
  });

  it('Google ロゴアイコンが描画される（JSON で確認）', () => {
    const { toJSON } = render(<GoogleSignInButton label="Google でログイン" />);
    expect(JSON.stringify(toJSON())).toContain('logo-google');
  });
});
