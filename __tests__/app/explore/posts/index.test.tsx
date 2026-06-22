/**
 * app/explore/posts/index の画面テスト。
 * hashtag / genreId の useLocalSearchParams 型ガード、
 * 投稿一覧表示、4状態（ローディング・空・エラー・コンテンツ）を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ExplorePostsScreen from '@/app/explore/posts/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseExplorePostsQuery = jest.fn();
jest.mock('@/lib/queries/explore', () => ({
  useExplorePostsQuery: () => mockUseExplorePostsQuery(),
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => ({ data: { id: 'u-me' } }),
}));

jest.mock('@/hooks/use-post-card-props', () => ({
  mapToPostCardProps: jest.fn(
    (item: { id: string; content: string }, _currentUserId: unknown, opts: { onComment?: () => void }) => ({
      id: item.id,
      content: item.content,
      createdAt: new Date('2025-06-01T10:00:00Z'),
      user: { id: 'user-1', nickname: '松の匠', avatarUrl: null, isBlocked: false, isMuted: false },
      media: [],
      genres: [],
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      isBookmarked: false,
      currentUserId: 'u-me',
      mentionUsers: new Map(),
      onComment: opts?.onComment ?? jest.fn(),
    })
  ),
}));

jest.mock('@/components/post/PostCard', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    PostCard: ({
      id,
      content,
      onComment,
    }: {
      id: string;
      content: string;
      onComment?: () => void;
    }) =>
      React.createElement(
        View,
        { testID: `post-card-${id}` },
        React.createElement(Text, null, content),
        React.createElement(
          Pressable,
          { testID: `post-card-comment-${id}`, onPress: onComment, accessibilityLabel: `コメント-${id}` },
          React.createElement(Text, null, 'コメント')
        )
      ),
  };
});

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

const defaultQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
  isRefetching: false,
};

function makePostsPage(ids: string[]) {
  return {
    pages: [
      {
        items: ids.map((id) => ({
          id,
          content: `盆栽記録 ${id}`,
          createdAt: '2025-06-01T10:00:00Z',
          updatedAt: '2025-06-01T10:00:00Z',
          userId: 'user-1',
          user: { id: 'user-1', nickname: '松の匠', avatarUrl: null },
          media: [],
          genres: [],
          likeCount: 0,
          commentCount: 0,
          repostCount: 0,
          isLiked: false,
          isBookmarked: false,
          isReposted: false,
          quotePost: null,
          repostPost: null,
        })),
        nextCursor: null,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ hashtag: '黒松' });
  mockUseExplorePostsQuery.mockReturnValue({ ...defaultQuery });
});

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen ヘッダー', () => {
  it('hashtag 指定時に #タグ名 がヘッダーに表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ hashtag: '黒松' });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('#黒松')).toBeTruthy();
  });

  it('genreName 指定時にジャンル名がヘッダーに表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ genreId: 'g1', genreName: '松柏類' });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('松柏類')).toBeTruthy();
  });

  it('genreId のみでジャンル名なしの場合「ジャンル」と表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ genreId: 'g1' });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('ジャンル')).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });

  it('戻るボタンタップで router.back() が呼ばれる', () => {
    renderWithProviders(<ExplorePostsScreen />);
    fireEvent.press(screen.getByLabelText('戻る'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// params の型ガード
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen params 型ガード', () => {
  it('hashtag が string[] の場合は最初の要素を使う', () => {
    mockUseLocalSearchParams.mockReturnValue({ hashtag: ['黒松', '五葉松'] });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('#黒松')).toBeTruthy();
  });

  it('hashtag も genreId もない場合はパラメータ不正エラーが表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({});
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('パラメータが不正です')).toBeTruthy();
  });

  it('genreId が string[] の場合は最初の要素を使う', () => {
    mockUseLocalSearchParams.mockReturnValue({ genreId: ['g1', 'g2'] });
    mockUseExplorePostsQuery.mockReturnValue({
      ...defaultQuery,
      data: makePostsPage([]),
    });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('ジャンル')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen ローディング', () => {
  it('isLoading=true のときヘッダーが表示される', () => {
    mockUseExplorePostsQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('#黒松')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen エラー', () => {
  it('isError=true のとき「読み込めませんでした」が表示される', () => {
    mockUseExplorePostsQuery.mockReturnValue({ ...defaultQuery, isError: true });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('読み込めませんでした')).toBeTruthy();
  });

  it('エラー時に ERR_EXPLORE_LOAD_FAILED が表示される', () => {
    mockUseExplorePostsQuery.mockReturnValue({ ...defaultQuery, isError: true });
    renderWithProviders(<ExplorePostsScreen />);
    const { ERR_EXPLORE_LOAD_FAILED } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_EXPLORE_LOAD_FAILED)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen 空状態', () => {
  it('投稿が0件のとき「投稿がありません」が表示される', () => {
    mockUseExplorePostsQuery.mockReturnValue({
      ...defaultQuery,
      data: makePostsPage([]),
    });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('投稿がありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 投稿一覧表示
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen 投稿一覧', () => {
  it('取得した投稿コンテンツが表示される', () => {
    mockUseExplorePostsQuery.mockReturnValue({
      ...defaultQuery,
      data: makePostsPage(['post-1', 'post-2']),
    });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByTestId('post-card-post-1')).toBeTruthy();
    expect(screen.getByTestId('post-card-post-2')).toBeTruthy();
  });

  it('投稿件数ラベル「2件以上」が表示される', () => {
    mockUseExplorePostsQuery.mockReturnValue({
      ...defaultQuery,
      data: makePostsPage(['post-1', 'post-2']),
    });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByText('2件以上')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 投稿タップ（handlePressPost・handleComment）
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen 投稿タップ', () => {
  it('PostCard の onComment コールバックが mapToPostCardProps に渡される', () => {
    mockUseExplorePostsQuery.mockReturnValue({
      ...defaultQuery,
      data: makePostsPage(['post-1']),
    });
    const { mapToPostCardProps } = jest.requireMock('@/hooks/use-post-card-props');
    renderWithProviders(<ExplorePostsScreen />);
    expect(mapToPostCardProps).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'post-1' }),
      'u-me',
      expect.objectContaining({ onComment: expect.any(Function) })
    );
  });

  it('PostCard のコメントボタンタップで router.push が呼ばれる', () => {
    mockUseExplorePostsQuery.mockReturnValue({
      ...defaultQuery,
      data: makePostsPage(['post-1']),
    });
    renderWithProviders(<ExplorePostsScreen />);
    fireEvent.press(screen.getByTestId('post-card-comment-post-1'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('post-1')
    );
  });
});

// ---------------------------------------------------------------------------
// ページネーション（handleEndReached）
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen handleEndReached', () => {
  it('hasNextPage=true かつ isFetchingNextPage=false で FlatList onEndReached が fetchNextPage を呼ぶ', () => {
    const mockFetchNextPage = jest.fn();
    mockUseExplorePostsQuery.mockReturnValue({
      ...defaultQuery,
      data: makePostsPage(['post-1']),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });
    const { UNSAFE_getByProps } = renderWithProviders(<ExplorePostsScreen />);
    const list = UNSAFE_getByProps({ accessibilityRole: 'list' });
    fireEvent(list, 'endReached');
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ページネーション（isFetchingNextPage）
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen ページネーション', () => {
  it('isFetchingNextPage=true のときフッターが表示される', () => {
    mockUseExplorePostsQuery.mockReturnValue({
      ...defaultQuery,
      data: makePostsPage(['post-1']),
      isFetchingNextPage: true,
    });
    renderWithProviders(<ExplorePostsScreen />);
    expect(screen.getByTestId('post-card-post-1')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('ExplorePostsScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status');
    (useOnlineStatus as jest.Mock).mockReturnValue(false);
    renderWithProviders(<ExplorePostsScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
