/**
 * app/analytics/index のコンポーネントテスト（陳腐化修正版）。
 * 現実装は useCurrentUserQuery の isPremium で分岐する。
 * analytics-dashboard.test.tsx が詳細なタブ切替・期間切替を網羅しているため、
 * このファイルはヘッダー・ローディング・ゲート・エラー状態の代表ケースに絞る。
 * 重複を排してスイートを green に保つ。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import AnalyticsScreen from '@/app/analytics/index';

// ---------------------------------------------------------------------------
// ビューコンポーネントをスタブ化（子クエリへの依存を切り離す）
// ---------------------------------------------------------------------------

jest.mock('@/components/analytics/PostsView', () => ({
  PostsView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `posts-view-${period}` }, `PostsView ${period}`);
  },
}));

jest.mock('@/components/analytics/PeriodComparisonView', () => ({
  PeriodComparisonView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `comparison-view-${period}` }, `PeriodComparisonView ${period}`);
  },
}));

jest.mock('@/components/analytics/GenrePerformanceView', () => ({
  GenrePerformanceView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `genre-view-${period}` }, `GenrePerformanceView ${period}`);
  },
}));

jest.mock('@/components/analytics/KeywordsView', () => ({
  KeywordsView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `keywords-view-${period}` }, `KeywordsView ${period}`);
  },
}));

jest.mock('@/components/analytics/LikesView', () => ({
  LikesView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `likes-view-${period}` }, `LikesView ${period}`);
  },
}));

jest.mock('@/components/analytics/EngagementTrendView', () => ({
  EngagementTrendView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `engagement-view-${period}` }, `EngagementTrendView ${period}`);
  },
}));

jest.mock('@/components/analytics/FollowerGrowthView', () => ({
  FollowerGrowthView: ({ period }: { period: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `followers-view-${period}` }, `FollowerGrowthView ${period}`);
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
// useCurrentUserQuery モック（現実装の isPremium 判定に追従）
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
// ローディング状態（isUserLoading=true のとき ScreenLoading を表示）
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

  it('isLoading=true のとき期間切替バーが表示されない', () => {
    mockCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.queryByLabelText('7日を選択')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 非プレミアム（isPremium=false）—— プレミアムゲート
// ---------------------------------------------------------------------------

describe('AnalyticsScreen プレミアムゲート', () => {
  beforeEach(() => {
    mockCurrentUserQuery.mockReturnValue({
      data: { isPremium: false },
      isLoading: false,
      isError: false,
    });
  });

  it('「この機能はプレミアム会員限定です」が表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByText('この機能はプレミアム会員限定です')).toBeTruthy();
  });

  it('「プレミアムプランの詳細を見る」ボタンがある', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('プレミアムプランの詳細を見る')).toBeTruthy();
  });

  it('「プレミアムプランの詳細を見る」タップで subscription 画面へ遷移する', () => {
    renderWithProviders(<AnalyticsScreen />);
    fireEvent.press(screen.getByLabelText('プレミアムプランの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/subscription');
  });

  it('外部決済・Stripe への導線が一切表示されない', () => {
    renderWithProviders(<AnalyticsScreen />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).not.toMatch(/stripe/i);
    expect(json).not.toMatch(/外部決済/i);
  });

  it('ダッシュボード（期間切替バー）が表示されない', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.queryByLabelText('7日を選択')).toBeNull();
    expect(screen.queryByLabelText('30日を選択')).toBeNull();
    expect(screen.queryByLabelText('90日を選択')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// データなし（data=undefined, isLoading=false）—— プレミアム判定が false 相当
// ---------------------------------------------------------------------------

describe('AnalyticsScreen: data=undefined（非認証またはロード前）', () => {
  it('data が undefined のとき isPremium が false 扱いとなりゲートが表示される', () => {
    mockCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByText('この機能はプレミアム会員限定です')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// プレミアム時はダッシュボードが表示される
// ---------------------------------------------------------------------------

describe('AnalyticsScreen: isPremium=true', () => {
  beforeEach(() => {
    mockCurrentUserQuery.mockReturnValue({
      data: { isPremium: true },
      isLoading: false,
      isError: false,
    });
  });

  it('期間切替バーが表示される', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByLabelText('7日を選択')).toBeTruthy();
    expect(screen.getByLabelText('30日を選択')).toBeTruthy();
    expect(screen.getByLabelText('90日を選択')).toBeTruthy();
  });

  it('プレミアムゲートが表示されない', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.queryByText('この機能はプレミアム会員限定です')).toBeNull();
  });

  it('デフォルトで「投稿」ビューが表示される（period=30）', () => {
    renderWithProviders(<AnalyticsScreen />);
    expect(screen.getByTestId('posts-view-30')).toBeTruthy();
  });
});
