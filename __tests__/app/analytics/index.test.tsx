/**
 * app/analytics/index のコンポーネントテスト。
 * プレミアム/非プレミアム両分岐・ローディング・エラー・期間切替を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import AnalyticsScreen from '@/app/analytics/index';
import { ApiError } from '@/lib/api/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockAnalyticsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsSummaryQuery: () => mockAnalyticsQuery,
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeAnalyticsSummary() {
  return {
    posts: {
      total: 42,
      totalLikes: 200,
      totalComments: 50,
      avgEngagement: 4.5,
      topPosts: [
        { id: 'p1', content: '黒松の春管理', likeCount: 30, commentCount: 10 },
        { id: 'p2', content: '五葉松の剪定', likeCount: 25, commentCount: 8 },
        { id: 'p3', content: '根洗い', likeCount: 20, commentCount: 5 },
      ],
    },
    followers: {
      current: 150,
      newInPeriod: 10,
      growth: [
        { date: '2025-05-01', newFollowers: 2 },
        { date: '2025-05-08', newFollowers: 3 },
      ],
    },
    engagementTrend: [
      { date: '2025-05-01', engagement: 15 },
      { date: '2025-05-08', engagement: 20 },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockAnalyticsQuery.data = undefined;
  mockAnalyticsQuery.isLoading = false;
  mockAnalyticsQuery.isError = false;
  mockAnalyticsQuery.error = null;
  mockAnalyticsQuery.isFetching = false;
});

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

describe('AnalyticsScreen ヘッダー', () => {
  it('「投稿分析」ヘッダーが表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByRole('header', { name: '投稿分析' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });

  it('戻るボタンタップで router.back() が呼ばれる', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('戻る'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('AnalyticsScreen ローディング状態', () => {
  it('isLoading=true のとき期間切替バーが表示される', () => {
    mockAnalyticsQuery.isLoading = true;
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('7日間を選択')).toBeTruthy();
    expect(screen.getByLabelText('30日間を選択')).toBeTruthy();
    expect(screen.getByLabelText('90日間を選択')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('AnalyticsScreen エラー状態', () => {
  it('isError=true かつ 403 以外のとき ScreenError が表示される', () => {
    mockAnalyticsQuery.isError = true;
    mockAnalyticsQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'error',
    });
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByText('投稿分析データを読み込めませんでした。')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// プレミアムゲート
// ---------------------------------------------------------------------------

describe('AnalyticsScreen プレミアムゲート', () => {
  it('403 PREMIUM_REQUIRED のとき「プレミアム会員限定です」が表示される', () => {
    mockAnalyticsQuery.isError = true;
    mockAnalyticsQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'Premium required',
    });
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByText('この機能はプレミアム会員限定です')).toBeTruthy();
  });

  it('プレミアムゲートに「プレミアムプランについて」ボタンがある', () => {
    mockAnalyticsQuery.isError = true;
    mockAnalyticsQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'Premium required',
    });
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('プレミアムプランの詳細を見る')).toBeTruthy();
  });

  it('「プレミアムプランについて」タップで subscription 画面へ遷移する', () => {
    mockAnalyticsQuery.isError = true;
    mockAnalyticsQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'Premium required',
    });
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('プレミアムプランの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/subscription');
  });

  it('403 PREMIUM_REQUIRED のとき期間切替バーが表示されない', () => {
    mockAnalyticsQuery.isError = true;
    mockAnalyticsQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'Premium required',
    });
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.queryByLabelText('7日間を選択')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ダッシュボード（プレミアム時）
// ---------------------------------------------------------------------------

describe('AnalyticsScreen ダッシュボード', () => {
  beforeEach(() => {
    mockAnalyticsQuery.data = makeAnalyticsSummary();
  });

  it('投稿数が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('投稿数: 42')).toBeTruthy();
  });

  it('いいね数が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('いいね: 200')).toBeTruthy();
  });

  it('コメント数が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('コメント: 50')).toBeTruthy();
  });

  it('人気投稿が最大3件表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('1位: いいね30件')).toBeTruthy();
    expect(screen.getByLabelText('2位: いいね25件')).toBeTruthy();
    expect(screen.getByLabelText('3位: いいね20件')).toBeTruthy();
  });

  it('人気投稿タップで投稿詳細へ遷移する', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('1位: いいね30件'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/posts/[id]',
      params: { id: 'p1' },
    });
  });

  it('topPosts が空のとき「人気投稿トップ 3」セクションが表示されない', () => {
    mockAnalyticsQuery.data = {
      ...makeAnalyticsSummary(),
      posts: { ...makeAnalyticsSummary().posts, topPosts: [] },
    };
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.queryByText('人気投稿トップ 3')).toBeNull();
  });

  it('フォロワー数が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByText('150人')).toBeTruthy();
  });

  it('期間内フォロワー増加数が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByText('+10人')).toBeTruthy();
  });

  it('フォロワー推移グラフが表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('30日間のフォロワー推移グラフ')).toBeTruthy();
  });

  it('エンゲージメント推移グラフが表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('30日間のエンゲージメント推移グラフ')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 期間切替
// ---------------------------------------------------------------------------

describe('AnalyticsScreen 期間切替', () => {
  it('デフォルトで「30日間」が選択状態になっている', () => {
    renderWithProviders(<AnalyticsScreen />);
    const btn = screen.getByLabelText('30日間を選択');
    expect(btn.props.accessibilityState?.selected).toBe(true);
  });

  it('「7日間」ボタンをタップすると選択状態が変わる', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('7日間を選択'));
    expect(screen.getByLabelText('7日間を選択').props.accessibilityState?.selected).toBe(true);
    expect(screen.getByLabelText('30日間を選択').props.accessibilityState?.selected).toBe(false);
  });

  it('「90日間」ボタンをタップすると選択状態が変わる', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('90日間を選択'));
    expect(screen.getByLabelText('90日間を選択').props.accessibilityState?.selected).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('AnalyticsScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<AnalyticsScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner に ERR_OFFLINE メッセージが表示されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    renderWithProviders(<AnalyticsScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// リフレッシュ
// ---------------------------------------------------------------------------

describe('AnalyticsScreen リフレッシュ', () => {
  it('エラー時の「再試行」ボタンが refetch を呼ぶ', async () => {
    mockAnalyticsQuery.isError = true;
    mockAnalyticsQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockAnalyticsQuery.refetch = refetch;

    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});
