/**
 * components/auth/AuthTermsAgreement のユニットテスト。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { AuthTermsAgreement } from '@/components/auth/AuthTermsAgreement';
import { TERMS_URL, PRIVACY_URL } from '@/lib/constants/external-links';

jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

describe('AuthTermsAgreement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('チェックボックスが描画される', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} />);
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('unchecked 状態で accessibilityState.checked が false', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(false);
  });

  it('checked 状態で accessibilityState.checked が true', () => {
    render(<AuthTermsAgreement checked onToggle={jest.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(true);
  });

  it('チェックボックスを押すと onToggle が呼ばれる', () => {
    const onToggle = jest.fn();
    render(<AuthTermsAgreement checked={false} onToggle={onToggle} />);
    fireEvent.press(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('disabled=true のとき onToggle が呼ばれない', () => {
    const onToggle = jest.fn();
    render(<AuthTermsAgreement checked={false} onToggle={onToggle} disabled />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.press(checkbox);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('disabled のとき accessibilityState.disabled が true', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.accessibilityState.disabled).toBe(true);
  });

  it('利用規約リンクが表示される', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} />);
    expect(screen.getByRole('link', { name: '利用規約を開く' })).toBeTruthy();
  });

  it('プライバシーポリシーリンクが表示される', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} />);
    expect(screen.getByRole('link', { name: 'プライバシーポリシーを開く' })).toBeTruthy();
  });

  it('利用規約リンクを押すと TERMS_URL で Linking.openURL が呼ばれる', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} />);
    fireEvent.press(screen.getByRole('link', { name: '利用規約を開く' }));
    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_URL);
  });

  it('プライバシーポリシーリンクを押すと PRIVACY_URL で Linking.openURL が呼ばれる', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} />);
    fireEvent.press(screen.getByRole('link', { name: 'プライバシーポリシーを開く' }));
    expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_URL);
  });

  it('disabled のとき利用規約リンクを押しても Linking.openURL が呼ばれない', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} disabled />);
    fireEvent.press(screen.getByRole('link', { name: '利用規約を開く' }));
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('disabled のときプライバシーポリシーリンクを押しても Linking.openURL が呼ばれない', () => {
    render(<AuthTermsAgreement checked={false} onToggle={jest.fn()} disabled />);
    fireEvent.press(screen.getByRole('link', { name: 'プライバシーポリシーを開く' }));
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
