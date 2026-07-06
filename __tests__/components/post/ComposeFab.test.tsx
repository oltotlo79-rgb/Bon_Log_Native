/**
 * components/post/ComposeFab のユニットテスト。
 * 墨だまり画像（button-blob）背景・ペンアイコン・タップ動作・墨滴リップルが
 * 例外を起こさないこと、reduce-motion 時も安全に動作することを確認する。
 * 仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §5
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { ComposeFab } from '@/components/post/ComposeFab';

// useReduceMotion はモジュールレベルでモックし、reduce-motion のケースは
// mockReturnValue の切り替えのみで検証する（jest.resetModules は
// React フックの二重インスタンス化を招くため使わない）
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: jest.fn(() => false),
}));

describe('ComposeFab', () => {
  beforeEach(() => {
    const { useReduceMotion } = jest.requireMock('@/hooks/use-reduce-motion');
    (useReduceMotion as jest.Mock).mockReturnValue(false);
  });

  it('アクセシビリティラベル「新規投稿」を持つボタンが表示される', () => {
    render(<ComposeFab bottom={80} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: '新規投稿' })).toBeTruthy();
  });

  it('墨だまり画像（button-blob）が背景に描画される', () => {
    const { toJSON } = render(<ComposeFab bottom={80} onPress={jest.fn()} />);
    expect(JSON.stringify(toJSON())).toContain('button-blob.svg');
  });

  it('ペンアイコン（pencil）が表示される', () => {
    render(<ComposeFab bottom={80} onPress={jest.fn()} />);
    const fab = screen.getByRole('button', { name: '新規投稿' });
    expect(within(fab).getByTestId('icon-pencil')).toBeTruthy();
  });

  it('タップすると onPress が呼ばれる', () => {
    const onPress = jest.fn();
    render(<ComposeFab bottom={80} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: '新規投稿' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('bottom の値がコンテナの style に反映される', () => {
    const { toJSON } = render(<ComposeFab bottom={123} onPress={jest.fn()} />);
    expect(JSON.stringify(toJSON())).toContain('"bottom":123');
  });

  describe('押下・リップルアニメーション（例外が出ないこと）', () => {
    it('pressIn → press → pressOut を行っても例外が発生しない', () => {
      const onPress = jest.fn();
      render(<ComposeFab bottom={80} onPress={onPress} />);
      const fab = screen.getByRole('button', { name: '新規投稿' });

      expect(() => {
        fireEvent(fab, 'pressIn', {
          nativeEvent: { locationX: 40, locationY: 40 },
        });
        fireEvent.press(fab);
        fireEvent(fab, 'pressOut', {});
      }).not.toThrow();

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('連続で複数回 pressIn しても例外が発生しない（複数リップル生成）', () => {
      render(<ComposeFab bottom={80} onPress={jest.fn()} />);
      const fab = screen.getByRole('button', { name: '新規投稿' });

      expect(() => {
        fireEvent(fab, 'pressIn', { nativeEvent: { locationX: 10, locationY: 10 } });
        fireEvent(fab, 'pressIn', { nativeEvent: { locationX: 60, locationY: 60 } });
        fireEvent(fab, 'pressOut', {});
      }).not.toThrow();
    });
  });

  describe('reduce-motion 有効時', () => {
    beforeEach(() => {
      const { useReduceMotion } = jest.requireMock('@/hooks/use-reduce-motion');
      (useReduceMotion as jest.Mock).mockReturnValue(true);
    });

    it('reduce-motion が有効でも pressIn/press/pressOut が例外なく動作する', () => {
      const onPress = jest.fn();
      render(<ComposeFab bottom={80} onPress={onPress} />);
      const fab = screen.getByRole('button', { name: '新規投稿' });

      expect(() => {
        fireEvent(fab, 'pressIn', { nativeEvent: { locationX: 20, locationY: 20 } });
        fireEvent.press(fab);
        fireEvent(fab, 'pressOut', {});
      }).not.toThrow();

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('reduce-motion が有効でも FAB とアイコンは表示される', () => {
      render(<ComposeFab bottom={80} onPress={jest.fn()} />);
      const fab = screen.getByRole('button', { name: '新規投稿' });
      expect(within(fab).getByTestId('icon-pencil')).toBeTruthy();
    });
  });
});
