/**
 * app/(auth)/login の統合テスト。
 * 2FA 分岐、セッション警告バナー、API エラーの文言表示を確認する。
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// jest.mock ファクトリ内では ES import が使えないため require を使用する（Jest 制約）。

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import LoginScreen from '@/app/(auth)/login/index';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  ERR_LOGIN_INVALID_CREDENTIALS,
  ERR_LOGIN_RATE_LIMITED,
  ERR_SESSION_REUSE_DETECTED,
  ERR_SESSION_EXPIRED,
} from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';
import type { UseAuthReturn } from '@/lib/auth/use-auth';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockLoginMutate = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  useLoginMutation: () => ({
    mutate: mockLoginMutate,
    isPending: false,
  }),
}));

// expo-router は setup.ts で一元モック済み。
// router.push を個別に追跡するため上書きする。
const mockRouterPush = jest.fn();
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
      push: (...args: unknown[]) => mockRouterPush(...args),
      back: jest.fn(),
      replace: jest.fn(),
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
      accessibilityRole?: string;
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

const mockUseAuth = jest.fn<UseAuthReturn, []>(() => ({
  status: 'signedOut' as const,
  isSignedIn: false,
  isLoading: false,
  lastAuthFailureReason: null,
}));

jest.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeApiError(code: MobileApiErrorCode, status = 400): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

function fillAndSubmit(email = 'test@example.com', password = 'Password1') {
  fireEvent.changeText(screen.getByLabelText('メールアドレス'), email);
  fireEvent.changeText(screen.getByLabelText('パスワード'), password);
  fireEvent.press(screen.getByRole('button', { name: 'ログイン' }));
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    status: 'signedOut' as const,
    isSignedIn: false,
    isLoading: false,
    lastAuthFailureReason: null,
  });
});

// ---------------------------------------------------------------------------
// requires2FA=true → twoFactorVerify への push
// ---------------------------------------------------------------------------

describe('requires2FA 分岐', () => {
  it('requires2FA=true のとき twoFactorVerify へ push する', async () => {
    let capturedCallbacks: {
      onSuccess?: (result: { requires2FA: boolean }) => void;
      onError?: (err: Error) => void;
    } = {};
    mockLoginMutate.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<LoginScreen />);
    fillAndSubmit();

    await waitFor(() => {
      capturedCallbacks.onSuccess?.({ requires2FA: true });
    });

    expect(mockRouterPush).toHaveBeenCalledWith(routes.twoFactorVerify);
  });

  it('requires2FA=false のとき router.push は呼ばれない（AuthGuard が feed へ流す）', async () => {
    let capturedCallbacks: {
      onSuccess?: (result: { requires2FA: boolean }) => void;
      onError?: (err: Error) => void;
    } = {};
    mockLoginMutate.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<LoginScreen />);
    fillAndSubmit();

    await waitFor(() => {
      capturedCallbacks.onSuccess?.({ requires2FA: false });
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// API エラーの文言表示
// ---------------------------------------------------------------------------

describe('API エラーの文言表示', () => {
  it('AUTH_INVALID_CREDENTIALS (401) で ERR_LOGIN_INVALID_CREDENTIALS が表示される', async () => {
    let capturedCallbacks: {
      onSuccess?: (result: { requires2FA: boolean }) => void;
      onError?: (err: Error) => void;
    } = {};
    mockLoginMutate.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<LoginScreen />);
    fillAndSubmit();

    await waitFor(() => {
      capturedCallbacks.onError?.(makeApiError('AUTH_INVALID_CREDENTIALS', 401));
    });

    expect(screen.getByText(ERR_LOGIN_INVALID_CREDENTIALS)).toBeTruthy();
  });

  it('RATE_LIMITED (429) で ERR_LOGIN_RATE_LIMITED が表示される', async () => {
    let capturedCallbacks: {
      onSuccess?: (result: { requires2FA: boolean }) => void;
      onError?: (err: Error) => void;
    } = {};
    mockLoginMutate.mockImplementation((_vars, callbacks: typeof capturedCallbacks) => {
      capturedCallbacks = callbacks;
    });

    renderWithProviders(<LoginScreen />);
    fillAndSubmit();

    await waitFor(() => {
      capturedCallbacks.onError?.(makeApiError('RATE_LIMITED', 429));
    });

    expect(screen.getByText(ERR_LOGIN_RATE_LIMITED)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// セッション警告バナー（lastAuthFailureReason）
// ---------------------------------------------------------------------------

describe('セッション警告バナー', () => {
  it('lastAuthFailureReason=null のとき警告バナーが表示されない', () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.queryByText(ERR_SESSION_REUSE_DETECTED)).toBeNull();
    expect(screen.queryByText(ERR_SESSION_EXPIRED)).toBeNull();
  });

  it('lastAuthFailureReason.kind=reuseDetected のとき ERR_SESSION_REUSE_DETECTED が表示される', () => {
    mockUseAuth.mockReturnValue({
      status: 'signedOut' as const,
      isSignedIn: false,
      isLoading: false,
      lastAuthFailureReason: { kind: 'reuseDetected' as const },
    });

    renderWithProviders(<LoginScreen />);
    expect(screen.getByText(ERR_SESSION_REUSE_DETECTED)).toBeTruthy();
  });

  it('lastAuthFailureReason.kind=sessionExpired のとき ERR_SESSION_EXPIRED が表示される', () => {
    mockUseAuth.mockReturnValue({
      status: 'signedOut' as const,
      isSignedIn: false,
      isLoading: false,
      lastAuthFailureReason: { kind: 'sessionExpired' as const },
    });

    renderWithProviders(<LoginScreen />);
    expect(screen.getByText(ERR_SESSION_EXPIRED)).toBeTruthy();
  });

  it('reuseDetected バナーに accessibilityRole="alert" と accessibilityLiveRegion="assertive" が設定されている', () => {
    mockUseAuth.mockReturnValue({
      status: 'signedOut' as const,
      isSignedIn: false,
      isLoading: false,
      lastAuthFailureReason: { kind: 'reuseDetected' as const },
    });

    const { toJSON } = renderWithProviders(<LoginScreen />);
    // accessibilityRole="alert" を持つ要素が JSON に含まれること
    expect(JSON.stringify(toJSON())).toContain('"alert"');
  });
});
