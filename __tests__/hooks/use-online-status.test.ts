/**
 * hooks/use-online-status のユニットテスト。
 * onlineManager の状態変化への追従と unsubscribe を確認する。
 */

import { renderHook, act } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { useOnlineStatus } from '@/hooks/use-online-status';

describe('useOnlineStatus', () => {
  beforeEach(() => {
    // 各テスト前にオンライン状態をリセット
    onlineManager.setOnline(true);
  });

  it('初期状態は onlineManager.isOnline() の値と一致する', () => {
    onlineManager.setOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('初期状態がオフラインの場合、false を返す', () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('onlineManager がオフラインになると false を返す', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      onlineManager.setOnline(false);
    });

    expect(result.current).toBe(false);
  });

  it('onlineManager がオンラインに戻ると true を返す', () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      onlineManager.setOnline(true);
    });

    expect(result.current).toBe(true);
  });

  it('アンマウント後に onlineManager の状態変化を受け取らない', () => {
    const { result, unmount } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    unmount();

    // アンマウント後に状態変化させても result が更新されないことを確認
    act(() => {
      onlineManager.setOnline(false);
    });

    // unmount 後は current が変化しない（購読解除済み）
    expect(result.current).toBe(true);
  });
});
