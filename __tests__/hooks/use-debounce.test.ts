/**
 * @module __tests__/hooks/use-debounce
 * useDebounce フックのテスト。
 * fake timers を使用して遅延の検証を行う。
 */

import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '@/hooks/use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('初期値をそのまま返す', () => {
    const { result } = renderHook(() => useDebounce('初期値', 300));
    expect(result.current).toBe('初期値');
  });

  it('遅延時間が経過するまで値は更新されない', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: '初期', delay: 300 } }
    );

    rerender({ value: '更新後', delay: 300 });
    // まだ時間が経過していないので初期値のまま
    expect(result.current).toBe('初期');
  });

  it('遅延時間経過後に最新の値に更新される', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: '初期', delay: 300 } }
    );

    rerender({ value: '更新後', delay: 300 });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('更新後');
  });

  it('連続更新で最後の値のみが適用される', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: '初期', delay: 300 } }
    );

    rerender({ value: '2回目', delay: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ value: '3回目', delay: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ value: '最終', delay: 300 });

    // まだ 300ms 経過していないので初期値のまま
    expect(result.current).toBe('初期');

    act(() => {
      jest.advanceTimersByTime(300);
    });
    // 最後の値だけが適用される
    expect(result.current).toBe('最終');
  });

  it('アンマウント時にタイマーがクリアされ更新が起きない', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: '初期', delay: 300 } }
    );

    rerender({ value: '更新後', delay: 300 });
    unmount();

    act(() => {
      jest.advanceTimersByTime(300);
    });
    // アンマウント後なので result.current は変化しないはず（エラーにならないことを確認）
    expect(result.current).toBe('初期');
  });

  it('数値型でも正しく動作する', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 500 } }
    );

    rerender({ value: 42, delay: 500 });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe(42);
  });

  it('delayMs=0 のとき即時更新される', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: '初期', delay: 0 } }
    );

    rerender({ value: '更新', delay: 0 });
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(result.current).toBe('更新');
  });
});
