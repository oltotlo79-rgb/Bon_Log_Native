/**
 * components/post/PostCardActions のコンポーネントテスト。
 * いいね済み/未のアイコン切替、accessibilityLabel、カウント 0 時の表示を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PostCardActions } from '@/components/post/PostCardActions';

function renderActions(overrides?: Partial<Parameters<typeof PostCardActions>[0]>) {
  const props = {
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    onLike: jest.fn(),
    onComment: jest.fn(),
    ...overrides,
  };
  return render(<PostCardActions {...props} />);
}

describe('PostCardActions', () => {
  describe('いいねボタン', () => {
    it('isLiked=false のとき accessibilityLabel に「いいねする」が含まれる', () => {
      renderActions({ isLiked: false, likeCount: 5 });
      expect(screen.getByRole('button', { name: 'いいねする。現在 5 件' })).toBeTruthy();
    });

    it('isLiked=true のとき accessibilityLabel に「いいねを取り消す」が含まれる', () => {
      renderActions({ isLiked: true, likeCount: 3 });
      expect(screen.getByRole('button', { name: 'いいねを取り消す。現在 3 件' })).toBeTruthy();
    });

    it('isLiked=false のとき heart-outline アイコンが表示される', () => {
      renderActions({ isLiked: false });
      expect(
        screen.getByTestId('icon-heart-outline', { includeHiddenElements: true })
      ).toBeTruthy();
    });

    it('isLiked=true のとき heart（塗りつぶし）アイコンが表示される', () => {
      renderActions({ isLiked: true });
      expect(
        screen.getByTestId('icon-heart', { includeHiddenElements: true })
      ).toBeTruthy();
    });

    it('タップすると onLike が呼ばれる', () => {
      const onLike = jest.fn();
      renderActions({ onLike });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 0 件' }));
      expect(onLike).toHaveBeenCalledTimes(1);
    });
  });

  describe('いいねカウント表示', () => {
    it('likeCount=0 のとき数値テキストが表示されない', () => {
      renderActions({ likeCount: 0 });
      // カウント 0 は非表示（PostCardActions の実装: likeCount > 0 のときのみ表示）
      expect(screen.queryByText('0')).toBeNull();
    });

    it('likeCount=5 のとき「5」が表示される', () => {
      renderActions({ likeCount: 5 });
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('likeCount=100 のとき「100」が表示される', () => {
      renderActions({ likeCount: 100 });
      expect(screen.getByText('100')).toBeTruthy();
    });
  });

  describe('コメントボタン', () => {
    it('accessibilityLabel にコメント件数が含まれる', () => {
      renderActions({ commentCount: 3 });
      expect(screen.getByRole('button', { name: 'コメントする。現在 3 件' })).toBeTruthy();
    });

    it('タップすると onComment が呼ばれる', () => {
      const onComment = jest.fn();
      renderActions({ onComment, commentCount: 0 });
      fireEvent.press(screen.getByRole('button', { name: 'コメントする。現在 0 件' }));
      expect(onComment).toHaveBeenCalledTimes(1);
    });

    it('commentCount=0 のとき数値テキストが表示されない', () => {
      renderActions({ commentCount: 0 });
      expect(screen.queryByText('0')).toBeNull();
    });

    it('commentCount=7 のとき「7」が表示される', () => {
      renderActions({ commentCount: 7 });
      expect(screen.getByText('7')).toBeTruthy();
    });
  });
});
