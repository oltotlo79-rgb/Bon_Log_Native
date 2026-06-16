/**
 * @module __tests__/components/comment/CommentItem
 * CommentItem コンポーネントのテスト。
 * 通常表示 / isDeleted / isBlockedUser / avatarUrl フォールバック / parseContentSegments 表示を検証する。
 * currentUserId による「⋮」メニュー表示制御（他人のコメント: 表示 / 自分や未認証: 非表示）も検証する。
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
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.getByTestId('comment-item')).toBeTruthy();
    });

    it('ニックネームが表示される', () => {
      const item = makeCommentItem({ user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: null, isBlocked: false, isMuted: false } });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.getAllByText('盆栽太郎').length).toBeGreaterThan(0);
    });

    it('本文が表示される', () => {
      const item = makeCommentItem({ content: 'テストコメント内容' });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.getByText('テストコメント内容')).toBeTruthy();
    });

    it('アバターボタンがアクセシビリティラベルを持つ', () => {
      const item = makeCommentItem({ user: { id: 'u-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false } });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(
        screen.getByRole('imagebutton', { name: '松の匠のプロフィールを表示' })
      ).toBeTruthy();
    });

    it('アバターボタンをタップするとプロフィールへ遷移する', () => {
      const item = makeCommentItem({ user: { id: 'user-xyz', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false } });
      render(<CommentItem item={item} currentUserId={undefined} />);
      fireEvent.press(screen.getByRole('imagebutton', { name: '松の匠のプロフィールを表示' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/user-xyz');
    });
  });

  describe('isDeleted=true', () => {
    it('「削除されたコメント」プレースホルダーが表示される', () => {
      const item = makeCommentItem({ isDeleted: true });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.getByText('削除されたコメント')).toBeTruthy();
    });

    it('通常の本文は表示されない', () => {
      const item = makeCommentItem({ isDeleted: true, content: '削除前の内容' });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.queryByText('削除前の内容')).toBeNull();
    });
  });

  describe('isBlockedUser=true', () => {
    it('null が返される（コンポーネントが描画されない）', () => {
      const item = makeCommentItem({ isBlockedUser: true });
      const { toJSON } = render(<CommentItem item={item} currentUserId={undefined} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('avatarUrl=null フォールバック', () => {
    it('avatarUrl が null のとき、ニックネームの頭文字がフォールバックとして表示される', () => {
      const item = makeCommentItem({
        user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: null, isBlocked: false, isMuted: false },
      });
      render(<CommentItem item={item} currentUserId={undefined} />);
      // ニックネームの先頭1文字「盆」がフォールバックとして表示される
      expect(screen.getByText('盆')).toBeTruthy();
    });
  });

  describe('parseContentSegments', () => {
    it('プレーンテキストのコメントが表示される', () => {
      const item = makeCommentItem({ content: 'シンプルなコメントです' });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.getByText('シンプルなコメントです')).toBeTruthy();
    });

    it('ハッシュタグを含むコメントが正しく表示される', () => {
      const item = makeCommentItem({ content: 'テスト #盆栽 タグ付き' });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.getByText('#盆栽')).toBeTruthy();
    });

    it('isDeleted=true のときは parseContentSegments の結果ではなく削除プレースホルダーが表示される', () => {
      const item = makeCommentItem({ isDeleted: true, content: 'ここには来ない' });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.getByText('削除されたコメント')).toBeTruthy();
      expect(screen.queryByText('ここには来ない')).toBeNull();
    });
  });

  describe('currentUserId によるメニュー表示制御', () => {
    it('他人のコメント＋認証済みユーザーのとき「⋮」ボタンが表示される', () => {
      const item = makeCommentItem({ userId: 'other-user', user: { id: 'other-user', nickname: '他のユーザー', avatarUrl: null, isBlocked: false, isMuted: false } });
      render(<CommentItem item={item} currentUserId="current-user" />);
      expect(screen.getByRole('button', { name: 'コメントのオプションを開く' })).toBeTruthy();
    });

    it('自分のコメントのときは「⋮」ボタンが表示されない', () => {
      const item = makeCommentItem({ userId: 'current-user', user: { id: 'current-user', nickname: '自分', avatarUrl: null, isBlocked: false, isMuted: false } });
      render(<CommentItem item={item} currentUserId="current-user" />);
      expect(screen.queryByRole('button', { name: 'コメントのオプションを開く' })).toBeNull();
    });

    it('未認証（currentUserId=undefined）のときは「⋮」ボタンが表示されない', () => {
      const item = makeCommentItem({ userId: 'other-user', user: { id: 'other-user', nickname: '他のユーザー', avatarUrl: null, isBlocked: false, isMuted: false } });
      render(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.queryByRole('button', { name: 'コメントのオプションを開く' })).toBeNull();
    });

    it('isDeleted=true のコメントでは「⋮」ボタンが表示されない', () => {
      const item = makeCommentItem({ userId: 'other-user', user: { id: 'other-user', nickname: '他のユーザー', avatarUrl: null, isBlocked: false, isMuted: false }, isDeleted: true });
      render(<CommentItem item={item} currentUserId="current-user" />);
      expect(screen.queryByRole('button', { name: 'コメントのオプションを開く' })).toBeNull();
    });
  });
});
