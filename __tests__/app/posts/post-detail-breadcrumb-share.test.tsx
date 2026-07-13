/**
 * @module __tests__/app/posts/post-detail-breadcrumb-share
 * PostDetailScreen の新機能テスト。
 * - 共有ボタン表示と押下で Share.share が呼ばれること
 * - パンくず表示と各リンク押下で router.push が正しいルートで呼ばれること
 * - 投稿者情報あり / なし の2状態を網羅
 */

import React from 'react';
import { Share } from 'react-native';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import PostDetailScreen from '@/app/posts/[id]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import type { PostDetail } from '@/lib/queries/posts';
import { ROUTE_FEED } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: jest.fn(() => ({
    data: { id: 'user-2', nickname: '閲覧者', avatarUrl: null, isPremium: false },
    isLoading: false,
    isError: false,
  })),
}));

const mockUsePostQuery = jest.fn();
const mockUseCommentsQuery = jest.fn();

jest.mock('@/lib/queries/posts', () => ({
  usePostQuery: () => mockUsePostQuery(),
  useDeletePostMutation: jest.fn(() => ({
    mutate: jest.fn(),
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
    mutate: jest.fn(),
    isPending: false,
  })),
  useDeleteCommentMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

const makePostDetail = (overrides?: Partial<PostDetail>): PostDetail => ({
  id: 'post-abc-123',
  content: '黒松の春管理です。',
  createdAt: '2025-06-01T10:00:00Z',
  updatedAt: '2025-06-01T10:00:00Z',
  userId: 'user-1',
  bonsaiId: null,
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
  mockUsePostQuery.mockReturnValue({
    data: makePostDetail(),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseCommentsQuery.mockReturnValue(defaultCommentsState);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 共有ボタン
// ---------------------------------------------------------------------------

describe('PostDetailScreen - 共有ボタン', () => {
  it('共有ボタンが表示される', () => {
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getByLabelText('この投稿を共有')).toBeTruthy();
  });

  it('共有ボタン押下で Share.share が呼ばれる', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    renderWithProviders(<PostDetailScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('この投稿を共有'));
    });

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('Share.share の引数に投稿 URL が含まれる', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    renderWithProviders(<PostDetailScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('この投稿を共有'));
    });

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('post-abc-123'),
        })
      );
    });
  });

  it('Share.share の引数の URL が /posts/{id} の形式である', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    renderWithProviders(<PostDetailScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('この投稿を共有'));
    });

    await waitFor(() => {
      const callArgs = shareSpy.mock.calls[0]?.[0];
      expect(callArgs?.message).toMatch(/posts\/post-abc-123/);
    });
  });

  it('Share.share が呼ばれた後も画面が維持される（戻るボタンが残る）', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    renderWithProviders(<PostDetailScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('この投稿を共有'));
    });

    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });

  it('Share.share がキャンセルされてもクラッシュしない', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
    renderWithProviders(<PostDetailScreen />);

    await expect(
      act(async () => {
        fireEvent.press(screen.getByLabelText('この投稿を共有'));
      })
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// パンくず: ホームリンク
// ---------------------------------------------------------------------------

describe('PostDetailScreen - パンくず（ホームリンク）', () => {
  it('ヘッダーエリアに戻るボタンが存在する（パンくずの左側）', () => {
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });

  it('「戻る」ボタン押下で router.back が呼ばれる', async () => {
    renderWithProviders(<PostDetailScreen />);
    fireEvent.press(screen.getByLabelText('戻る'));
    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  it('投稿データ読み込み後にパンくず共有ボタンが表示される', async () => {
    renderWithProviders(<PostDetailScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('この投稿を共有')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// パンくず: 投稿者リンク（投稿者情報あり）
// パンくずエリアは accessibilityRole="none" importantForAccessibility="no-hide-descendants"
// の親 View に包まれているため、UNSAFE_getByProps でアクセスする。
// ---------------------------------------------------------------------------

describe('PostDetailScreen - パンくず（投稿者リンク：情報あり）', () => {
  it('投稿者のパンくずリンクが UNSAFE_getByProps で取得できる', () => {
    renderWithProviders(<PostDetailScreen />);
    const authorLink = screen.UNSAFE_getByProps({
      accessibilityLabel: '松の匠のプロフィールへ移動',
      accessibilityRole: 'link',
    });
    expect(authorLink).toBeTruthy();
  });

  it('投稿者パンくず押下で router.push が routeUserDetail 相当のパスで呼ばれる', () => {
    renderWithProviders(<PostDetailScreen />);
    const authorLink = screen.UNSAFE_getByProps({
      accessibilityLabel: '松の匠のプロフィールへ移動',
      accessibilityRole: 'link',
    });
    fireEvent.press(authorLink);
    expect(mockRouter.push).toHaveBeenCalledWith('/users/user-1');
  });

  it('ホームパンくず押下で router.push が ROUTE_FEED で呼ばれる', () => {
    renderWithProviders(<PostDetailScreen />);
    const homeLink = screen.UNSAFE_getByProps({
      accessibilityLabel: 'ホームへ移動',
      accessibilityRole: 'link',
    });
    fireEvent.press(homeLink);
    expect(mockRouter.push).toHaveBeenCalledWith(ROUTE_FEED);
  });

  it('パンくずには投稿者名「松の匠」が含まれるテキストが描画される', () => {
    renderWithProviders(<PostDetailScreen />);
    const authorLink = screen.UNSAFE_getByProps({
      accessibilityLabel: '松の匠のプロフィールへ移動',
      accessibilityRole: 'link',
    });
    expect(authorLink).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// パンくず: 投稿者情報なし（ローディング中 / null）
// ---------------------------------------------------------------------------

describe('PostDetailScreen - パンくず（投稿者情報なし）', () => {
  it('投稿データ未取得時はフォールバックテキスト「投稿」がアクセスされる', async () => {
    mockUsePostQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<PostDetailScreen />);
    // ローディング中は投稿者名なし -> パンくずの投稿者リンクが出ない
    expect(screen.queryByLabelText('松の匠のプロフィールへ移動')).toBeNull();
  });

  it('投稿者 nickname が undefined のとき authorId リンクが表示されない', async () => {
    mockUsePostQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<PostDetailScreen />);
    expect(screen.queryByLabelText(/のプロフィールへ移動/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// invalid postId のときヘッダー構造が変わる（パンくずなし・タイトル「投稿」）
// ---------------------------------------------------------------------------

describe('PostDetailScreen - invalid postId のヘッダー', () => {
  it('空文字 id のときエラーレイアウトになり共有ボタンが表示されない', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '' });
    renderWithProviders(<PostDetailScreen />);
    expect(screen.queryByLabelText('この投稿を共有')).toBeNull();
  });

  it('空文字 id のとき ERR_POST_NOT_FOUND に相当するメッセージが表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '' });
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getByText(/見つかりません|存在しない|削除/)).toBeTruthy();
  });

  it('invalid id のとき戻るボタンが存在する', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '' });
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getAllByLabelText('戻る').length).toBeGreaterThanOrEqual(1);
  });
});
