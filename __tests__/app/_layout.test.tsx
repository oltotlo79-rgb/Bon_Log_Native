/**
 * app/_layout.tsx のテスト。
 * QueryClientProvider の配線と managers のセットアップ/クリーンアップを確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';

// TanStack Query の createQueryClient をモック（テスト間の副作用を排除）
jest.mock('@/lib/queries/query-client', () => ({
  createQueryClient: jest.fn(() => {
    const { QueryClient } = jest.requireActual('@tanstack/react-query');
    return new QueryClient({ defaultOptions: { queries: { retry: false } } });
  }),
}));

// managers モック（ネイティブ NetInfo / AppState への依存を切り離す）
const mockSetupOnlineManager = jest.fn(() => jest.fn());
const mockSetupFocusManager = jest.fn(() => jest.fn());

jest.mock('@/lib/queries/managers', () => ({
  setupOnlineManager: () => mockSetupOnlineManager(),
  setupFocusManager: () => mockSetupFocusManager(),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetupOnlineManager.mockReturnValue(jest.fn());
    mockSetupFocusManager.mockReturnValue(jest.fn());
  });

  it('マウント時に setupOnlineManager が呼ばれる', () => {
    render(<RootLayout />);
    expect(mockSetupOnlineManager).toHaveBeenCalledTimes(1);
  });

  it('マウント時に setupFocusManager が呼ばれる', () => {
    render(<RootLayout />);
    expect(mockSetupFocusManager).toHaveBeenCalledTimes(1);
  });

  it('アンマウント時に online cleanup が呼ばれる', () => {
    const cleanupOnline = jest.fn();
    mockSetupOnlineManager.mockReturnValue(cleanupOnline);

    const { unmount } = render(<RootLayout />);
    unmount();

    expect(cleanupOnline).toHaveBeenCalledTimes(1);
  });

  it('アンマウント時に focus cleanup が呼ばれる', () => {
    const cleanupFocus = jest.fn();
    mockSetupFocusManager.mockReturnValue(cleanupFocus);

    const { unmount } = render(<RootLayout />);
    unmount();

    expect(cleanupFocus).toHaveBeenCalledTimes(1);
  });

  it('Stack コンポーネントが描画される（expo-router モック経由）', () => {
    render(<RootLayout />);
    // setup.ts の Stack モックにより testID="stack" の View が描画される
    expect(screen.getByTestId('stack')).toBeTruthy();
  });

  it('QueryClientProvider が存在する（SafeAreaProvider が内包される）', () => {
    render(<RootLayout />);
    // setup.ts の SafeAreaProvider モックにより testID="safe-area-provider" が描画される
    expect(screen.getByTestId('safe-area-provider')).toBeTruthy();
  });
});
