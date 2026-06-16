/**
 * components/auth/GoogleSignInButton のユニットテスト。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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

  describe('onPress', () => {
    it('onPress が渡されているとき、タップで呼ばれる', () => {
      const onPressMock = jest.fn();
      render(<GoogleSignInButton label="Google でログイン" onPress={onPressMock} />);
      const button = screen.getByRole('button', { name: 'Google でログイン' });
      fireEvent.press(button);
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('onPress が未指定のとき、タップしてもエラーが発生しない', () => {
      render(<GoogleSignInButton label="Google でログイン" />);
      const button = screen.getByRole('button', { name: 'Google でログイン' });
      expect(() => fireEvent.press(button)).not.toThrow();
    });
  });

  describe('loading=true', () => {
    it('loading=true のとき Google ロゴアイコンが表示されない', () => {
      const { toJSON } = render(<GoogleSignInButton label="Google でログイン" loading />);
      expect(JSON.stringify(toJSON())).not.toContain('logo-google');
    });

    it('loading=true のとき accessibilityState.busy が true', () => {
      render(<GoogleSignInButton label="Google でログイン" loading />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('loading=true のとき accessibilityState.disabled が true（ローディング中は押下不可）', () => {
      render(<GoogleSignInButton label="Google でログイン" loading />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('loading=true のとき onPress が呼ばれない（ボタンが disabled 扱い）', () => {
      const onPressMock = jest.fn();
      render(<GoogleSignInButton label="Google でログイン" loading onPress={onPressMock} />);
      const button = screen.getByRole('button', { name: 'Google でログイン' });
      fireEvent.press(button);
      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('loading=false のとき Google ロゴアイコンが表示される', () => {
      const { toJSON } = render(<GoogleSignInButton label="Google でログイン" loading={false} />);
      expect(JSON.stringify(toJSON())).toContain('logo-google');
    });

    it('loading=false のとき accessibilityState.busy が false', () => {
      render(<GoogleSignInButton label="Google でログイン" loading={false} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState.busy).toBe(false);
    });
  });

  describe('disabled=true', () => {
    it('disabled=true のとき onPress が呼ばれない', () => {
      const onPressMock = jest.fn();
      render(<GoogleSignInButton label="Google でログイン" disabled onPress={onPressMock} />);
      const button = screen.getByRole('button', { name: 'Google でログイン' });
      fireEvent.press(button);
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('ブランド文言', () => {
    it('任意のラベルテキストを表示できる（登録用文言）', () => {
      render(<GoogleSignInButton label="Google で登録" />);
      expect(screen.getByText('Google で登録')).toBeTruthy();
    });
  });
});
