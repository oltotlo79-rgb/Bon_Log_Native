/**
 * app/_layout.tsx の通知タップ遷移配線テスト。
 * setupNotificationNavigation が起動時に1回登録され、アンマウントで解除されることを確認する。
 * lib/push の実体（expo-notifications 連携）はユニットテスト（notification-navigation.test.ts）で
 * 別途検証済みのため、ここでは _layout.tsx からの配線（呼び出し回数・引数・解除）のみを検証する。
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// jest.mock ファクトリ内では ES import が使えないため require を使用する（Jest 制約）。

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
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

jest.mock('@/lib/queries/managers', () => ({
  setupOnlineManager: jest.fn(() => jest.fn()),
  setupFocusManager: jest.fn(() => jest.fn()),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => ['(tabs)'] as string[]),
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

const mockUseAuth = jest.fn<UseAuthReturn, []>(() => ({
  status: 'signedIn' as const,
  isSignedIn: true,
  isLoading: false,
  lastAuthFailureReason: null,
}));

jest.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockSetupPushNotifications = jest.fn(async () => undefined);
const mockSetupNotificationNavigation = jest.fn((_deps: unknown) => jest.fn());
const mockFlushPendingNotificationRoute = jest.fn();

jest.mock('@/lib/push', () => ({
  setupPushNotifications: () => mockSetupPushNotifications(),
  setupNotificationNavigation: (deps: unknown) => mockSetupNotificationNavigation(deps),
  flushPendingNotificationRoute: (navigate: unknown) => mockFlushPendingNotificationRoute(navigate),
}));

jest.mock('@/hooks/use-push-registration', () => ({
  usePushRegistration: jest.fn(),
}));

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockInitializeAuth.mockResolvedValue(undefined);
  mockSetupPushNotifications.mockResolvedValue(undefined);
  mockSetupNotificationNavigation.mockReturnValue(jest.fn());
  mockUseAuth.mockReturnValue({
    status: 'signedIn' as const,
    isSignedIn: true,
    isLoading: false,
    lastAuthFailureReason: null,
  });
});

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('RootLayout: 通知タップ遷移の配線', () => {
  it('起動時に setupNotificationNavigation が1回呼ばれる', async () => {
    render(<RootLayout />);

    await waitFor(() => {
      expect(mockSetupNotificationNavigation).toHaveBeenCalledTimes(1);
    });
  });

  it('navigate と canNavigateNow を含む deps オブジェクトを渡す', async () => {
    render(<RootLayout />);

    await waitFor(() => {
      expect(mockSetupNotificationNavigation).toHaveBeenCalledWith(
        expect.objectContaining({
          navigate: expect.any(Function),
          canNavigateNow: expect.any(Function),
        })
      );
    });
  });

  it('アンマウント時に setupNotificationNavigation の解除関数が呼ばれる', async () => {
    const cleanup = jest.fn();
    mockSetupNotificationNavigation.mockReturnValue(cleanup);

    const { unmount } = render(<RootLayout />);
    await waitFor(() => {
      expect(mockSetupNotificationNavigation).toHaveBeenCalledTimes(1);
    });

    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('再マウントしても setupNotificationNavigation は都度1回だけ呼ばれる（重複登録しない）', async () => {
    const { unmount } = render(<RootLayout />);
    await waitFor(() => {
      expect(mockSetupNotificationNavigation).toHaveBeenCalledTimes(1);
    });
    unmount();

    render(<RootLayout />);
    await waitFor(() => {
      expect(mockSetupNotificationNavigation).toHaveBeenCalledTimes(2);
    });
  });

  it('signedIn 状態でマウントすると flushPendingNotificationRoute が呼ばれる', async () => {
    render(<RootLayout />);

    await waitFor(() => {
      expect(mockFlushPendingNotificationRoute).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
