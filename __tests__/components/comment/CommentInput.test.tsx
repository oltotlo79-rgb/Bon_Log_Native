/**
 * @module __tests__/components/comment/CommentInput
 * CommentInput コンポーネントのテスト。
 * canSubmit ロジック・送信後テキストクリア・返信モード・文字数カウンタを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CommentInput } from '@/components/comment/CommentInput';
import { MAX_COMMENT_LENGTH } from '@/lib/constants/limits/post';

const onSubmit = jest.fn();
const onCancelReply = jest.fn();

const DEFAULT_PROPS = {
  replyTarget: null,
  onCancelReply,
  onSubmit,
  isSubmitting: false,
  isPremium: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CommentInput', () => {
  describe('基本表示', () => {
    it('テキスト入力フィールドが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('comment-input')).toBeTruthy();
    });

    it('送信ボタンが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('コメントを送信する')).toBeTruthy();
    });

    it('画像添付ボタンが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('画像を添付')).toBeTruthy();
    });
  });

  describe('canSubmit ロジック', () => {
    it('空文字の場合は送信ボタンが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);
      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('空白のみの場合は送信ボタンが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '   ');

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('テキストが入力されると送信ボタンが有効になる', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '盆栽について');

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });

    it('文字数が MAX_COMMENT_LENGTH を超えると送信ボタンが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(
        screen.getByTestId('comment-input'),
        'a'.repeat(MAX_COMMENT_LENGTH + 1)
      );

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('isSubmitting が true のとき送信ボタンが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} isSubmitting={true} />);

      // テキストを入力しても
      fireEvent.changeText(screen.getByTestId('comment-input'), 'コメント');

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('送信動作', () => {
    it('送信ボタンを押すと onSubmit が呼ばれる', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '素敵な盆栽ですね');
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      expect(onSubmit).toHaveBeenCalledWith({
        content: '素敵な盆栽ですね',
        parentId: undefined,
      });
    });

    it('送信後にテキストがクリアされる', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '素敵な盆栽ですね');
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      const input = screen.getByTestId('comment-input');
      expect(input.props.value).toBe('');
    });

    it('前後の空白がトリムされて onSubmit に渡される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '  盆栽最高  ');
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ content: '盆栽最高' })
      );
    });

    it('canSubmit が false のとき送信ボタンを押しても onSubmit が呼ばれない', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      // テキストなしで押す
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('返信モード', () => {
    const replyTarget = {
      parentId: 'comment-1',
      nickname: '松の匠',
    };

    it('replyTarget がある場合は返信バナーが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} replyTarget={replyTarget} />);

      expect(screen.getByText('@松の匠')).toBeTruthy();
    });

    it('返信モード時に送信すると parentId が含まれる', () => {
      render(<CommentInput {...DEFAULT_PROPS} replyTarget={replyTarget} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '返信コメント');
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      expect(onSubmit).toHaveBeenCalledWith({
        content: '返信コメント',
        parentId: 'comment-1',
      });
    });

    it('返信キャンセルボタンを押すと onCancelReply が呼ばれる', () => {
      render(<CommentInput {...DEFAULT_PROPS} replyTarget={replyTarget} />);

      fireEvent.press(screen.getByLabelText('返信をキャンセル'));

      expect(onCancelReply).toHaveBeenCalled();
    });

    it('replyTarget が null の場合は返信バナーが表示されない', () => {
      render(<CommentInput {...DEFAULT_PROPS} replyTarget={null} />);

      expect(screen.queryByLabelText('返信をキャンセル')).toBeNull();
    });
  });

  describe('文字数カウンタ', () => {
    it('入力前はカウンタが非表示', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      // カウンタテキスト「0 / 500」は未フォーカス・空文字の場合は非表示
      expect(screen.queryByText(`0 / ${MAX_COMMENT_LENGTH}`)).toBeNull();
    });

    it('テキストを入力するとカウンタが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), 'あ');

      expect(screen.getByText(`1 / ${MAX_COMMENT_LENGTH}`)).toBeTruthy();
    });

    it('MAX_COMMENT_LENGTH 文字まで入力可能', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      const exactText = 'a'.repeat(MAX_COMMENT_LENGTH);
      fireEvent.changeText(screen.getByTestId('comment-input'), exactText);

      expect(screen.getByText(`${MAX_COMMENT_LENGTH} / ${MAX_COMMENT_LENGTH}`)).toBeTruthy();
      // 上限丁度は送信可能
      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('isSubmitting 時の表示', () => {
    it('isSubmitting が true のとき入力フィールドが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} isSubmitting={true} />);

      const input = screen.getByTestId('comment-input');
      expect(input.props.editable).toBe(false);
    });
  });
});
