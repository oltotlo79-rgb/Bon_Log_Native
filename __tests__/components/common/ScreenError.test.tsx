/**
 * components/common/ScreenError のコンポーネントテスト。
 * デフォルト文言・onRetry タップ・debugMessage の __DEV__ 分岐を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ScreenError } from '@/components/common/ScreenError';
import { ERR_GENERIC } from '@/lib/constants/errors';

describe('ScreenError', () => {
  describe('デフォルト文言', () => {
    it('デフォルトタイトル「エラーが発生しました」が表示される', () => {
      render(<ScreenError onRetry={jest.fn()} />);
      expect(screen.getByText('エラーが発生しました')).toBeTruthy();
    });

    it('デフォルト説明文（ERR_GENERIC）が表示される', () => {
      render(<ScreenError onRetry={jest.fn()} />);
      expect(screen.getByText(ERR_GENERIC)).toBeTruthy();
    });

    it('再試行ボタンのデフォルトラベル「再試行」が表示される', () => {
      render(<ScreenError onRetry={jest.fn()} />);
      expect(screen.getByText('再試行')).toBeTruthy();
    });
  });

  describe('カスタムプロパティ', () => {
    it('カスタム title が表示される', () => {
      render(<ScreenError title="読み込みエラー" onRetry={jest.fn()} />);
      expect(screen.getByText('読み込みエラー')).toBeTruthy();
    });

    it('カスタム description が表示される', () => {
      render(<ScreenError description="通信に失敗しました" onRetry={jest.fn()} />);
      expect(screen.getByText('通信に失敗しました')).toBeTruthy();
    });

    it('カスタム retryLabel が表示される', () => {
      render(<ScreenError onRetry={jest.fn()} retryLabel="もう一度試す" />);
      expect(screen.getByText('もう一度試す')).toBeTruthy();
    });
  });

  describe('onRetry ボタン', () => {
    it('再試行ボタンをタップすると onRetry が呼ばれる', () => {
      const onRetry = jest.fn();
      render(<ScreenError onRetry={onRetry} />);
      fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('再試行ボタンは accessibilityRole="button" を持つ', () => {
      render(<ScreenError onRetry={jest.fn()} />);
      expect(screen.getByRole('button', { name: '再試行する' })).toBeTruthy();
    });
  });

  describe('サブリンク', () => {
    it('subLinkLabel と onSubLink が両方指定されたとき表示される', () => {
      const onSubLink = jest.fn();
      render(
        <ScreenError onRetry={jest.fn()} subLinkLabel="ホームへ戻る" onSubLink={onSubLink} />
      );
      expect(screen.getByRole('button', { name: 'ホームへ戻る' })).toBeTruthy();
    });

    it('subLinkLabel が未指定のとき表示されない', () => {
      render(<ScreenError onRetry={jest.fn()} onSubLink={jest.fn()} />);
      expect(screen.queryByRole('button', { name: 'ホームへ戻る' })).toBeNull();
    });

    it('サブリンクをタップすると onSubLink が呼ばれる', () => {
      const onSubLink = jest.fn();
      render(
        <ScreenError onRetry={jest.fn()} subLinkLabel="ホームへ戻る" onSubLink={onSubLink} />
      );
      fireEvent.press(screen.getByRole('button', { name: 'ホームへ戻る' }));
      expect(onSubLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('debugMessage の __DEV__ 分岐', () => {
    it('__DEV__=true のとき debugMessage が表示される', () => {
      // jest-expo では __DEV__ は true
      render(<ScreenError onRetry={jest.fn()} debugMessage="TypeError: Cannot read property" />);
      expect(screen.getByText('TypeError: Cannot read property')).toBeTruthy();
    });

    it('debugMessage が未指定のとき表示されない', () => {
      render(<ScreenError onRetry={jest.fn()} />);
      // debugMessage なしで余分な要素が表示されないことを確認
      const json = JSON.stringify(render(<ScreenError onRetry={jest.fn()} />).toJSON());
      expect(json).not.toContain('TypeError');
    });

    it('debugMessage が空文字のとき表示されない', () => {
      render(<ScreenError onRetry={jest.fn()} debugMessage="" />);
      // debugMessage="" は length===0 のため表示されない
      expect(screen.queryByText('')).toBeNull();
    });
  });
});
