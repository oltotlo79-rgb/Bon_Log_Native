/**
 * @module __tests__/components/settings/TwoFactorDisableSection
 * TwoFactorDisableSection の無効化フロー（パスワード入力 → 確認ダイアログ → disable）を検証する。
 * モック境界: lib/queries/auth の useDisableTwoFactorMutation。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { TwoFactorDisableSection } from '@/components/settings/TwoFactorDisableSection';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  ERR_2FA_DISABLE_INCORRECT_PASSWORD,
  ERR_2FA_NOT_ENABLED,
  ERR_GENERIC,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockDisableMutate = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  useDisableTwoFactorMutation: jest.fn(() => ({
    mutate: mockDisableMutate,
    isPending: false,
  })),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeApiError(code: MobileApiErrorCode, status = 400): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

/** Alert.alert をモックし、押下時に「無効化する」ボタンの onPress を実行するヘルパー */
function mockAlertConfirm() {
  const alertCalls: Parameters<typeof Alert.alert>[] = [];
  jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
    alertCalls.push(args as Parameters<typeof Alert.alert>);
  });
  return {
    confirm: () => {
      const buttons = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const confirmBtn = buttons?.find((b) => b.text === '無効化する');
      act(() => {
        confirmBtn?.onPress?.();
      });
    },
    cancel: () => {
      const buttons = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const cancelBtn = buttons?.find((b) => b.text === 'キャンセル');
      act(() => {
        cancelBtn?.onPress?.();
      });
    },
    wasShown: () => alertCalls.length > 0,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 初期表示
// ---------------------------------------------------------------------------

describe('TwoFactorDisableSection 初期表示', () => {
  it('パスワード入力フィールドと無効化ボタンが表示される', () => {
    renderWithProviders(<TwoFactorDisableSection isOnline />);
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2段階認証を無効化する' })).toBeTruthy();
  });

  it('パスワード未入力では無効化ボタンが disabled になる', () => {
    renderWithProviders(<TwoFactorDisableSection isOnline />);
    const button = screen.getByRole('button', { name: '2段階認証を無効化する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 無効化フロー: パスワード入力 → 確認ダイアログ → disable 呼び出し
// ---------------------------------------------------------------------------

describe('TwoFactorDisableSection 無効化フロー', () => {
  it('パスワード入力後にボタンを押すと確認ダイアログが表示される', () => {
    const alert = mockAlertConfirm();
    renderWithProviders(<TwoFactorDisableSection isOnline />);

    fireEvent.changeText(screen.getByLabelText('パスワード'), 'CurrentPass1');
    fireEvent.press(screen.getByRole('button', { name: '2段階認証を無効化する' }));

    expect(alert.wasShown()).toBe(true);
  });

  it('確認ダイアログで「無効化する」を選ぶと password 付きで disable が呼ばれる', () => {
    const alert = mockAlertConfirm();
    renderWithProviders(<TwoFactorDisableSection isOnline />);

    fireEvent.changeText(screen.getByLabelText('パスワード'), 'CurrentPass1');
    fireEvent.press(screen.getByRole('button', { name: '2段階認証を無効化する' }));
    alert.confirm();

    expect(mockDisableMutate).toHaveBeenCalledWith(
      { password: 'CurrentPass1' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('確認ダイアログで「キャンセル」を選ぶと disable が呼ばれない', () => {
    const alert = mockAlertConfirm();
    renderWithProviders(<TwoFactorDisableSection isOnline />);

    fireEvent.changeText(screen.getByLabelText('パスワード'), 'CurrentPass1');
    fireEvent.press(screen.getByRole('button', { name: '2段階認証を無効化する' }));
    alert.cancel();

    expect(mockDisableMutate).not.toHaveBeenCalled();
  });

  it('disable 成功で完了メッセージが表示される', () => {
    mockDisableMutate.mockImplementation((_params, { onSuccess }) => onSuccess());
    const alert = mockAlertConfirm();
    renderWithProviders(<TwoFactorDisableSection isOnline />);

    fireEvent.changeText(screen.getByLabelText('パスワード'), 'CurrentPass1');
    fireEvent.press(screen.getByRole('button', { name: '2段階認証を無効化する' }));
    alert.confirm();

    expect(screen.getByText('2段階認証を無効にしました')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラーコード別の文言
// ---------------------------------------------------------------------------

describe('TwoFactorDisableSection エラー文言', () => {
  it('AUTH_INVALID_CREDENTIALS で ERR_2FA_DISABLE_INCORRECT_PASSWORD が表示される', () => {
    mockDisableMutate.mockImplementation((_params, { onError }) =>
      onError(makeApiError('AUTH_INVALID_CREDENTIALS', 401))
    );
    const alert = mockAlertConfirm();
    renderWithProviders(<TwoFactorDisableSection isOnline />);

    fireEvent.changeText(screen.getByLabelText('パスワード'), 'wrong-password');
    fireEvent.press(screen.getByRole('button', { name: '2段階認証を無効化する' }));
    alert.confirm();

    expect(screen.getByText(ERR_2FA_DISABLE_INCORRECT_PASSWORD)).toBeTruthy();
  });

  it('CONFLICT で ERR_2FA_NOT_ENABLED が表示される', () => {
    mockDisableMutate.mockImplementation((_params, { onError }) =>
      onError(makeApiError('CONFLICT', 409))
    );
    const alert = mockAlertConfirm();
    renderWithProviders(<TwoFactorDisableSection isOnline />);

    fireEvent.changeText(screen.getByLabelText('パスワード'), 'CurrentPass1');
    fireEvent.press(screen.getByRole('button', { name: '2段階認証を無効化する' }));
    alert.confirm();

    expect(screen.getByText(ERR_2FA_NOT_ENABLED)).toBeTruthy();
  });

  it('未知のエラー（非 ApiError）で ERR_GENERIC が表示される', () => {
    mockDisableMutate.mockImplementation((_params, { onError }) => onError(new Error('boom')));
    const alert = mockAlertConfirm();
    renderWithProviders(<TwoFactorDisableSection isOnline />);

    fireEvent.changeText(screen.getByLabelText('パスワード'), 'CurrentPass1');
    fireEvent.press(screen.getByRole('button', { name: '2段階認証を無効化する' }));
    alert.confirm();

    expect(screen.getByText(ERR_GENERIC)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('TwoFactorDisableSection オフライン', () => {
  it('オフラインで無効化ボタンを押すと Alert を出さず disable も呼ばれない', () => {
    const alert = mockAlertConfirm();
    renderWithProviders(<TwoFactorDisableSection isOnline={false} />);

    fireEvent.changeText(screen.getByLabelText('パスワード'), 'CurrentPass1');
    fireEvent.press(screen.getByRole('button', { name: '2段階認証を無効化する' }));

    expect(alert.wasShown()).toBe(false);
    expect(mockDisableMutate).not.toHaveBeenCalled();
  });
});
