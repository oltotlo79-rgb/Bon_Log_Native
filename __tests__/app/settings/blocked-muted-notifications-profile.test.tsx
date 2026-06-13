/**
 * app/settings/blocked, muted, notifications, profile の画面テスト。
 * 各画面の基本表示要素（ヘッダー・戻るボタン・コンテンツ）を検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SettingsBlockedScreen from '@/app/settings/blocked/index';
import SettingsMutedScreen from '@/app/settings/muted/index';
import SettingsNotificationsScreen from '@/app/settings/notifications/index';
import SettingsProfileScreen from '@/app/settings/profile/index';

const mockRouterBack = jest.requireMock('expo-router').router.back;

describe('SettingsBlockedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「ブロックリスト」と表示される', () => {
    render(<SettingsBlockedScreen />);
    expect(screen.getByRole('header', { name: 'ブロックリスト' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    render(<SettingsBlockedScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    render(<SettingsBlockedScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('空状態のメッセージが表示される', () => {
    render(<SettingsBlockedScreen />);
    expect(screen.getByText('ブロック中のユーザーはいません。')).toBeTruthy();
  });
});

describe('SettingsMutedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「ミュートリスト」と表示される', () => {
    render(<SettingsMutedScreen />);
    expect(screen.getByRole('header', { name: 'ミュートリスト' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    render(<SettingsMutedScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    render(<SettingsMutedScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('空状態のメッセージが表示される', () => {
    render(<SettingsMutedScreen />);
    expect(screen.getByText('ミュート中のユーザーはいません。')).toBeTruthy();
  });
});

describe('SettingsNotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「通知設定」と表示される', () => {
    render(<SettingsNotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知設定' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    render(<SettingsNotificationsScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    render(<SettingsNotificationsScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('プレースホルダーテキストが表示される', () => {
    render(<SettingsNotificationsScreen />);
    expect(screen.getByText('通知設定（実装予定）')).toBeTruthy();
  });

  it('説明文が表示される', () => {
    render(<SettingsNotificationsScreen />);
    expect(
      screen.getByText('いいね・コメント・フォローなどの通知を設定できます。')
    ).toBeTruthy();
  });
});

describe('SettingsProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「プロフィール設定」と表示される', () => {
    render(<SettingsProfileScreen />);
    expect(screen.getByRole('header', { name: 'プロフィール設定' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    render(<SettingsProfileScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンを押すと router.back が呼ばれる', () => {
    render(<SettingsProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('プレースホルダーテキストが表示される', () => {
    render(<SettingsProfileScreen />);
    expect(screen.getByText('プロフィール編集（実装予定）')).toBeTruthy();
  });

  it('説明文が表示される', () => {
    render(<SettingsProfileScreen />);
    expect(
      screen.getByText('ニックネーム・アバター・自己紹介を編集できます。')
    ).toBeTruthy();
  });
});
