/**
 * app/_layout.tsx の AuthGuard テスト。
 * 認証状態とセグメントに応じたリダイレクト動作を確認する。
 *
 * _layout.tsx は useAuth を @/lib/auth/use-auth から直接インポートするため、
 * そのモジュールをモックする。
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// jest.mock ファクトリ内では ES import が使えないため require を使用する（Jest 制約）。

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import { ROUTE_LOGIN, ROUTE_FEED } from '@/lib/constants/routes';
import type { UseAuthReturn } from '@/lib/auth/use-auth';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

jest.mock('@/lib/queries/query-client', () => ({
  createQueryClient: jest.fn(() => {
    const { QueryClient } = jest.requireActual('@tanstack/react-query');
    return new QueryClient({ defaultOptions: { queries: { retry: false } } });
  }),
}));

const mockSetupOnlineManager = jest.fn(() => jest.fn());
const mockSetupFocusManager = jest.fn(() => jest.fn());

jest.mock('@/lib/queries/managers', () => ({
  setupOnlineManager: () => mockSetupOnlineManager(),
  setupFocusManager: () => mockSetupFocusManager(),
}));

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
      replace: jest.fn(),
      navigate: jest.fn(),
    },
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, { testID: 'redirect' }, `Redirect:${href}`),
    Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
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

const mockInitializeAuth = jest.fn((_arg?: unknown) => Promise.resolve());

jest.mock('@/lib/auth', () => ({
  initializeAuth: (arg: unknown) => mockInitializeAuth(arg),
}));

// _layout.tsx は useAuth を @/lib/auth/use-auth から直接インポートするためこちらをモックする
// setup.ts のモック（jest.fn(() => ({ status: 'signedOut' }))）を上書きする
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

function getRouterReplace(): jest.Mock {
  const mod = jest.requireMock('expo-router') as {
    router: { replace: jest.Mock };
  };
  return mod.router.replace;
}

function getUseSegments(): jest.Mock {
  const mod = jest.requireMock('expo-router') as {
    useSegments: jest.Mock;
  };
  return mod.useSegments;
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockInitializeAuth.mockResolvedValue(undefined);
  mockSetupOnlineManager.mockReturnValue(jest.fn());
  mockSetupFocusManager.mockReturnValue(jest.fn());
  mockUseAuth.mockReturnValue({
    status: 'signedOut' as const,
    isSignedIn: false,
    isLoading: false,
    lastAuthFailureReason: null,
  });
  getUseSegments().mockReturnValue([]);
});

// ---------------------------------------------------------------------------
// loading 状態
// ---------------------------------------------------------------------------

describe('AuthGuard: loading 状態', () => {
  it('認証初期化前は SafeAreaProvider が表示される（ScreenLoading）', () => {
    mockInitializeAuth.mockReturnValue(new Promise(() => {}));
    mockUseAuth.mockReturnValue({
      status: 'loading' as const,
      isSignedIn: false,
      isLoading: true,
      lastAuthFailureReason: null,
    });

    const { getByTestId } = render(<RootLayout />);
    expect(getByTestId('safe-area-provider')).toBeTruthy();
  });

  it('loading 状態では router.replace が呼ばれない', async () => {
    mockInitializeAuth.mockReturnValue(new Promise(() => {}));
    mockUseAuth.mockReturnValue({
      status: 'loading' as const,
      isSignedIn: false,
      isLoading: true,
      lastAuthFailureReason: null,
    });

    render(<RootLayout />);
    await new Promise((r) => setTimeout(r, 30));
    expect(getRouterReplace()).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// signedOut: 保護領域 → login へリダイレクト
// ---------------------------------------------------------------------------

describe('AuthGuard: signedOut + 保護領域', () => {
  it('signedOut + (tabs) セグメントでは ROUTE_LOGIN へ replace する', async () => {
    getUseSegments().mockReturnValue(['(tabs)']);
    mockUseAuth.mockReturnValue({
      status: 'signedOut' as const,
      isSignedIn: false,
      isLoading: false,
      lastAuthFailureReason: null,
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(getRouterReplace()).toHaveBeenCalledWith(ROUTE_LOGIN);
    });
  });

  it('signedOut + (auth) セグメントでは replace が呼ばれない', async () => {
    getUseSegments().mockReturnValue(['(auth)']);
    mockUseAuth.mockReturnValue({
      status: 'signedOut' as const,
      isSignedIn: false,
      isLoading: false,
      lastAuthFailureReason: null,
    });

    render(<RootLayout />);
    await waitFor(() => expect(mockInitializeAuth).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    expect(getRouterReplace()).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// signedIn: (auth) セグメント → feed へリダイレクト
// ---------------------------------------------------------------------------

describe('AuthGuard: signedIn + auth セグメント', () => {
  it('signedIn + (auth) セグメントでは ROUTE_FEED へ replace する', async () => {
    getUseSegments().mockReturnValue(['(auth)']);
    mockUseAuth.mockReturnValue({
      status: 'signedIn' as const,
      isSignedIn: true,
      isLoading: false,
      lastAuthFailureReason: null,
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(getRouterReplace()).toHaveBeenCalledWith(ROUTE_FEED);
    });
  });

  it('signedIn + (tabs) セグメントでは replace が呼ばれない', async () => {
    getUseSegments().mockReturnValue(['(tabs)']);
    mockUseAuth.mockReturnValue({
      status: 'signedIn' as const,
      isSignedIn: true,
      isLoading: false,
      lastAuthFailureReason: null,
    });

    render(<RootLayout />);
    await waitFor(() => expect(mockInitializeAuth).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    expect(getRouterReplace()).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 初期化完了後の描画
// ---------------------------------------------------------------------------

describe('認証初期化後の Stack 描画', () => {
  it('initializeAuth が解決すると Stack が描画される', async () => {
    getUseSegments().mockReturnValue(['(auth)']);
    mockUseAuth.mockReturnValue({
      status: 'signedOut' as const,
      isSignedIn: false,
      isLoading: false,
      lastAuthFailureReason: null,
    });

    const { getByTestId } = render(<RootLayout />);
    await waitFor(() => {
      expect(getByTestId('stack')).toBeTruthy();
    });
  });
});
