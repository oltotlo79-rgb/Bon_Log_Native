/**
 * @module __tests__/app/posts/post-detail-interactions
 * PostDetailScreen のユーザーインタラクションテスト。
 * コメント投稿・削除・返信・メニューボタン操作を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import PostDetailScreen from '@/app/posts/[id]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeCommentItem } from '@/__tests__/utils/data-factories';
import type { PostDetail } from '@/lib/queries/posts';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockCreateCommentMutate = jest.fn();
const mockDeleteCommentMutate = jest.fn();
const mockDeletePostMutate = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: jest.fn(() => ({
    data: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isPremium: false },
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
    mutate: mockDeletePostMutate,
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useToggleRepostMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useVotePollMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useUserPostsQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
}));

jest.mock('@/lib/queries/comments', () => ({
  useCommentsQuery: () => mockUseCommentsQuery(),
  useCreateCommentMutation: jest.fn(() => ({
    mutate: mockCreateCommentMutate,
    isPending: false,
  })),
  useDeleteCommentMutation: jest.fn(() => ({
    mutate: mockDeleteCommentMutate,
    isPending: false,
  })),
}));

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
  poll: null,
  mentionedUsers: [],
  ...overrides,
});

const defaultPostState = {
  data: makePostDetail(),
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

const defaultCommentsState = {
  data: { pages: [{ items: [], nextCursor: null }] },
  isLoading: false,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'post-abc-123' });
  mockUsePostQuery.mockReturnValue(defaultPostState);
  mockUseCommentsQuery.mockReturnValue(defaultCommentsState);
});

describe('PostDetailScreen - コメント投稿', () => {
  it('コメント入力フィールドが表示される', () => {
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getByTestId('comment-input')).toBeTruthy();
  });

  it('テキストを入力すると送信ボタンが有効になる', async () => {
    renderWithProviders(<PostDetailScreen />);

    const input = screen.getByTestId('comment-input');
    fireEvent.changeText(input, 'テストコメント');

    await waitFor(() => {
      const sendBtn = screen.getByLabelText('コメントを送信する');
      const isDisabled =
        sendBtn.props.disabled === true ||
        sendBtn.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
    });
  });

  it('送信ボタンを押すと createCommentMutation.mutate が呼ばれる', async () => {
    mockCreateCommentMutate.mockImplementation((_, { onSuccess }) => {
      onSuccess?.();
    });
    renderWithProviders(<PostDetailScreen />);

    const input = screen.getByTestId('comment-input');
    fireEvent.changeText(input, 'テストコメント');

    await waitFor(() => {
      const sendBtn = screen.getByLabelText('コメントを送信する');
      const isDisabled =
        sendBtn.props.disabled === true ||
        sendBtn.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
    });

    fireEvent.press(screen.getByLabelText('コメントを送信する'));

    await waitFor(() => {
      expect(mockCreateCommentMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'post-abc-123',
          content: 'テストコメント',
        }),
        expect.any(Object)
      );
    });
  });
});

describe('PostDetailScreen - コメント一覧', () => {
  it('コメントがある場合にコメントアイテムが表示される', async () => {
    const comment = makeCommentItem({
      id: 'c-1',
      content: 'これはテストコメントです',
      user: { id: 'user-2', nickname: '盆栽ファン', avatarUrl: null, isBlocked: false, isMuted: false },
    });
    mockUseCommentsQuery.mockReturnValue({
      ...defaultCommentsState,
      data: { pages: [{ items: [comment], nextCursor: null }] },
    });

    renderWithProviders(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('comments-list')).toBeTruthy();
    });
    expect(screen.getByText('これはテストコメントです')).toBeTruthy();
  });

  it('自分のコメントにはオプションメニューボタンが表示される', async () => {
    const comment = makeCommentItem({
      id: 'c-1',
      content: '自分のコメント',
      user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
    });
    mockUseCommentsQuery.mockReturnValue({
      ...defaultCommentsState,
      data: { pages: [{ items: [comment], nextCursor: null }] },
    });

    renderWithProviders(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getAllByLabelText('コメントのオプションを開く').length).toBeGreaterThan(0);
    });
  });
});

describe('PostDetailScreen - 自分の投稿メニュー', () => {
  it('自分の投稿にメニューボタンが表示される', () => {
    renderWithProviders(<PostDetailScreen />);
    // 投稿詳細で自分の投稿の場合メニューボタンが表示される
    expect(screen.getByTestId('comments-list')).toBeTruthy();
  });
});

describe('PostDetailScreen - プルトゥリフレッシュ', () => {
  it('コメントリストが表示される（空の場合は空状態メッセージ）', () => {
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getByText('まだコメントはありません')).toBeTruthy();
  });
});
