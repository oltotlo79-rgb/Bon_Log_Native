/**
 * components/post/PostCardActions のコンポーネントテスト。
 * いいねは LikeButton に委譲されたため、PostCardActions はコメントボタンのみテストする。
 * いいねボタンの挙動は LikeButton のテストで検証する（tester 管轄）。
 * repostCount と isReposted の表示を含む新フィールドも網羅する。
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
    isBookmarked: false,
    currentUserId: undefined as string | undefined,
    onComment: jest.fn(),
    ...overrides,
  };
  return renderWithProviders(<PostCardActions {...props} />);
}

// ブックマーク mutation のモック（ネットワークに出ない）
jest.mock('@/lib/queries/bookmarks', () => ({
  useToggleBookmarkMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

// リポスト mutation のモック（ネットワークに出ない）
jest.mock('@/lib/queries/posts', () => ({
  useToggleRepostMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

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

  describe('ブックマークボタン', () => {
    it('currentUserId が undefined のときブックマークボタンが表示されない', () => {
      renderActions({ currentUserId: undefined, isBookmarked: false });
      expect(screen.queryByRole('button', { name: 'ブックマークに追加' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'ブックマークを解除' })).toBeNull();
    });

    it('currentUserId がある場合にブックマークボタンが表示される', () => {
      renderActions({ currentUserId: 'user-1', isBookmarked: false });
      expect(screen.getByRole('button', { name: 'ブックマークに追加' })).toBeTruthy();
    });

    it('isBookmarked=true のとき「ブックマークを解除」ラベルが設定される', () => {
      renderActions({ currentUserId: 'user-1', isBookmarked: true });
      expect(screen.getByRole('button', { name: 'ブックマークを解除' })).toBeTruthy();
    });

    it('isBookmarked=false のとき「ブックマークに追加」ラベルが設定される', () => {
      renderActions({ currentUserId: 'user-1', isBookmarked: false });
      expect(screen.getByRole('button', { name: 'ブックマークに追加' })).toBeTruthy();
    });

    it('タップすると useToggleBookmarkMutation.mutate が呼ばれる', () => {
      const mockMutate = jest.fn();
      const { useToggleBookmarkMutation } = jest.requireMock('@/lib/queries/bookmarks') as {
        useToggleBookmarkMutation: jest.Mock;
      };
      useToggleBookmarkMutation.mockReturnValue({ mutate: mockMutate, isPending: false });

      renderActions({ currentUserId: 'user-1', isBookmarked: false, postId: 'post-123' });
      fireEvent.press(screen.getByRole('button', { name: 'ブックマークに追加' }));
      expect(mockMutate).toHaveBeenCalledWith({ postId: 'post-123', currentlyBookmarked: false });
    });
  });

  describe('リポスト表示（repostCount / isReposted）', () => {
    it('repostCount=0 のときリポスト数テキストが表示されない', () => {
      renderActions({ repostCount: 0, isReposted: false, currentUserId: 'user-1' });
      expect(screen.queryByText('0')).toBeNull();
    });

    it('repostCount=3 のとき「3」が表示される', () => {
      renderActions({ repostCount: 3, isReposted: false, currentUserId: 'user-1' });
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('repostCount=100 のとき「100」が表示される', () => {
      renderActions({ repostCount: 100, isReposted: false, currentUserId: 'user-1' });
      expect(screen.getByText('100')).toBeTruthy();
    });

    it('isReposted=true のとき accessibilityLabel に「リポスト済み」が含まれる', () => {
      renderActions({ repostCount: 5, isReposted: true, currentUserId: 'user-1' });
      expect(screen.getByLabelText('リポスト済み。現在 5 件。メニューを開く')).toBeTruthy();
    });

    it('isReposted=false のとき accessibilityLabel に「リポスト済み」が含まれない', () => {
      renderActions({ repostCount: 5, isReposted: false, currentUserId: 'user-1' });
      expect(screen.getByLabelText('リポストする。現在 5 件。メニューを開く')).toBeTruthy();
      expect(screen.queryByLabelText('リポスト済み。現在 5 件。メニューを開く')).toBeNull();
    });

    it('repostCount が省略されたとき（デフォルト 0）リポスト数テキストが表示されない', () => {
      renderActions({ currentUserId: 'user-1' });
      expect(screen.queryByText('0')).toBeNull();
    });

    it('isReposted が省略されたとき（デフォルト false）accessibilityLabel が正しい', () => {
      renderActions({ repostCount: 2, currentUserId: 'user-1' });
      expect(screen.getByLabelText('リポストする。現在 2 件。メニューを開く')).toBeTruthy();
    });

    it('未認証（currentUserId=undefined）のとき accessibilityLabel に「ログインして」が含まれる', () => {
      renderActions({ repostCount: 0, isReposted: false, currentUserId: undefined });
      expect(screen.getByLabelText('ログインしてリポストする。現在 0 件')).toBeTruthy();
    });
  });
});
