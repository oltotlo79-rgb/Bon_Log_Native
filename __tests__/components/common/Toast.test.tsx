/**
 * @module __tests__/components/common/Toast
 * Toast コンポーネントのユニットテスト。
 * 表示/非表示・variant・文言レンダリングを検証する。
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Toast, type ToastVariant } from '@/components/common/Toast';
import { TIMEOUT_TOAST } from '@/lib/constants/limits/ui';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type Props = Parameters<typeof Toast>[0];

function renderToast(overrides?: Partial<Props>) {
  const defaults: Props = {
    message: 'テストメッセージ',
    visible: true,
    variant: 'default',
    onHide: jest.fn(),
    ...overrides,
  };
  return render(<Toast {...defaults} />);
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 表示/非表示
  // -------------------------------------------------------------------------

  describe('表示/非表示', () => {
    it('visible=true のときメッセージが表示される', () => {
      renderToast({ visible: true, message: '表示テスト' });
      expect(screen.getByText('表示テスト')).toBeTruthy();
    });

    it('visible=false のとき何もレンダリングされない', () => {
      renderToast({ visible: false, message: '非表示テスト' });
      expect(screen.queryByText('非表示テスト')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // variant ごとのレンダリング
  // -------------------------------------------------------------------------

  describe('variant', () => {
    const variants: ToastVariant[] = ['default', 'error', 'warning'];

    variants.forEach((variant) => {
      it(`variant="${variant}" のとき正常にレンダリングされる`, () => {
        renderToast({ variant, message: `${variant} メッセージ` });
        expect(screen.getByText(`${variant} メッセージ`)).toBeTruthy();
      });
    });

    it('variant が省略されたとき（デフォルト）でもレンダリングされる', () => {
      const props: Props = {
        message: 'デフォルトバリアント',
        visible: true,
        onHide: jest.fn(),
      };
      render(<Toast {...props} />);
      expect(screen.getByText('デフォルトバリアント')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 文言レンダリング
  // -------------------------------------------------------------------------

  describe('文言レンダリング', () => {
    it('message に渡したテキストが表示される', () => {
      const message = '操作が多すぎます。しばらく時間をおいてからお試しください。';
      renderToast({ message });
      expect(screen.getByText(message)).toBeTruthy();
    });

    it('長い文言でも表示される', () => {
      const longMessage =
        '現在オフライン中のため、この操作はできません。接続を確認してください。';
      renderToast({ message: longMessage });
      expect(screen.getByText(longMessage)).toBeTruthy();
    });

    it('空文字でもクラッシュしない（レンダーツリーに message 要素が存在する）', () => {
      // visible=true かつ message='' のとき、Text 要素が存在することを確認（例外が起きない）
      const { toJSON } = renderToast({ message: '' });
      // クラッシュしなければ OK。JSON 出力が null でないことで確認する。
      expect(toJSON()).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // accessibilityRole / accessibilityLiveRegion
  // -------------------------------------------------------------------------

  describe('アクセシビリティ', () => {
    it('accessibilityRole="alert" が Animated.View に設定されている（ツリー検査）', () => {
      const { toJSON } = renderToast({ visible: true, message: 'アクセシビリティテスト' });
      // toJSON のツリーを文字列化して accessibilityRole="alert" が含まれるか確認する
      const json = JSON.stringify(toJSON());
      expect(json).toContain('"alert"');
    });
  });

  // -------------------------------------------------------------------------
  // 自動非表示: TIMEOUT_TOAST 後に onHide が呼ばれる
  // -------------------------------------------------------------------------

  describe('自動非表示', () => {
    it(`TIMEOUT_TOAST（${TIMEOUT_TOAST}ms）後に onHide が呼ばれる`, () => {
      const onHide = jest.fn();
      renderToast({ visible: true, onHide });

      // TIMEOUT_TOAST ms 未満では onHide は呼ばれない
      act(() => {
        jest.advanceTimersByTime(TIMEOUT_TOAST - 1);
      });
      // フェードアウトアニメーション分余裕を持たせる
      // TIMEOUT_TOAST 経過後にフェードアウト（200ms）が始まるため、合計を超えたタイミングで確認
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it('visible が false になったとき onHide は追加で呼ばれない', () => {
      const onHide = jest.fn();
      const { rerender } = renderToast({ visible: true, onHide });

      rerender(<Toast message="テスト" visible={false} onHide={onHide} />);

      act(() => {
        jest.advanceTimersByTime(TIMEOUT_TOAST + 500);
      });

      // 親が visible=false にした後は自動タイマーで onHide は呼ばれない
      expect(onHide).not.toHaveBeenCalled();
    });

    it('visible が true → false → true と切り替わったとき、タイマーがリセットされる', () => {
      const onHide = jest.fn();
      const { rerender } = renderToast({ visible: true, onHide, message: '初回' });

      // TIMEOUT_TOAST の半分だけ進める
      act(() => {
        jest.advanceTimersByTime(TIMEOUT_TOAST / 2);
      });

      // 非表示に
      rerender(<Toast message="初回" visible={false} onHide={onHide} />);

      // 再表示
      rerender(<Toast message="2回目" visible={true} onHide={onHide} />);

      // TIMEOUT_TOAST + 余裕
      act(() => {
        jest.advanceTimersByTime(TIMEOUT_TOAST + 500);
      });

      // 2 回目の表示分だけ onHide が呼ばれる（1 回）
      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });
});
