/**
 * app/settings/index.tsx のログアウトフローテスト。
 * Alert 確認 → useLogoutMutation 呼び出しを確認する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import SettingsScreen from '@/app/settings/index';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockLogoutMutate = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  useLogoutMutation: () => ({
    mutate: mockLogoutMutate,
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// ログアウトフロー
// ---------------------------------------------------------------------------

describe('SettingsScreen ログアウト', () => {
  it('ログアウトボタンが表示される', () => {
    render(<SettingsScreen />);
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy();
  });

  it('ログアウトボタンを押すと Alert が表示される', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'ログアウト' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'ログアウト',
      'ログアウトしますか？',
      expect.arrayContaining([
        expect.objectContaining({ text: 'キャンセル' }),
        expect.objectContaining({ text: 'ログアウト', style: 'destructive' }),
      ])
    );
  });

  it('Alert でキャンセルを押すと useLogoutMutation は呼ばれない', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const cancelButton = buttons?.find((b) => b.text === 'キャンセル');
      cancelButton?.onPress?.();
    });

    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'ログアウト' }));

    expect(mockLogoutMutate).not.toHaveBeenCalled();
  });

  it('Alert でログアウトを確定すると useLogoutMutation が呼ばれる', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const logoutButton = buttons?.find((b) => b.text === 'ログアウト');
      logoutButton?.onPress?.();
    });

    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'ログアウト' }));

    expect(mockLogoutMutate).toHaveBeenCalledTimes(1);
  });
});
