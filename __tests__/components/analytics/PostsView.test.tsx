/**
 * @module __tests__/components/analytics/PostsView
 * PostsView のコンポーネントテスト。
 * 4状態（ローディング・空・エラー・オフライン）とサマリ指標・topPosts の表示を確認する。
 * モック境界: useAnalyticsPostsQuery（lib/queries/analytics）+ useOnlineStatus
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { PostsView } from '@/components/analytics/PostsView';
import { ApiError } from '@/lib/api/errors';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockPostsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

// PostsView は前期間比バッジ用に useAnalyticsPeriodComparisonQuery も呼ぶ（読み込み中・失敗時も
// メインクエリの表示分岐には影響しない付随データ）。モックしないと未定義呼び出しで失敗するため必須。
const mockPeriodComparisonQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsPostsQuery: () => mockPostsQuery,
  useAnalyticsPeriodComparisonQuery: () => mockPeriodComparisonQuery,
}));

function makePeriodComparisonData(overrides?: Partial<{
  posts: { current: number; previous: number; change: number | null };
  likes: { current: number; previous: number; change: number | null };
  comments: { current: number; previous: number; change: number | null };
}>) {
  return {
    posts: { current: 42, previous: 30, change: 40 },
    likes: { current: 200, previous: 220, change: -9.1 },
    comments: { current: 50, previous: 50, change: 0 },
    followers: { current: 100, previous: 90, change: 11.1 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

function makePostsData(overrides?: Partial<{
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  avgEngagement: number;
  topPosts: { id: string; content: string; likeCount: number; commentCount: number }[];
}>) {
  return {
    totalPosts: 42,
    totalLikes: 200,
    totalComments: 50,
    avgEngagement: 4.5,
    topPosts: [
      { id: 'p1', content: '黒松の春管理', likeCount: 30, commentCount: 10 },
      { id: 'p2', content: '五葉松の剪定', likeCount: 25, commentCount: 8 },
      { id: 'p3', content: '根洗い', likeCount: 20, commentCount: 5 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockPostsQuery.data = undefined;
  mockPostsQuery.isLoading = false;
  mockPostsQuery.isError = false;
  mockPostsQuery.error = null;
  mockPostsQuery.isFetching = false;
  mockPostsQuery.refetch = jest.fn();
  mockPeriodComparisonQuery.data = undefined;
  mockPeriodComparisonQuery.isLoading = false;
  mockPeriodComparisonQuery.isError = false;
  mockPeriodComparisonQuery.error = null;
  mockPeriodComparisonQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('PostsView: ローディング状態', () => {
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockPostsQuery.isLoading = true;
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('isLoading=true のときサマリ指標が表示されない', () => {
    mockPostsQuery.isLoading = true;
    renderWithProviders(<PostsView period={30} />);
    expect(screen.queryByLabelText('投稿数: 42')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('PostsView: エラー状態', () => {
  it('isError=true のとき ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockPostsQuery.isError = true;
    mockPostsQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('403 PREMIUM_REQUIRED のときも ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockPostsQuery.isError = true;
    mockPostsQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'premium required',
    });
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('エラー時の「再試行する」ボタンをタップすると refetch が呼ばれる', async () => {
    mockPostsQuery.isError = true;
    mockPostsQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockPostsQuery.refetch = refetch;

    renderWithProviders(<PostsView period={30} />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('PostsView: 空状態', () => {
  it('topPosts が空配列のとき「この期間の投稿データがありません」が表示される', () => {
    mockPostsQuery.data = makePostsData({ topPosts: [] });
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByText('この期間の投稿データがありません')).toBeTruthy();
  });

  it('topPosts が空のとき人気投稿リストのセクションタイトルが表示されない', () => {
    mockPostsQuery.data = makePostsData({ topPosts: [] });
    renderWithProviders(<PostsView period={30} />);
    expect(screen.queryByText(/人気投稿トップ/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('PostsView: オフライン状態', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockPostsQuery.data = makePostsData();
    renderWithProviders(<PostsView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner の accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockPostsQuery.data = makePostsData();
    renderWithProviders(<PostsView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// サマリ指標の表示
// ---------------------------------------------------------------------------

describe('PostsView: サマリ指標', () => {
  beforeEach(() => {
    mockPostsQuery.data = makePostsData();
  });

  it('totalPosts（投稿数）が表示される', () => {
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('投稿数: 42')).toBeTruthy();
  });

  it('totalLikes（いいね数）が表示される', () => {
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('いいね: 200')).toBeTruthy();
  });

  it('totalComments（コメント数）が表示される', () => {
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('コメント: 50')).toBeTruthy();
  });

  it('avgEngagement（平均エンゲ）が表示される', () => {
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('平均エンゲ: 4.5')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 前期間比の変化バッジ（useAnalyticsPeriodComparisonQuery）
// ---------------------------------------------------------------------------

describe('PostsView: 前期間比の変化バッジ', () => {
  beforeEach(() => {
    mockPostsQuery.data = makePostsData();
  });

  it('period-comparison が未取得のとき変化バッジは表示されない', () => {
    mockPeriodComparisonQuery.data = undefined;
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('投稿数: 42')).toBeTruthy();
    expect(screen.queryByText(/前期間比/)).toBeNull();
  });

  it('増加時は「投稿数: 42、前期間比+40%」のラベルと + 表記が付く', () => {
    mockPeriodComparisonQuery.data = makePeriodComparisonData();
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('投稿数: 42、前期間比+40%')).toBeTruthy();
    expect(screen.getByText('+40%')).toBeTruthy();
  });

  it('減少時は「いいね: 200、前期間比-9.1%」のラベルが付く（+ を付けない）', () => {
    mockPeriodComparisonQuery.data = makePeriodComparisonData();
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('いいね: 200、前期間比-9.1%')).toBeTruthy();
    expect(screen.getByText('-9.1%')).toBeTruthy();
  });

  it('変化なし（change=0）でもバッジ自体は表示される（+ は付かない）', () => {
    mockPeriodComparisonQuery.data = makePeriodComparisonData();
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('コメント: 50、前期間比0%')).toBeTruthy();
  });

  it('平均エンゲには前期間比データがなくバッジが表示されない', () => {
    mockPeriodComparisonQuery.data = makePeriodComparisonData();
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('平均エンゲ: 4.5')).toBeTruthy();
  });

  it('change が null のときバッジが表示されない', () => {
    mockPeriodComparisonQuery.data = makePeriodComparisonData({
      posts: { current: 42, previous: 42, change: null },
    });
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('投稿数: 42')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// topPosts の表示
// ---------------------------------------------------------------------------

describe('PostsView: topPosts', () => {
  beforeEach(() => {
    mockPostsQuery.data = makePostsData();
  });

  it('1位の投稿がアクセシビリティラベル付きで表示される', () => {
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('1位: いいね30件, コメント10件')).toBeTruthy();
  });

  it('2位の投稿がアクセシビリティラベル付きで表示される', () => {
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('2位: いいね25件, コメント8件')).toBeTruthy();
  });

  it('3位の投稿がアクセシビリティラベル付きで表示される', () => {
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByLabelText('3位: いいね20件, コメント5件')).toBeTruthy();
  });

  it('投稿内容のテキストが表示される', () => {
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByText('黒松の春管理')).toBeTruthy();
  });

  it('content が空文字のとき「(メディア投稿)」が表示される', () => {
    mockPostsQuery.data = makePostsData({
      topPosts: [{ id: 'p-empty', content: '', likeCount: 5, commentCount: 1 }],
    });
    renderWithProviders(<PostsView period={30} />);
    expect(screen.getByText('(メディア投稿)')).toBeTruthy();
  });
});
