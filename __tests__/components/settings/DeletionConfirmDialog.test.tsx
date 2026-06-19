/**
 * @module __tests__/components/settings/DeletionConfirmDialog
 * DeletionConfirmDialog コンポーネントのテスト。
 * 2ステップ確認（「削除する」テキスト入力必須）・削除ボタン活性制御・エラー表示を検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DeletionConfirmDialog } from '@/components/settings/DeletionConfirmDialog';

const onConfirm = jest.fn();
const onCancel = jest.fn();

const DEFAULT_PROPS = {
  isVisible: true,
  onConfirm,
  onCancel,
  isDeleting: false,
  error: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DeletionConfirmDialog', () => {
  describe('基本表示（isVisible: true）', () => {
    it('タイトルが表示される', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);
      expect(screen.getByText('本当にアカウントを削除しますか？')).toBeTruthy();
    });

    it('説明文が表示される', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);
      expect(screen.getByText('確認のために「削除する」と入力してください。')).toBeTruthy();
    });

    it('確認入力フィールドが表示される', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('削除することを確認する入力フィールド')).toBeTruthy();
    });

    it('キャンセルボタンが表示される', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('キャンセル')).toBeTruthy();
    });

    it('削除ボタンが表示される', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('アカウントを完全に削除する')).toBeTruthy();
    });
  });

  describe('確認テキスト入力による削除ボタン制御', () => {
    it('初期状態（空文字）では削除ボタンが disabled', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      const deleteButton = screen.getByLabelText('アカウントを完全に削除する');
      expect(deleteButton.props.accessibilityState.disabled).toBe(true);
    });

    it('「削除する」と入力すると削除ボタンが enabled になる', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      fireEvent.changeText(
        screen.getByLabelText('削除することを確認する入力フィールド'),
        '削除する'
      );

      const deleteButton = screen.getByLabelText('アカウントを完全に削除する');
      expect(deleteButton.props.accessibilityState.disabled).toBe(false);
    });

    it('前後に空白があっても「削除する」（trim後）なら有効', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      fireEvent.changeText(
        screen.getByLabelText('削除することを確認する入力フィールド'),
        '  削除する  '
      );

      const deleteButton = screen.getByLabelText('アカウントを完全に削除する');
      expect(deleteButton.props.accessibilityState.disabled).toBe(false);
    });

    it('「削除する」以外のテキストでは削除ボタンが disabled のまま', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      fireEvent.changeText(
        screen.getByLabelText('削除することを確認する入力フィールド'),
        '削除'
      );

      const deleteButton = screen.getByLabelText('アカウントを完全に削除する');
      expect(deleteButton.props.accessibilityState.disabled).toBe(true);
    });

    it('正しいテキスト入力後に削除ボタンを押すと onConfirm が呼ばれる', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      fireEvent.changeText(
        screen.getByLabelText('削除することを確認する入力フィールド'),
        '削除する'
      );
      fireEvent.press(screen.getByLabelText('アカウントを完全に削除する'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('disabled のまま削除ボタンを押しても onConfirm が呼ばれない', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      fireEvent.press(screen.getByLabelText('アカウントを完全に削除する'));

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('入力エラー表示', () => {
    it('フォーカス外した後、不一致テキストがあればエラーが表示される', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      const input = screen.getByLabelText('削除することを確認する入力フィールド');
      fireEvent.changeText(input, '誤ったテキスト');
      fireEvent(input, 'blur');

      expect(screen.getByText('「削除する」と入力してください')).toBeTruthy();
    });

    it('空文字でフォーカスアウトしてもエラーは表示されない', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      const input = screen.getByLabelText('削除することを確認する入力フィールド');
      fireEvent(input, 'blur');

      expect(screen.queryByText('「削除する」と入力してください')).toBeNull();
    });

    it('正しいテキスト入力後はエラーが表示されない', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      const input = screen.getByLabelText('削除することを確認する入力フィールド');
      fireEvent.changeText(input, '削除する');
      fireEvent(input, 'blur');

      expect(screen.queryByText('「削除する」と入力してください')).toBeNull();
    });
  });

  describe('API エラー表示', () => {
    it('error prop があればエラーメッセージが表示される', () => {
      render(
        <DeletionConfirmDialog
          {...DEFAULT_PROPS}
          error="サーバーエラーが発生しました"
        />
      );
      expect(screen.getByText('サーバーエラーが発生しました')).toBeTruthy();
    });

    it('error が null の場合はエラーメッセージが表示されない', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} error={null} />);
      expect(screen.queryByText('サーバーエラーが発生しました')).toBeNull();
    });
  });

  describe('キャンセル動作', () => {
    it('キャンセルボタンを押すと onCancel が呼ばれる', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      fireEvent.press(screen.getByLabelText('キャンセル'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('キャンセル後は入力フィールドがリセットされる', () => {
      render(<DeletionConfirmDialog {...DEFAULT_PROPS} />);

      const input = screen.getByLabelText('削除することを確認する入力フィールド');
      fireEvent.changeText(input, '削除する');
      fireEvent.press(screen.getByLabelText('キャンセル'));

      // キャンセル後は入力が消える
      expect(input.props.value).toBe('');
    });
  });

  describe('isDeleting（処理中）', () => {
    it('isDeleting が true のとき削除ボタンが disabled', () => {
      render(
        <DeletionConfirmDialog
          {...DEFAULT_PROPS}
          isDeleting={true}
        />
      );

      // まず「削除する」を入力
      fireEvent.changeText(
        screen.getByLabelText('削除することを確認する入力フィールド'),
        '削除する'
      );

      const deleteButton = screen.getByLabelText('アカウントを完全に削除する');
      expect(deleteButton.props.accessibilityState.disabled).toBe(true);
    });

    it('isDeleting が true のときキャンセルボタンが disabled', () => {
      render(
        <DeletionConfirmDialog
          {...DEFAULT_PROPS}
          isDeleting={true}
        />
      );

      const cancelButton = screen.getByLabelText('キャンセル');
      expect(cancelButton.props.accessibilityState.disabled).toBe(true);
    });

    it('isDeleting が true のとき入力フィールドが editable でない', () => {
      render(
        <DeletionConfirmDialog
          {...DEFAULT_PROPS}
          isDeleting={true}
        />
      );

      const input = screen.getByLabelText('削除することを確認する入力フィールド');
      expect(input.props.editable).toBe(false);
    });
  });
});
