/**
 * @module __tests__/app/posts/post-edit-extended
 * PostEditScreen の追加テスト。
 * 認証済み + 投稿取得成功時の正常描画を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import PostEditScreen from '@/app/posts/[id]/edit/index';
import type { PostDetail } from '@/lib/queries/posts';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

const mockUseCurrentUserQuery = jest.fn();
const mockUsePostQuery = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/lib/queries/posts', () => ({
  ...jest.requireActual('@/lib/queries/posts'),
  usePostQuery: () => mockUsePostQuery(),
  useUpdatePostMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useDeletePostMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

// PostComposer はモックして描画確認のみ行う
jest.mock('@/components/post/PostComposer', () => ({
  PostComposer: ({ mode, currentUserId, postId }: { mode: string; currentUserId: string; postId?: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock ファクトリ内では ESM import が使えないため require を使用する（Jest 制約）
    const { View, Text } = require('react-native');
    return (
      <View>
        <Text testID="post-composer-edit">{`mode=${mode} userId=${currentUserId} postId=${postId ?? ''}`}</Text>
      </View>
    );
  },
}));

const ME_DATA = { id: 'user-1', email: 'test@bon-log.com', nickname: '松の匠', isPremium: false };

const MOCK_POST: PostDetail = {
  id: 'post-abc-123',
  content: '既存の投稿内容',
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
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'post-abc-123' });
});

describe('PostEditScreen - 正常系', () => {
  it('認証済み + 投稿取得成功時に PostComposer が edit モードで表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: ME_DATA,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUsePostQuery.mockReturnValue({
      data: MOCK_POST,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderWithProviders(<PostEditScreen />);

    expect(screen.getByTestId('post-composer-edit')).toBeTruthy();
    expect(screen.getByText(/mode=edit/)).toBeTruthy();
    expect(screen.getByText(/userId=user-1/)).toBeTruthy();
    expect(screen.getByText(/postId=post-abc-123/)).toBeTruthy();
  });

  it('ユーザー認証エラー時にエラー画面が表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });
    mockUsePostQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderWithProviders(<PostEditScreen />);
    expect(screen.getByText('ログインが必要です')).toBeTruthy();
  });

  it('投稿取得エラー時にエラー画面が表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: ME_DATA,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUsePostQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });

    renderWithProviders(<PostEditScreen />);
    expect(screen.getByText('投稿が見つかりません')).toBeTruthy();
  });

  it('me が undefined の場合にエラー画面が表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUsePostQuery.mockReturnValue({
      data: MOCK_POST,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderWithProviders(<PostEditScreen />);
    expect(screen.getByText('ログインが必要です')).toBeTruthy();
  });

  it('ユーザー認証エラー時に再試行ボタンを押すと refetchMe が呼ばれる', () => {
    const mockRefetchMe = jest.fn();
    mockUseCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetchMe,
    });
    mockUsePostQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderWithProviders(<PostEditScreen />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    expect(mockRefetchMe).toHaveBeenCalled();
  });

  it('投稿取得エラー時に再試行ボタンを押すと refetchPost が呼ばれる', () => {
    const mockRefetchPost = jest.fn();
    mockUseCurrentUserQuery.mockReturnValue({
      data: ME_DATA,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUsePostQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetchPost,
    });

    renderWithProviders(<PostEditScreen />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    expect(mockRefetchPost).toHaveBeenCalled();
  });

  it('メディア付き投稿の場合も PostComposer が表示される', () => {
    const postWithMedia: PostDetail = {
      ...MOCK_POST,
      media: [
        { id: 'm-1', type: 'image', url: 'https://cdn.bon-log.com/img1.jpg', sortOrder: 0 },
        { id: 'm-2', type: 'video', url: 'https://cdn.bon-log.com/vid1.mp4', sortOrder: 1 },
      ],
    };
    mockUseCurrentUserQuery.mockReturnValue({
      data: ME_DATA,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUsePostQuery.mockReturnValue({
      data: postWithMedia,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderWithProviders(<PostEditScreen />);
    expect(screen.getByTestId('post-composer-edit')).toBeTruthy();
  });
});
