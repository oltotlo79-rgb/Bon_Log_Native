/**
 * @module __tests__/components/comment/CommentLikeButton
 * CommentLikeButton コンポーネントのユニットテスト。
 * モック境界は lib/api/（ネットワークに出ない）。
 * useToggleCommentLikeMutation はフックレベルでモックし、mutate の呼び出し引数を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { CommentLikeButton } from '@/components/comment/CommentLikeButton';
import { ApiError } from '@/lib/api/errors';
import { ERR_LIKE_FAILED, ERR_RATE_LIMIT, ERR_NOT_FOUND } from '@/lib/constants/errors';
import { ROUTE_LOGIN } from '@/lib/constants/routes';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockMutate = jest.fn();

jest.mock('@/lib/queries/comments', () => ({
  useToggleCommentLikeMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

const mockRouterPush = jest.requireMock('expo-router').router.push as jest.Mock;

type Props = Parameters<typeof CommentLikeButton>[0];

function renderCommentLikeButton(props?: Partial<Props>) {
  const defaultProps: Props = {
    postId: 'post-1',
    commentId: 'comment-1',
    parentId: null,
    isLiked: false,
    likeCount: 3,
    currentUserId: 'user-1',
    ...props,
  };
  return renderWithProviders(<CommentLikeButton {...defaultProps} />);
}

describe('CommentLikeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示', () => {
    it('isLiked=false のとき heart-outline アイコンが表示される', () => {
      renderCommentLikeButton({ isLiked: false });
      expect(
        screen.getByTestId('icon-heart-outline', { includeHiddenElements: true })
      ).toBeTruthy();
    });

    it('isLiked=true のとき heart（塗りつぶし）アイコンが表示される', () => {
      renderCommentLikeButton({ isLiked: true });
      expect(
        screen.getByTestId('icon-heart', { includeHiddenElements: true })
      ).toBeTruthy();
    });

    it('likeCount=0 のとき件数テキストは表示されない', () => {
      renderCommentLikeButton({ likeCount: 0 });
      expect(screen.queryByText('0')).toBeNull();
    });

    it('likeCount=3 のとき「3」が表示される', () => {
      renderCommentLikeButton({ likeCount: 3 });
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  describe('accessibilityLabel（アクティブ状態の表現）', () => {
    it('未認証（currentUserId=undefined）のとき「ログインしていいねする。現在 N 件」', () => {
      renderCommentLikeButton({ currentUserId: undefined, isLiked: false, likeCount: 2 });
      expect(
        screen.getByRole('button', { name: 'ログインしていいねする。現在 2 件' })
      ).toBeTruthy();
    });

    it('isLiked=false のとき「いいねする。現在 N 件」', () => {
      renderCommentLikeButton({ isLiked: false, likeCount: 3 });
      expect(screen.getByRole('button', { name: 'いいねする。現在 3 件' })).toBeTruthy();
    });

    it('isLiked=true のとき「いいねを取り消す。現在 N 件」でありボタンの selected 状態が true になる', () => {
      renderCommentLikeButton({ isLiked: true, likeCount: 4 });
      const button = screen.getByRole('button', { name: 'いいねを取り消す。現在 4 件' });
      expect(button).toBeTruthy();
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true })
      );
    });
  });

  describe('タップで mutate', () => {
    it('未いいね状態でタップ → mutate({ commentId, liked: false, parentId }) が呼ばれる', () => {
      renderCommentLikeButton({
        commentId: 'comment-abc',
        parentId: 'parent-1',
        isLiked: false,
      });

      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 3 件' }));

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        { commentId: 'comment-abc', liked: false, parentId: 'parent-1' },
        expect.any(Object)
      );
    });

    it('parentId=null のとき mutate には parentId: undefined が渡される', () => {
      renderCommentLikeButton({ commentId: 'comment-xyz', parentId: null, isLiked: true });

      fireEvent.press(screen.getByRole('button', { name: 'いいねを取り消す。現在 3 件' }));

      expect(mockMutate).toHaveBeenCalledWith(
        { commentId: 'comment-xyz', liked: true, parentId: undefined },
        expect.any(Object)
      );
    });
  });

  describe('未認証タップ → ログイン誘導', () => {
    it('currentUserId=undefined でタップ → mutate を呼ばず router.push(ROUTE_LOGIN) する', () => {
      renderCommentLikeButton({ currentUserId: undefined, isLiked: false, likeCount: 0 });

      fireEvent.press(
        screen.getByRole('button', { name: 'ログインしていいねする。現在 0 件' })
      );

      expect(mockMutate).not.toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith(ROUTE_LOGIN);
    });
  });

  describe('エラー時の onError コールバック', () => {
    it('429 RATE_LIMITED → onError に ERR_RATE_LIMIT が渡される', () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
        retryAfter: 5,
      });
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(rateLimitError);
        }
      );
      const onError = jest.fn();

      renderCommentLikeButton({ isLiked: false, onError });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 3 件' }));

      expect(onError).toHaveBeenCalledWith(ERR_RATE_LIMIT);
    });

    it('404 NOT_FOUND → onError に ERR_NOT_FOUND が渡される', () => {
      const notFoundError = new ApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: 'not found',
      });
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(notFoundError);
        }
      );
      const onError = jest.fn();

      renderCommentLikeButton({ isLiked: false, onError });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 3 件' }));

      expect(onError).toHaveBeenCalledWith(ERR_NOT_FOUND);
    });

    it('非 ApiError（汎用 Error）→ onError に ERR_LIKE_FAILED が渡される', () => {
      const genericError = new Error('network error');
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(genericError);
        }
      );
      const onError = jest.fn();

      renderCommentLikeButton({ isLiked: false, onError });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 3 件' }));

      expect(onError).toHaveBeenCalledWith(ERR_LIKE_FAILED);
    });

    it('onError が未指定でもエラー時に例外を投げない', () => {
      const genericError = new Error('network error');
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(genericError);
        }
      );

      renderCommentLikeButton({ isLiked: false });
      expect(() => {
        fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 3 件' }));
      }).not.toThrow();
    });
  });
});
