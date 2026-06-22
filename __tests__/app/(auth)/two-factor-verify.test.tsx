/**
 * app/(auth)/two-factor-verify の画面テスト。
 * TOTP ⇔ バックアップコードモード切替、送信可否、エラー別表示を確認する。
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// jest.mock ファクトリ内では ES import が使えないため require を使用する（Jest 制約）。

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import TwoFactorVerifyScreen from '@/app/(auth)/two-factor-verify/index';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  ERR_2FA_INVALID_CODE,
  ERR_2FA_TICKET_EXPIRED,
  ERR_2FA_RATE_LIMITED,
  ERR_2FA_NO_TICKET,
  ERR_2FA_SERVER_ERROR,
  ERR_NETWORK,
} from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockVerifyTwoFactor = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  useVerifyTwoFactorMutation: () => ({
    mutate: mockVerifyTwoFactor,
    isPending: false,
  }),
}));

// expo-router は setup.ts で一元モック済み。
// router.replace を個別に追跡するため setup.ts のモックを上書きする。
const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => [] as string[]),
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
    })),
    router: {
      push: jest.fn(),
      back: jest.fn(),
      replace: (...args: unknown[]) => mockRouterReplace(...args),
      navigate: jest.fn(),
    },
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, { testID: 'redirect' }, `Redirect:${href}`),
    Link: ({
      href,
      children,
    }: {
      href: string;
      children: React.ReactNode;
    }) =>
      React.createElement(
        TouchableOpacity,
        { testID: `link-${href}`, accessibilityRole: 'link' },
        children
      ),
    Stack: Object.assign(
      ({ children }: { children: React.ReactNode }) =>
        React.createElement(View, { testID: 'stack' }, children),
      {
        Screen: ({ name }: { name: string }) =>
          React.createElement(React.Fragment, { key: name }),
      }
    ),
    Tabs: Object.assign(
      ({ children }: { children: React.ReactNode }) =>
        React.createElement(View, { testID: 'tabs' }, children),
      {
        Screen: ({ name }: { name: string }) =>
          React.createElement(React.Fragment, { key: name }),
      }
    ),
  };
});

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeApiError(code: MobileApiErrorCode, status = 400): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyTwoFactor.mockImplementation((_vars, _callbacks) => {
    // デフォルトは何もしない（テストごとに明示的に呼び出す）
  });
});

// ---------------------------------------------------------------------------
// 基本表示
// ---------------------------------------------------------------------------

describe('TwoFactorVerifyScreen 基本表示', () => {
  it('タイトル「2 段階認証」が表示される', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    expect(screen.getByRole('header', { name: '2 段階認証' })).toBeTruthy();
  });

  it('確認するボタンが表示される', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    expect(screen.getByRole('button', { name: '確認する' })).toBeTruthy();
  });

  it('ログイン画面に戻るリンクが表示される', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    expect(screen.getByRole('button', { name: 'ログイン画面に戻る' })).toBeTruthy();
  });

  it('初期状態は TOTP モード（認証コード入力フィールドが表示される）', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    expect(screen.getByLabelText('認証コード入力フィールド')).toBeTruthy();
  });

  it('初期状態では「バックアップコードを使用する」が表示される', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    expect(screen.getByRole('button', { name: 'バックアップコードを使用する' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TOTP ⇔ バックアップコードモード切替
// ---------------------------------------------------------------------------

describe('モード切替', () => {
  it('「バックアップコードを使用する」を押すとバックアップコードモードになる', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    const switchButton = screen.getByRole('button', { name: 'バックアップコードを使用する' });
    fireEvent.press(switchButton);
    expect(screen.getByLabelText('バックアップコード入力フィールド')).toBeTruthy();
  });

  it('バックアップコードモードに切り替えると「認証アプリのコードを使用する」が表示される', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'バックアップコードを使用する' }));
    expect(screen.getByRole('button', { name: '認証アプリのコードを使用する' })).toBeTruthy();
  });

  it('バックアップコードモードから TOTP モードに戻れる', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'バックアップコードを使用する' }));
    fireEvent.press(screen.getByRole('button', { name: '認証アプリのコードを使用する' }));
    expect(screen.getByLabelText('認証コード入力フィールド')).toBeTruthy();
  });

  it('モード切替時にコード入力がリセットされる', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');

    // バックアップモードへ切替
    fireEvent.press(screen.getByRole('button', { name: 'バックアップコードを使用する' }));

    // バックアップフィールドの value が空になっている
    const backupInput = screen.getByLabelText('バックアップコード入力フィールド');
    expect(backupInput.props.value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 送信不可条件
// ---------------------------------------------------------------------------

describe('送信不可条件', () => {
  it('コード未入力では確認するボタンが disabled', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    const button = screen.getByRole('button', { name: '確認する' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('コードを 1 文字以上入力すると確認するボタンが有効になる', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '1');
    const button = screen.getByRole('button', { name: '確認する' });
    expect(button.props.accessibilityState?.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 送信成功: feed へ遷移する
// ---------------------------------------------------------------------------

describe('送信成功', () => {
  it('成功時に router.replace(routes.feed) が呼ばれる', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => {
      expect(capturedCallbacks.onSuccess).toBeDefined();
    });
    await act(async () => {
      capturedCallbacks.onSuccess?.();
    });

    expect(mockRouterReplace).toHaveBeenCalledWith(routes.feed);
  });
});

// ---------------------------------------------------------------------------
// エラー別表示: ticket-consumed 系
// ---------------------------------------------------------------------------

describe('AUTH_2FA_INVALID_CODE エラー', () => {
  it('ERR_2FA_INVALID_CODE のメッセージが表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '000000');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('AUTH_2FA_INVALID_CODE')); });

    await waitFor(() => { expect(screen.getByText(ERR_2FA_INVALID_CODE)).toBeTruthy(); });
  });

  it('「ログイン画面へ戻る」強調ボタンが表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '000000');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('AUTH_2FA_INVALID_CODE')); });

    await waitFor(() => { expect(screen.getByRole('button', { name: 'ログイン画面へ戻る' })).toBeTruthy(); });
  });

  it('ticket-consumed 後は確認するボタンが disabled になる（フォーム無効化）', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '000000');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('AUTH_2FA_INVALID_CODE')); });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: '確認する' });
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('ticket-consumed 後はモード切替リンクが非表示になる（自動遷移しない）', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '000000');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('AUTH_2FA_INVALID_CODE')); });

    // 自動遷移しない（router.replace が呼ばれていない）
    expect(mockRouterReplace).not.toHaveBeenCalledWith(routes.login);
    // モード切替ボタンが非表示
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'バックアップコードを使用する' })).toBeNull();
    });
  });
});

describe('AUTH_2FA_TICKET_EXPIRED エラー', () => {
  it('ERR_2FA_TICKET_EXPIRED のメッセージが表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('AUTH_2FA_TICKET_EXPIRED')); });

    await waitFor(() => { expect(screen.getByText(ERR_2FA_TICKET_EXPIRED)).toBeTruthy(); });
  });

  it('「ログイン画面へ戻る」強調ボタンが表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('AUTH_2FA_TICKET_EXPIRED')); });

    await waitFor(() => { expect(screen.getByRole('button', { name: 'ログイン画面へ戻る' })).toBeTruthy(); });
  });
});

describe('429 (RATE_LIMITED) エラー', () => {
  it('ERR_2FA_RATE_LIMITED のメッセージが表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('RATE_LIMITED', 429)); });

    await waitFor(() => { expect(screen.getByText(ERR_2FA_RATE_LIMITED)).toBeTruthy(); });
  });

  it('フォームが無効化される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('RATE_LIMITED', 429)); });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: '確認する' });
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// エラー別表示: retryable 系（ネットワーク / 5xx）
// ---------------------------------------------------------------------------

describe('ネットワークエラー / 5xx エラー（retryable）', () => {
  it('5xx サーバーエラーでは ERR_2FA_SERVER_ERROR が表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('INTERNAL_ERROR', 500)); });

    await waitFor(() => { expect(screen.getByText(ERR_2FA_SERVER_ERROR)).toBeTruthy(); });
  });

  it('5xx エラー後はフォームが有効のまま（再試行可能）', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('INTERNAL_ERROR', 500)); });

    // 「ログイン画面へ戻る」強調ボタンが表示されない
    expect(screen.queryByRole('button', { name: 'ログイン画面へ戻る' })).toBeNull();
    // モード切替ボタンは引き続き表示される
    expect(screen.getByRole('button', { name: 'バックアップコードを使用する' })).toBeTruthy();
  });

  it('ネットワークエラーでは ERR_NETWORK が表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(new Error('Network error')); });

    await waitFor(() => { expect(screen.getByText(ERR_NETWORK)).toBeTruthy(); });
  });

  it('ネットワークエラー後はフォームが有効のまま（再試行可能）', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(new Error('Network error')); });

    // フォームが有効なまま
    expect(screen.queryByRole('button', { name: 'ログイン画面へ戻る' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// チケット未保持での直接到達
// ---------------------------------------------------------------------------

describe('チケット未保持での直接到達', () => {
  it('チケット不在エラーでは ERR_2FA_NO_TICKET が表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(new Error('2FA ticket is not available')); });

    await waitFor(() => { expect(screen.getByText(ERR_2FA_NO_TICKET)).toBeTruthy(); });
  });

  it('チケット不在後はフォームが無効化される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(new Error('2FA ticket is not available')); });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: '確認する' });
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('チケット不在後は「ログイン画面へ戻る」強調ボタンが表示される', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(new Error('2FA ticket is not available')); });

    await waitFor(() => { expect(screen.getByRole('button', { name: 'ログイン画面へ戻る' })).toBeTruthy(); });
  });
});

// ---------------------------------------------------------------------------
// ログイン画面へ戻る（自動遷移しない確認）
// ---------------------------------------------------------------------------

describe('「ログイン画面へ戻る」ボタン', () => {
  it('通常時は強調ボタンが表示されない', () => {
    renderWithProviders(<TwoFactorVerifyScreen />);
    expect(screen.queryByRole('button', { name: 'ログイン画面へ戻る' })).toBeNull();
  });

  it('強調ボタンを押すと router.replace(routes.login) が呼ばれる', async () => {
    let capturedCallbacks: { onSuccess?: () => void; onError?: (err: Error) => void } = {};
    mockVerifyTwoFactor.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<TwoFactorVerifyScreen />);
    const input = screen.getByLabelText('認証コード入力フィールド');
    fireEvent.changeText(input, '123456');
    fireEvent.press(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() => { expect(capturedCallbacks.onError).toBeDefined(); });
    await act(async () => { capturedCallbacks.onError?.(makeApiError('AUTH_2FA_INVALID_CODE')); });

    await waitFor(() => {
      fireEvent.press(screen.getByRole('button', { name: 'ログイン画面へ戻る' }));
    });
    expect(mockRouterReplace).toHaveBeenCalledWith(routes.login);
  });
});
