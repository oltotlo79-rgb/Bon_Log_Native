/**
 * @module __tests__/components/analytics/GenrePerformanceView
 * GenrePerformanceView のコンポーネントテスト。
 * ジャンルの name / postCount 表示と棒グラフ列挙、4状態を確認する。
 * モック境界: useAnalyticsGenrePerformanceQuery（lib/queries/analytics）+ useOnlineStatus
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { GenrePerformanceView } from '@/components/analytics/GenrePerformanceView';
import { ApiError } from '@/lib/api/errors';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockGenreQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsGenrePerformanceQuery: () => mockGenreQuery,
}));

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

function makeGenreData(genres?: {
  name: string;
  postCount: number;
  avgLikes: number;
  avgEngagement: number;
}[]) {
  return {
    genres: genres ?? [
      { name: '松柏類', postCount: 15, avgLikes: 8.5, avgEngagement: 10.2 },
      { name: '雑木類', postCount: 8, avgLikes: 5.0, avgEngagement: 6.3 },
      { name: '草もの', postCount: 3, avgLikes: 2.1, avgEngagement: 2.8 },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockGenreQuery.data = undefined;
  mockGenreQuery.isLoading = false;
  mockGenreQuery.isError = false;
  mockGenreQuery.error = null;
  mockGenreQuery.isFetching = false;
  mockGenreQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('GenrePerformanceView: ローディング状態', () => {
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockGenreQuery.isLoading = true;
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('GenrePerformanceView: エラー状態', () => {
  it('isError=true のとき ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockGenreQuery.isError = true;
    mockGenreQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('403 PREMIUM_REQUIRED のときも ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockGenreQuery.isError = true;
    mockGenreQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'premium required',
    });
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('エラー時の「再試行する」ボタンをタップすると refetch が呼ばれる', async () => {
    mockGenreQuery.isError = true;
    mockGenreQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockGenreQuery.refetch = refetch;

    renderWithProviders(<GenrePerformanceView period={30} />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('GenrePerformanceView: 空状態', () => {
  it('genres が空配列のとき「この期間のジャンルデータがありません」が表示される', () => {
    mockGenreQuery.data = makeGenreData([]);
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText('この期間のジャンルデータがありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('GenrePerformanceView: オフライン状態', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockGenreQuery.data = makeGenreData();
    renderWithProviders(<GenrePerformanceView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner の accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockGenreQuery.data = makeGenreData();
    renderWithProviders(<GenrePerformanceView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ジャンルの name / postCount 表示
// ---------------------------------------------------------------------------

describe('GenrePerformanceView: ジャンルデータの表示', () => {
  beforeEach(() => {
    mockGenreQuery.data = makeGenreData();
  });

  it('「松柏類」の name が表示される', () => {
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText('松柏類')).toBeTruthy();
  });

  it('「雑木類」の name が表示される', () => {
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText('雑木類')).toBeTruthy();
  });

  it('「草もの」の name が表示される', () => {
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText('草もの')).toBeTruthy();
  });

  it('「松柏類」の postCount が「15投稿」として表示される', () => {
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText('15投稿')).toBeTruthy();
  });

  it('「雑木類」の postCount が「8投稿」として表示される', () => {
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText('8投稿')).toBeTruthy();
  });

  it('「松柏類」行のアクセシビリティラベルに postCount が含まれる', () => {
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(
      screen.getByLabelText('松柏類: 投稿 15件, 平均いいね 8.5, 平均エンゲージメント 10.2')
    ).toBeTruthy();
  });

  it('「草もの」行のアクセシビリティラベルに postCount が含まれる', () => {
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(
      screen.getByLabelText('草もの: 投稿 3件, 平均いいね 2.1, 平均エンゲージメント 2.8')
    ).toBeTruthy();
  });

  it('凡例テキスト「平均エンゲージメント（いいね + コメント）の高い順」が表示される', () => {
    renderWithProviders(<GenrePerformanceView period={30} />);
    expect(screen.getByText('平均エンゲージメント（いいね + コメント）の高い順')).toBeTruthy();
  });
});
