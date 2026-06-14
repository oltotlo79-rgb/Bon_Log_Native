/**
 * @module __tests__/hooks/use-toast
 * useToast フックのユニットテスト。
 * トースト表示・自動消去（タイマーは Toast コンポーネント側の責務）・連続呼び出しの挙動を検証する。
 */

import { renderHook, act } from '@testing-library/react-native';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('useToast', () => {
  // -------------------------------------------------------------------------
  // 初期状態
  // -------------------------------------------------------------------------

  describe('初期状態', () => {
    it('visible=false / message="" / variant="default" で初期化される', () => {
      const { result } = renderHook(() => useToast());
      expect(result.current.toast.visible).toBe(false);
      expect(result.current.toast.message).toBe('');
      expect(result.current.toast.variant).toBe('default');
    });
  });

  // -------------------------------------------------------------------------
  // showToast
  // -------------------------------------------------------------------------

  describe('showToast', () => {
    it('showToast を呼ぶと visible=true になり、メッセージがセットされる', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('エラーが発生しました', 'error');
      });

      expect(result.current.toast.visible).toBe(true);
      expect(result.current.toast.message).toBe('エラーが発生しました');
      expect(result.current.toast.variant).toBe('error');
    });

    it('variant を省略した場合デフォルト（"default"）になる', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('情報メッセージ');
      });

      expect(result.current.toast.variant).toBe('default');
      expect(result.current.toast.visible).toBe(true);
    });

    it('variant="warning" を渡すと warning がセットされる', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('警告メッセージ', 'warning');
      });

      expect(result.current.toast.variant).toBe('warning');
    });

    it('連続して showToast を呼ぶと最後のメッセージが表示される', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('1つ目のメッセージ', 'default');
        result.current.showToast('2つ目のメッセージ', 'error');
      });

      expect(result.current.toast.message).toBe('2つ目のメッセージ');
      expect(result.current.toast.variant).toBe('error');
      expect(result.current.toast.visible).toBe(true);
    });

    it('showToast 後に再度 showToast を呼ぶと新しいメッセージに上書きされる', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('最初', 'error');
      });

      act(() => {
        result.current.showToast('上書き', 'warning');
      });

      expect(result.current.toast.message).toBe('上書き');
      expect(result.current.toast.variant).toBe('warning');
    });
  });

  // -------------------------------------------------------------------------
  // hideToast
  // -------------------------------------------------------------------------

  describe('hideToast', () => {
    it('hideToast を呼ぶと visible=false になる（メッセージは保持）', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('テストメッセージ', 'error');
      });

      act(() => {
        result.current.hideToast();
      });

      expect(result.current.toast.visible).toBe(false);
      // message は残る（Toast アニメーション中に文字が消えないよう）
      expect(result.current.toast.message).toBe('テストメッセージ');
    });

    it('showToast → hideToast → showToast の順で正しく動作する', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('1回目', 'default');
      });
      expect(result.current.toast.visible).toBe(true);

      act(() => {
        result.current.hideToast();
      });
      expect(result.current.toast.visible).toBe(false);

      act(() => {
        result.current.showToast('2回目', 'error');
      });
      expect(result.current.toast.visible).toBe(true);
      expect(result.current.toast.message).toBe('2回目');
      expect(result.current.toast.variant).toBe('error');
    });
  });

  // -------------------------------------------------------------------------
  // 参照安定性（useCallback）
  // -------------------------------------------------------------------------

  describe('参照安定性', () => {
    it('showToast は再レンダー間で同じ参照を返す（useCallback）', () => {
      const { result, rerender } = renderHook(() => useToast());
      const firstShowToast = result.current.showToast;

      rerender({});

      expect(result.current.showToast).toBe(firstShowToast);
    });

    it('hideToast は再レンダー間で同じ参照を返す（useCallback）', () => {
      const { result, rerender } = renderHook(() => useToast());
      const firstHideToast = result.current.hideToast;

      rerender({});

      expect(result.current.hideToast).toBe(firstHideToast);
    });
  });
});
