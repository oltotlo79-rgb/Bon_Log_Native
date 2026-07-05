/**
 * @module __tests__/components/comment/CommentItem-replies
 * CommentItem の返信スレッド表示テスト。
 * 返信件数トグル・子コメント描画・さらに読み込む・ローディング/エラー・編集済みバッジを検証する。
 * useCommentRepliesQuery はフックレベルでモックし、ネットワークに出ない構成にする。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { CommentItem } from '@/components/comment/CommentItem';
import { makeCommentItem } from '@/__tests__/utils/data-factories';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ERR_GENERIC } from '@/lib/constants/errors';

jest.mock('@/components/user/UserActionMenu', () => ({
  UserActionMenu: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="user-action-menu">
        <Text>menu</Text>
      </View>
    );
  },
}));

const mockUseCommentRepliesQuery = jest.fn();

jest.mock('@/lib/queries/comments', () => ({
  useCommentRepliesQuery: (...args: unknown[]) => mockUseCommentRepliesQuery(...args),
  useToggleCommentLikeMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

const defaultRepliesState = {
  data: { pages: [{ items: [], nextCursor: null }] },
  isLoading: false,
  isError: false,
  error: null,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
};

describe('CommentItem - 返信スレッド', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCommentRepliesQuery.mockReturnValue(defaultRepliesState);
  });

  describe('返信件数トグル', () => {
    it('replyCount > 0 のとき「N件の返信を表示する」トグルボタンが表示される', () => {
      const item = makeCommentItem({ replyCount: 3 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);
      expect(
        screen.getByRole('button', { name: '3件の返信を表示する' })
      ).toBeTruthy();
    });

    it('replyCount === 0 のときトグルボタンは表示されない', () => {
      const item = makeCommentItem({ replyCount: 0 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.queryByRole('button', { name: /件の返信を表示する/ })).toBeNull();
    });

    it('トグルを押すと展開され「返信を非表示にする」に切り替わる', () => {
      const item = makeCommentItem({ replyCount: 2 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '2件の返信を表示する' }));

      expect(screen.getByRole('button', { name: '返信を非表示にする' })).toBeTruthy();
    });

    it('展開中に再度押すと「N件の返信を表示する」に戻る（折りたたみ）', () => {
      const item = makeCommentItem({ replyCount: 2 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '2件の返信を表示する' }));
      fireEvent.press(screen.getByRole('button', { name: '返信を非表示にする' }));

      expect(screen.getByRole('button', { name: '2件の返信を表示する' })).toBeTruthy();
    });
  });

  describe('子コメントの描画', () => {
    it('展開時に useCommentRepliesQuery が返す子コメントが再帰的に描画される', () => {
      const childReply = makeCommentItem({
        id: 'reply-1',
        content: '返信内容です',
        user: { id: 'reply-user', nickname: '返信者', avatarUrl: null, isBlocked: false, isMuted: false },
      });
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        data: { pages: [{ items: [childReply], nextCursor: null }] },
      });

      const item = makeCommentItem({ replyCount: 1 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '1件の返信を表示する' }));

      expect(screen.getByText('返信内容です')).toBeTruthy();
      expect(screen.getByText('返信者')).toBeTruthy();
    });

    it('折りたたみ中は子コメントの本文が表示されない', () => {
      const childReply = makeCommentItem({
        id: 'reply-2',
        content: '隠れているはずの返信',
      });
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        data: { pages: [{ items: [childReply], nextCursor: null }] },
      });

      const item = makeCommentItem({ replyCount: 1 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      expect(screen.queryByText('隠れているはずの返信')).toBeNull();
    });
  });

  describe('ローディング / エラー状態', () => {
    it('isLoading=true のとき返信読み込み中インジケーターが表示される', () => {
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        isLoading: true,
      });

      const item = makeCommentItem({ replyCount: 1 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '1件の返信を表示する' }));

      expect(screen.getByLabelText('返信を読み込み中')).toBeTruthy();
    });

    it('isError=true のとき ERR_GENERIC と再試行ボタンが表示される', () => {
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        isError: true,
        error: new Error('network error'),
      });

      const item = makeCommentItem({ replyCount: 1 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '1件の返信を表示する' }));

      expect(screen.getByText(ERR_GENERIC)).toBeTruthy();
      expect(
        screen.getByRole('button', { name: '返信の読み込みを再試行する' })
      ).toBeTruthy();
    });

    it('再試行ボタンを押すと refetch が呼ばれる', () => {
      const mockRefetch = jest.fn();
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        isError: true,
        error: new Error('network error'),
        refetch: mockRefetch,
      });

      const item = makeCommentItem({ replyCount: 1 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '1件の返信を表示する' }));
      fireEvent.press(screen.getByRole('button', { name: '返信の読み込みを再試行する' }));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('さらに読み込む', () => {
    it('hasNextPage=true のとき「さらに返信を読み込む」ボタンが表示される', () => {
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        hasNextPage: true,
      });

      const item = makeCommentItem({ replyCount: 5 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '5件の返信を表示する' }));

      expect(
        screen.getByRole('button', { name: 'さらに返信を読み込む' })
      ).toBeTruthy();
    });

    it('「さらに返信を読み込む」を押すと fetchNextPage が呼ばれる', () => {
      const mockFetchNextPage = jest.fn();
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        hasNextPage: true,
        fetchNextPage: mockFetchNextPage,
      });

      const item = makeCommentItem({ replyCount: 5 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '5件の返信を表示する' }));
      fireEvent.press(screen.getByRole('button', { name: 'さらに返信を読み込む' }));

      expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('isFetchingNextPage=true のときローディングインジケーターに置き換わりテキストは表示されない', () => {
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        hasNextPage: true,
        isFetchingNextPage: true,
      });

      const item = makeCommentItem({ replyCount: 5 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '5件の返信を表示する' }));

      expect(screen.queryByText('さらに返信を読み込む')).toBeNull();
    });

    it('hasNextPage=false のとき「さらに返信を読み込む」ボタンは表示されない', () => {
      mockUseCommentRepliesQuery.mockReturnValue({
        ...defaultRepliesState,
        hasNextPage: false,
      });

      const item = makeCommentItem({ replyCount: 1 });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);

      fireEvent.press(screen.getByRole('button', { name: '1件の返信を表示する' }));

      expect(screen.queryByRole('button', { name: 'さらに返信を読み込む' })).toBeNull();
    });
  });

  describe('編集済みバッジ', () => {
    it('editedAt が非 null のとき「（編集済み）」バッジが表示される', () => {
      const item = makeCommentItem({ editedAt: '2025-06-02T10:00:00Z' });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.getByText('（編集済み）')).toBeTruthy();
    });

    it('editedAt が null のとき「（編集済み）」バッジは表示されない', () => {
      const item = makeCommentItem({ editedAt: null });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.queryByText('（編集済み）')).toBeNull();
    });

    it('isDeleted=true のときは editedAt があってもバッジは表示されない', () => {
      const item = makeCommentItem({ editedAt: '2025-06-02T10:00:00Z', isDeleted: true });
      renderWithProviders(<CommentItem item={item} currentUserId={undefined} />);
      expect(screen.queryByText('（編集済み）')).toBeNull();
    });
  });
});
