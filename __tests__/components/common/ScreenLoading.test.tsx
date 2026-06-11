/**
 * components/common/ScreenLoading のコンポーネントテスト。
 * variant=spinner/skeleton の切り替えと accessibilityRole を確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ScreenLoading } from '@/components/common/ScreenLoading';

// Animated.Value のシムアニメーションによる act 警告を抑制するためタイマーをモック化
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ScreenLoading', () => {
  describe('variant=skeleton（デフォルト）', () => {
    it('デフォルトの accessibilityLabel「読み込み中」が設定される', () => {
      render(<ScreenLoading />);
      expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    });

    it('accessibilityRole="progressbar" が属性として設定される', () => {
      const { toJSON } = render(<ScreenLoading />);
      const json = toJSON();
      // ルートレベルの View に accessibilityRole が設定されていることを確認
      expect(JSON.stringify(json)).toContain('"progressbar"');
    });

    it('skeletonCount=1 でエラーなく描画される', () => {
      render(<ScreenLoading skeletonCount={1} />);
      expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    });

    it('skeletonCount=5 でエラーなく描画される', () => {
      render(<ScreenLoading skeletonCount={5} />);
      expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    });

    it('カスタム accessibilityLabel を設定できる', () => {
      render(<ScreenLoading accessibilityLabel="投稿を読み込み中" />);
      expect(screen.getByLabelText('投稿を読み込み中')).toBeTruthy();
    });
  });

  describe('variant=spinner', () => {
    it('デフォルトの accessibilityLabel「読み込み中」が設定される', () => {
      render(<ScreenLoading variant="spinner" />);
      expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    });

    it('accessibilityRole="progressbar" が属性として設定される', () => {
      const { toJSON } = render(<ScreenLoading variant="spinner" />);
      const json = toJSON();
      expect(JSON.stringify(json)).toContain('"progressbar"');
    });

    it('カスタム accessibilityLabel を設定できる', () => {
      render(<ScreenLoading variant="spinner" accessibilityLabel="ログイン中" />);
      expect(screen.getByLabelText('ログイン中')).toBeTruthy();
    });
  });
});
