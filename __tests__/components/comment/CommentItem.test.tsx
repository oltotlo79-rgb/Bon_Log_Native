/**
 * @module __tests__/components/comment/CommentItem
 * CommentItem コンポーネントのテスト。
 * 通常表示 / isDeleted / isBlockedUser / avatarUrl フォールバック / parseContentSegments 表示を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { CommentItem } from '@/components/comment/CommentItem';
import { makeCommentItem } from '@/__tests__/utils/data-factories';

const mockRouter = jest.requireMock('expo-router').router;

describe('CommentItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('通常表示', () => {
    it('コンテナが表示される', () => {
      const item = makeCommentItem();
      render(<CommentItem item={item} />);
      expect(screen.getByTestId('comment-item')).toBeTruthy();
    });

    it('ニックネームが表示される', () => {
      const item = makeCommentItem({ user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: null } });
      render(<CommentItem item={item} />);
      expect(screen.getAllByText('盆栽太郎').length).toBeGreaterThan(0);
    });

    it('本文が表示される', () => {
      const item = makeCommentItem({ content: 'テストコメント内容' });
      render(<CommentItem item={item} />);
      expect(screen.getByText('テストコメント内容')).toBeTruthy();
    });

    it('アバターボタンがアクセシビリティラベルを持つ', () => {
      const item = makeCommentItem({ user: { id: 'u-1', nickname: '松の匠', avatarUrl: null } });
      render(<CommentItem item={item} />);
      expect(
        screen.getByRole('imagebutton', { name: '松の匠のプロフィールを表示' })
      ).toBeTruthy();
    });

    it('アバターボタンをタップするとプロフィールへ遷移する', () => {
      const item = makeCommentItem({ user: { id: 'user-xyz', nickname: '松の匠', avatarUrl: null } });
      render(<CommentItem item={item} />);
      fireEvent.press(screen.getByRole('imagebutton', { name: '松の匠のプロフィールを表示' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/user-xyz');
    });
  });

  describe('isDeleted=true', () => {
    it('「削除されたコメント」プレースホルダーが表示される', () => {
      const item = makeCommentItem({ isDeleted: true });
      render(<CommentItem item={item} />);
      expect(screen.getByText('削除されたコメント')).toBeTruthy();
    });

    it('通常の本文は表示されない', () => {
      const item = makeCommentItem({ isDeleted: true, content: '削除前の内容' });
      render(<CommentItem item={item} />);
      expect(screen.queryByText('削除前の内容')).toBeNull();
    });
  });

  describe('isBlockedUser=true', () => {
    it('null が返される（コンポーネントが描画されない）', () => {
      const item = makeCommentItem({ isBlockedUser: true });
      const { toJSON } = render(<CommentItem item={item} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('avatarUrl=null フォールバック', () => {
    it('avatarUrl が null のとき、ニックネームの頭文字がフォールバックとして表示される', () => {
      const item = makeCommentItem({
        user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: null },
      });
      render(<CommentItem item={item} />);
      // ニックネームの先頭1文字「盆」がフォールバックとして表示される
      expect(screen.getByText('盆')).toBeTruthy();
    });
  });

  describe('parseContentSegments', () => {
    it('プレーンテキストのコメントが表示される', () => {
      const item = makeCommentItem({ content: 'シンプルなコメントです' });
      render(<CommentItem item={item} />);
      expect(screen.getByText('シンプルなコメントです')).toBeTruthy();
    });

    it('ハッシュタグを含むコメントが正しく表示される', () => {
      const item = makeCommentItem({ content: 'テスト #盆栽 タグ付き' });
      render(<CommentItem item={item} />);
      expect(screen.getByText('#盆栽')).toBeTruthy();
    });

    it('isDeleted=true のときは parseContentSegments の結果ではなく削除プレースホルダーが表示される', () => {
      const item = makeCommentItem({ isDeleted: true, content: 'ここには来ない' });
      render(<CommentItem item={item} />);
      expect(screen.getByText('削除されたコメント')).toBeTruthy();
      expect(screen.queryByText('ここには来ない')).toBeNull();
    });
  });
});
