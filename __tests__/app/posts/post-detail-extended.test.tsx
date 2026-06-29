/**
 * @module __tests__/app/posts/post-detail-extended
 * PostDetailScreen の追加テスト（投稿表示 / コメント一覧 / 無限スクロール）。
 * post-detail.test.tsx の既存テストと重複しないよう新規ケースのみを扱う。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import PostDetailScreen from '@/app/posts/[id]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeCommentItem } from '@/__tests__/utils/data-factories';
import { ERR_POST_LOAD_FAILED } from '@/lib/constants/errors';
import type { PostDetail } from '@/lib/queries/posts';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
  useRegisterMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

const mockUsePostQuery = jest.fn();
const mockUseCommentsQuery = jest.fn();

jest.mock('@/lib/queries/posts', () => ({
  usePostQuery: () => mockUsePostQuery(),
  useDeletePostMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/lib/queries/comments', () => ({
  useCommentsQuery: () => mockUseCommentsQuery(),
  useCreateCommentMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useDeleteCommentMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

const defaultPostState = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};

const defaultCommentsState = {
  data: undefined,
  isLoading: true,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
};

const makePostDetail = (overrides?: Partial<PostDetail>): PostDetail => ({
  id: 'post-abc-123',
  content: '黒松の春管理です。',
  createdAt: '2025-06-01T10:00:00Z',
  updatedAt: '2025-06-01T10:00:00Z',
  userId: 'user-1',
  user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
  media: [],
  genres: [],
  likeCount: 5,
  commentCount: 2,
  repostCount: 0,
  isLiked: false,
  isBookmarked: false,
  isReposted: false,
  quotePost: null,
  repostPost: null,
  mentionedUsers: [],
  ...overrides,
});

describe('PostDetailScreen - 拡張テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'post-abc-123' });
    mockUsePostQuery.mockReturnValue(defaultPostState);
    mockUseCommentsQuery.mockReturnValue(defaultCommentsState);
  });

  describe('投稿ローディング', () => {
    it('投稿ローディング中もヘッダーの戻るボタンと共有ボタンが表示される', () => {
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByLabelText('戻る')).toBeTruthy();
      expect(screen.getByLabelText('この投稿を共有')).toBeTruthy();
    });

    it('投稿ローディング中も共有ボタンが表示される', () => {
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByRole('button', { name: 'この投稿を共有' })).toBeTruthy();
    });
  });

  describe('投稿エラー', () => {
    it('isPostError=true のときエラーメッセージが表示される', () => {
      mockUsePostQuery.mockReturnValue({
        ...defaultPostState,
        isLoading: false,
        isError: true,
        error: new Error('Post not found'),
      });
      mockUseCommentsQuery.mockReturnValue({
        ...defaultCommentsState,
        isLoading: false,
      });
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByText(ERR_POST_LOAD_FAILED)).toBeTruthy();
    });
  });

  describe('コメント一覧', () => {
    it('コメントがある場合に comments-list testID が存在する', () => {
      mockUsePostQuery.mockReturnValue({
        ...defaultPostState,
        isLoading: false,
        data: makePostDetail(),
      });
      const comment = makeCommentItem({ id: 'c-1' });
      mockUseCommentsQuery.mockReturnValue({
        ...defaultCommentsState,
        isLoading: false,
        data: { pages: [{ items: [comment], nextCursor: null }] },
      });
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByTestId('comments-list')).toBeTruthy();
    });

    it('コメントが 0 件のとき空状態メッセージが表示される', () => {
      mockUsePostQuery.mockReturnValue({
        ...defaultPostState,
        isLoading: false,
        data: makePostDetail(),
      });
      mockUseCommentsQuery.mockReturnValue({
        ...defaultCommentsState,
        isLoading: false,
        data: { pages: [{ items: [], nextCursor: null }] },
      });
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByText('まだコメントはありません')).toBeTruthy();
    });
  });

  describe('コメント無限スクロール', () => {
    it('hasNextPage=true のとき onEndReached で fetchNextPage が呼ばれる', () => {
      const fetchNextPage = jest.fn();
      mockUsePostQuery.mockReturnValue({
        ...defaultPostState,
        isLoading: false,
        data: makePostDetail(),
      });
      const comment = makeCommentItem({ id: 'c-1' });
      mockUseCommentsQuery.mockReturnValue({
        ...defaultCommentsState,
        isLoading: false,
        data: { pages: [{ items: [comment], nextCursor: 'cursor-1' }] },
        hasNextPage: true,
        fetchNextPage,
      });
      renderWithProviders(<PostDetailScreen />);
      const list = screen.getByTestId('comments-list');
      fireEvent(list, 'endReached');
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('hasNextPage=false のとき onEndReached で fetchNextPage が呼ばれない', () => {
      const fetchNextPage = jest.fn();
      mockUsePostQuery.mockReturnValue({
        ...defaultPostState,
        isLoading: false,
        data: makePostDetail(),
      });
      const comment = makeCommentItem({ id: 'c-1' });
      mockUseCommentsQuery.mockReturnValue({
        ...defaultCommentsState,
        isLoading: false,
        data: { pages: [{ items: [comment], nextCursor: null }] },
        hasNextPage: false,
        fetchNextPage,
      });
      renderWithProviders(<PostDetailScreen />);
      const list = screen.getByTestId('comments-list');
      fireEvent(list, 'endReached');
      expect(fetchNextPage).not.toHaveBeenCalled();
    });
  });
});
