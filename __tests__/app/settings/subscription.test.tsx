/**
 * app/settings/subscription の画面テスト。
 * Google Play 審査要件: 購入の復元ボタンが必須（store-compliance.md）。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SettingsSubscriptionScreen from '@/app/settings/subscription/index';

describe('SettingsSubscriptionScreen', () => {
  it('ヘッダーに「プレミアムプラン」と表示される', () => {
    render(<SettingsSubscriptionScreen />);
    expect(screen.getByRole('header', { name: 'プレミアムプラン' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    render(<SettingsSubscriptionScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('プレミアムプラン購入ボタンが表示される', () => {
    render(<SettingsSubscriptionScreen />);
    expect(
      screen.getByRole('button', { name: 'プレミアムプランを購入する' })
    ).toBeTruthy();
  });

  it('【審査要件】購入の復元ボタンが表示されている（Google Play 要件）', () => {
    render(<SettingsSubscriptionScreen />);
    const restoreButton = screen.getByRole('button', { name: '購入を復元する' });
    expect(restoreButton).toBeTruthy();
  });

  it('「購入を復元する」テキストが表示される', () => {
    render(<SettingsSubscriptionScreen />);
    expect(screen.getByText('購入を復元する')).toBeTruthy();
  });

  it('Google Play 定期購入管理ボタンが表示される', () => {
    render(<SettingsSubscriptionScreen />);
    expect(
      screen.getByRole('button', { name: 'Google Play の定期購入を管理する' })
    ).toBeTruthy();
  });

  it('現在のプランが表示される', () => {
    render(<SettingsSubscriptionScreen />);
    expect(screen.getByText('現在のプラン')).toBeTruthy();
  });

  it('プレミアムの特典が表示される', () => {
    render(<SettingsSubscriptionScreen />);
    expect(screen.getByText('プレミアムの特典')).toBeTruthy();
  });
});
