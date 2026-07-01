/**
 * @module __tests__/app/analytics/analytics-dashboard
 * AnalyticsScreen のコンポーネントテスト。
 * プレミアム判定・期間切替・タブ切替・引用タブの period 非依存を確認する。
 * モック境界: useCurrentUserQuery（lib/queries/auth）+ 各ビューコンポーネント（子依存を切り離す）
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import AnalyticsScreen from '@/app/analytics/index';

// ---------------------------------------------------------------------------
// コンポーネントビューをスタブ化（子クエリへの依存を切り離す）
// ---------------------------------------------------------------------------

jest.mock('@/components/analytics/PostsView', () => ({
  PostsView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `posts-view-period-${period}` }, `PostsView period=${period}`);
  },
}));

jest.mock('@/components/analytics/PeriodComparisonView', () => ({
  PeriodComparisonView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `comparison-view-period-${period}` }, `PeriodComparisonView period=${period}`);
  },
}));

jest.mock('@/components/analytics/GenrePerformanceView', () => ({
  GenrePerformanceView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `genre-view-period-${period}` }, `GenrePerformanceView period=${period}`);
  },
}));

jest.mock('@/components/analytics/KeywordsView', () => ({
  KeywordsView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `keywords-view-period-${period}` }, `KeywordsView period=${period}`);
  },
}));

jest.mock('@/components/analytics/LikesView', () => ({
  LikesView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `likes-view-period-${period}` }, `LikesView period=${period}`);
  },
}));

jest.mock('@/components/analytics/EngagementTrendView', () => ({
  EngagementTrendView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `engagement-view-period-${period}` }, `EngagementTrendView period=${period}`);
  },
}));

jest.mock('@/components/analytics/FollowerGrowthView', () => ({
  FollowerGrowthView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `followers-view-period-${period}` }, `FollowerGrowthView period=${period}`);
  },
}));

jest.mock('@/components/analytics/QuotesView', () => ({
  QuotesView: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'quotes-view' }, 'QuotesView');
  },
}));

// ---------------------------------------------------------------------------
// useCurrentUserQuery モック
// ---------------------------------------------------------------------------

const mockCurrentUserQuery = jest.fn(() => ({
  data: undefined as { isPremium?: boolean } | undefined,
  isLoading: false,
  isError: false,
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: () => mockCurrentUserQuery(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUserQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
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
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 非プレミアム（isPremium=false）
// ---------------------------------------------------------------------------

describe('AnalyticsScreen: isPremium=false', () => {
  beforeEach(() => {
    mockCurrentUserQuery.mockReturnValue({
      data: { isPremium: false },
      isLoading: false,
      isError: false,
    });
  });

  it('「プレミアム会員限定です」メッセージが表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByText('この機能はプレミアム会員限定です')).toBeTruthy();
  });

  it('プレミアム誘導ボタンが表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('プレミアムプランの詳細を見る')).toBeTruthy();
  });

  it('プレミアム誘導ボタンタップで subscription 画面へ遷移する', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('プレミアムプランの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/subscription');
  });

  it('外部決済（Stripe）へのリンクは表示されない', () => {
    renderWithProviders(<AnalyticsScreen />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).not.toMatch(/stripe/i);
    expect(json).not.toMatch(/stripe\.com/i);
    expect(json).not.toMatch(/外部決済/i);
  });

  it('ダッシュボード本体（期間切替）が表示されない', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.queryByLabelText('7日を選択')).toBeNull();
    expect(screen.queryByLabelText('30日を選択')).toBeNull();
    expect(screen.queryByLabelText('90日を選択')).toBeNull();
  });

  it('ビュータブが表示されない', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.queryByLabelText('投稿ビュー')).toBeNull();
    expect(screen.queryByLabelText('期間比較ビュー')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// プレミアム（isPremium=true）
// ---------------------------------------------------------------------------

describe('AnalyticsScreen: isPremium=true', () => {
  beforeEach(() => {
    mockCurrentUserQuery.mockReturnValue({
      data: { isPremium: true },
      isLoading: false,
      isError: false,
    });
  });

  it('ダッシュボード（期間切替バー）が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('7日を選択')).toBeTruthy();
    expect(screen.getByLabelText('30日を選択')).toBeTruthy();
    expect(screen.getByLabelText('90日を選択')).toBeTruthy();
  });

  it('ビュータブが表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('投稿ビュー')).toBeTruthy();
    expect(screen.getByLabelText('期間比較ビュー')).toBeTruthy();
    expect(screen.getByLabelText('ジャンルビュー')).toBeTruthy();
    expect(screen.getByLabelText('キーワードビュー')).toBeTruthy();
  });

  it('プレミアム誘導UIが表示されない', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.queryByText('この機能はプレミアム会員限定です')).toBeNull();
  });

  it('デフォルトで「投稿」ビューが表示される（period=30）', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByTestId('posts-view-period-30')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 期間切替（isPremium=true）
// ---------------------------------------------------------------------------

describe('AnalyticsScreen: 期間切替', () => {
  beforeEach(() => {
    mockCurrentUserQuery.mockReturnValue({
      data: { isPremium: true },
      isLoading: false,
      isError: false,
    });
  });

  it('デフォルトで「30日」が選択状態', () => {
    renderWithProviders(<AnalyticsScreen />);
    const btn30 = screen.getByLabelText('30日を選択');
    expect(btn30.props.accessibilityState?.selected).toBe(true);
  });

  it('「7日」ボタンをタップすると選択状態が変わる', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('7日を選択'));
    expect(screen.getByLabelText('7日を選択').props.accessibilityState?.selected).toBe(true);
    expect(screen.getByLabelText('30日を選択').props.accessibilityState?.selected).toBe(false);
  });

  it('「90日」ボタンをタップすると選択状態が変わる', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('90日を選択'));
    expect(screen.getByLabelText('90日を選択').props.accessibilityState?.selected).toBe(true);
  });

  it('「7日」に切替えると PostsView に days=7 が渡される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('7日を選択'));
    expect(screen.getByTestId('posts-view-period-7')).toBeTruthy();
  });

  it('「90日」に切替えると PostsView に days=90 が渡される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('90日を選択'));
    expect(screen.getByTestId('posts-view-period-90')).toBeTruthy();
  });

  it('「30日」から「7日」に切替えると PeriodComparisonView にも days=7 が渡される', () => {
    renderWithProviders(<AnalyticsScreen />);
    // 比較ビューに切替
    fireEvent.press(screen.getByLabelText('期間比較ビュー'));
    // 期間を 7日 に切替
    fireEvent.press(screen.getByLabelText('7日を選択'));
    expect(screen.getByTestId('comparison-view-period-7')).toBeTruthy();
  });

  it('「30日」から「90日」に切替えると GenrePerformanceView にも days=90 が渡される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('ジャンルビュー'));
    fireEvent.press(screen.getByLabelText('90日を選択'));
    expect(screen.getByTestId('genre-view-period-90')).toBeTruthy();
  });

  it('「30日」から「7日」に切替えると KeywordsView にも days=7 が渡される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('キーワードビュー'));
    fireEvent.press(screen.getByLabelText('7日を選択'));
    expect(screen.getByTestId('keywords-view-period-7')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タブ切替（isPremium=true）
// ---------------------------------------------------------------------------

describe('AnalyticsScreen: タブ切替', () => {
  beforeEach(() => {
    mockCurrentUserQuery.mockReturnValue({
      data: { isPremium: true },
      isLoading: false,
      isError: false,
    });
  });

  it('「期間比較」タブをタップすると PeriodComparisonView が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('期間比較ビュー'));
    expect(screen.getByTestId('comparison-view-period-30')).toBeTruthy();
  });

  it('「ジャンル」タブをタップすると GenrePerformanceView が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('ジャンルビュー'));
    expect(screen.getByTestId('genre-view-period-30')).toBeTruthy();
  });

  it('「キーワード」タブをタップすると KeywordsView が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('キーワードビュー'));
    expect(screen.getByTestId('keywords-view-period-30')).toBeTruthy();
  });

  it('「いいね」タブをタップすると LikesView が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('いいねビュー'));
    expect(screen.getByTestId('likes-view-period-30')).toBeTruthy();
  });

  it('「推移」タブをタップすると EngagementTrendView が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('推移ビュー'));
    expect(screen.getByTestId('engagement-view-period-30')).toBeTruthy();
  });

  it('「フォロワー」タブをタップすると FollowerGrowthView が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('フォロワービュー'));
    expect(screen.getByTestId('followers-view-period-30')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 引用タブ（period の影響を受けない）
// ---------------------------------------------------------------------------

describe('AnalyticsScreen: 引用タブ', () => {
  beforeEach(() => {
    mockCurrentUserQuery.mockReturnValue({
      data: { isPremium: true },
      isLoading: false,
      isError: false,
    });
  });

  it('「引用」タブをタップすると QuotesView が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('引用ビュー'));
    expect(screen.getByTestId('quotes-view')).toBeTruthy();
  });

  it('引用タブ選択中に期間を切替えても QuotesView は period を受け取らない（period非依存）', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('引用ビュー'));
    // 期間切替しても quotes-view は testID に period を含まない
    fireEvent.press(screen.getByLabelText('7日を選択'));
    expect(screen.getByTestId('quotes-view')).toBeTruthy();
    // period 付きの quotes-view testID が存在しないことを確認
    expect(screen.queryByTestId('quotes-view-period-7')).toBeNull();
  });

  it('引用タブ選択中に「90日」へ切替えても QuotesView が消えない', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('引用ビュー'));
    fireEvent.press(screen.getByLabelText('90日を選択'));
    expect(screen.getByTestId('quotes-view')).toBeTruthy();
  });
});
