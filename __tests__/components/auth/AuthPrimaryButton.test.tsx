/**
 * components/auth/AuthPrimaryButton のユニットテスト。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';

describe('AuthPrimaryButton', () => {
  it('label が表示される', () => {
    render(<AuthPrimaryButton label="ログイン" onPress={jest.fn()} />);
    expect(screen.getByText('ログイン')).toBeTruthy();
  });

  it('ボタンとして role が設定される', () => {
    render(<AuthPrimaryButton label="ログイン" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeTruthy();
  });

  it('押すと onPress が呼ばれる', () => {
    const onPress = jest.fn();
    render(<AuthPrimaryButton label="ログイン" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'ログイン' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled=true のとき onPress が呼ばれない', () => {
    const onPress = jest.fn();
    render(<AuthPrimaryButton label="ログイン" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('disabled のとき accessibilityState.disabled が true', () => {
    render(<AuthPrimaryButton label="ログイン" onPress={jest.fn()} disabled />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('isLoading=true のときスピナーが表示される', () => {
    render(<AuthPrimaryButton label="ログイン" onPress={jest.fn()} isLoading />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.busy).toBe(true);
    // label テキストは非表示になる
    expect(screen.queryByText('ログイン')).toBeNull();
  });

  it('isLoading=true のとき onPress が呼ばれない', () => {
    const onPress = jest.fn();
    render(<AuthPrimaryButton label="ログイン" onPress={onPress} isLoading />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('accessibilityLabel が指定されたとき label より優先される', () => {
    render(
      <AuthPrimaryButton
        label="ログイン"
        onPress={jest.fn()}
        accessibilityLabel="ログインボタン"
      />
    );
    expect(screen.getByRole('button', { name: 'ログインボタン' })).toBeTruthy();
  });

  it('isLoading=false かつ disabled=false のとき accessibilityState が両方 false', () => {
    render(<AuthPrimaryButton label="ログイン" onPress={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(false);
    expect(button.props.accessibilityState.busy).toBe(false);
  });
});
