/**
 * components/post/PostCardActions のコンポーネントテスト。
 * いいねは LikeButton に委譲されたため、PostCardActions はコメントボタンのみテストする。
 * いいねボタンの挙動は LikeButton のテストで検証する（tester 管轄）。
 * PostCardActions → LikeButton → useToggleLikeMutation の呼び出しがあるため
 * renderWithProviders で QueryClientProvider を提供する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { PostCardActions } from '@/components/post/PostCardActions';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

function renderActions(overrides?: Partial<Parameters<typeof PostCardActions>[0]>) {
  const props = {
    postId: 'post-1',
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    currentUserId: undefined as string | undefined,
    onComment: jest.fn(),
    ...overrides,
  };
  return renderWithProviders(<PostCardActions {...props} />);
}

describe('PostCardActions', () => {
  describe('いいねボタン', () => {
    it('isLiked=false のとき accessibilityLabel に「いいねする」が含まれる', () => {
      renderActions({ isLiked: false, likeCount: 5, currentUserId: 'user-1' });
      expect(screen.getByRole('button', { name: 'いいねする。現在 5 件' })).toBeTruthy();
    });

    it('isLiked=true のとき accessibilityLabel に「いいねを取り消す」が含まれる', () => {
      renderActions({ isLiked: true, likeCount: 3, currentUserId: 'user-1' });
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
  });

  describe('いいねカウント表示', () => {
    it('likeCount=0 のとき数値テキストが表示されない', () => {
      renderActions({ likeCount: 0 });
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
