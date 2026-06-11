/**
 * setupOnlineManager / setupFocusManager の接続・解除のユニットテスト。
 * NetInfo と AppState はモックで代替する。
 */

import { AppState, type AppStateStatus } from 'react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { setupOnlineManager, setupFocusManager } from '@/lib/queries/managers';

// ---------------------------------------------------------------------------
// NetInfo モック
// ---------------------------------------------------------------------------

type NetInfoChangeCallback = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void;

let netInfoCallback: NetInfoChangeCallback | null = null;

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((cb: NetInfoChangeCallback) => {
    netInfoCallback = cb;
    return jest.fn(() => { netInfoCallback = null; });
  }),
}));

// ---------------------------------------------------------------------------
// AppState モック（jest.spyOn で差し替え）
// ---------------------------------------------------------------------------

type AppStateChangeCallback = (status: AppStateStatus) => void;

let appStateCallback: AppStateChangeCallback | null = null;
const mockRemove = jest.fn();

// ---------------------------------------------------------------------------
// テスト本体
// ---------------------------------------------------------------------------

describe('setupOnlineManager', () => {
  beforeEach(() => {
    netInfoCallback = null;
    // オンライン状態をリセット
    onlineManager.setOnline(true);
  });

  it('NetInfo.addEventListener を呼び出す', () => {
    const NetInfo = require('@react-native-community/netinfo');
    setupOnlineManager();
    expect(NetInfo.addEventListener).toHaveBeenCalled();
  });

  it('解除関数を返す', () => {
    const cleanup = setupOnlineManager();
    expect(typeof cleanup).toBe('function');
  });

  it('isConnected=true かつ isInternetReachable=true のとき onlineManager がオンライン', () => {
    setupOnlineManager();
    netInfoCallback?.({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('isConnected=false のとき onlineManager がオフライン', () => {
    setupOnlineManager();
    netInfoCallback?.({ isConnected: false, isInternetReachable: null });
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('isConnected=true かつ isInternetReachable=false のとき onlineManager がオフライン', () => {
    setupOnlineManager();
    netInfoCallback?.({ isConnected: true, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('isConnected=null のとき onlineManager がオフライン', () => {
    setupOnlineManager();
    netInfoCallback?.({ isConnected: null, isInternetReachable: null });
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('解除関数を呼ぶと購読が解除される', () => {
    const cleanup = setupOnlineManager();
    cleanup();
    expect(netInfoCallback).toBeNull();
  });
});

describe('setupFocusManager', () => {
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    appStateCallback = null;
    mockRemove.mockClear();
    // フォーカス状態をリセット
    focusManager.setFocused(true);

    // AppState.addEventListener を spyOn で差し替える
    addEventListenerSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation(
      (event: string, cb: AppStateChangeCallback) => {
        if (event === 'change') appStateCallback = cb;
        return { remove: mockRemove } as ReturnType<typeof AppState.addEventListener>;
      }
    );
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
  });

  it('AppState.addEventListener を呼び出す', () => {
    setupFocusManager();
    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('解除関数を返す', () => {
    const cleanup = setupFocusManager();
    expect(typeof cleanup).toBe('function');
  });

  it('AppState が "active" になると focusManager がフォーカス状態になる', () => {
    setupFocusManager();
    appStateCallback?.('active');
    expect(focusManager.isFocused()).toBe(true);
  });

  it('AppState が "background" になると focusManager がアンフォーカス状態になる', () => {
    setupFocusManager();
    appStateCallback?.('background');
    expect(focusManager.isFocused()).toBe(false);
  });

  it('AppState が "inactive" になると focusManager がアンフォーカス状態になる', () => {
    setupFocusManager();
    appStateCallback?.('inactive');
    expect(focusManager.isFocused()).toBe(false);
  });

  it('解除関数を呼ぶと subscription.remove が呼ばれる', () => {
    const cleanup = setupFocusManager();
    cleanup();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
