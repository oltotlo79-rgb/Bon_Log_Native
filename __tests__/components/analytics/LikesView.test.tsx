/**
 * @module __tests__/components/analytics/LikesView
 * LikesView のコンポーネントテスト。
 * 4状態（ローディング・エラー・空・データあり）と
 * totalLikes / hourlyData 棒グラフ / weekdayData 棒グラフ /
 * peakHour・peakWeekday 強調表示を確認する。
 * モック境界: useAnalyticsLikesQuery（lib/queries/analytics）+ useOnlineStatus
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { LikesView } from '@/components/analytics/LikesView';
import { ApiError } from '@/lib/api/errors';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockLikesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsLikesQuery: () => mockLikesQuery,
}));

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

function makeLikesData(overrides?: {
  totalLikes?: number;
  peakHour?: number;
  peakWeekday?: number;
  hourlyData?: number[];
  weekdayData?: number[];
}) {
  const hourlyData = overrides?.hourlyData ?? Array.from({ length: 24 }, (_, i) => i === 14 ? 50 : 10);
  const weekdayData = overrides?.weekdayData ?? [20, 30, 25, 40, 35, 60, 45];
  return {
    totalLikes: overrides?.totalLikes ?? 300,
    peakHour: overrides?.peakHour ?? 14,
    peakWeekday: overrides?.peakWeekday ?? 5,
    hourlyData,
    weekdayData,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockLikesQuery.data = undefined;
  mockLikesQuery.isLoading = false;
  mockLikesQuery.isError = false;
  mockLikesQuery.error = null;
  mockLikesQuery.isFetching = false;
  mockLikesQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('LikesView: ローディング状態', () => {
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockLikesQuery.isLoading = true;
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('isLoading=true のとき総いいね数が表示されない', () => {
    mockLikesQuery.isLoading = true;
    renderWithProviders(<LikesView period={30} />);
    expect(screen.queryByText('300')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('LikesView: エラー状態', () => {
  it('isError=true のとき ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockLikesQuery.isError = true;
    mockLikesQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('403 PREMIUM_REQUIRED のときも ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockLikesQuery.isError = true;
    mockLikesQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'premium required',
    });
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('エラー時の「再試行する」ボタンをタップすると refetch が呼ばれる', async () => {
    mockLikesQuery.isError = true;
    mockLikesQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockLikesQuery.refetch = refetch;

    renderWithProviders(<LikesView period={30} />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態（totalLikes=0）
// ---------------------------------------------------------------------------

describe('LikesView: 空状態', () => {
  it('totalLikes=0 のとき「この期間のいいねデータがありません」が表示される', () => {
    mockLikesQuery.data = makeLikesData({
      totalLikes: 0,
      hourlyData: Array(24).fill(0),
      weekdayData: Array(7).fill(0),
    });
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('この期間のいいねデータがありません')).toBeTruthy();
  });

  it('totalLikes=0 のとき総いいね数カードが表示されない', () => {
    mockLikesQuery.data = makeLikesData({
      totalLikes: 0,
      hourlyData: Array(24).fill(0),
      weekdayData: Array(7).fill(0),
    });
    renderWithProviders(<LikesView period={30} />);
    expect(screen.queryByText('総いいね数')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('LikesView: オフライン状態', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockLikesQuery.data = makeLikesData();
    renderWithProviders(<LikesView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner の accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockLikesQuery.data = makeLikesData();
    renderWithProviders(<LikesView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// サマリ表示（totalLikes・peakHour・peakWeekday）
// ---------------------------------------------------------------------------

describe('LikesView: サマリ表示', () => {
  beforeEach(() => {
    mockLikesQuery.data = makeLikesData();
  });

  it('「総いいね数」ラベルが表示される', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('総いいね数')).toBeTruthy();
  });

  it('totalLikes の数値が表示される', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('300')).toBeTruthy();
  });

  it('「ベスト投稿時間」ラベルが表示される', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('ベスト投稿時間')).toBeTruthy();
  });

  it('「ベスト曜日」ラベルが表示される', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('ベスト曜日')).toBeTruthy();
  });

  it('peakHour の時刻テキストが含まれる', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('14:00 – 15:00')).toBeTruthy();
  });

  it('peakWeekday の曜日テキストが含まれる（5=金）', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('金曜日')).toBeTruthy();
  });

  it('peakHour に対応する時間帯バーが「ピーク」ラベルを持つ', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByLabelText('14時: 50いいね（ピーク）')).toBeTruthy();
  });

  it('peakWeekday に対応する曜日バーが「ピーク」ラベルを持つ（5=金）', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByLabelText('金曜日: 60いいね（ピーク）')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 時間帯・曜日棒グラフ
// ---------------------------------------------------------------------------

describe('LikesView: 棒グラフ', () => {
  beforeEach(() => {
    mockLikesQuery.data = makeLikesData();
  });

  it('時間帯別いいね棒グラフが表示される', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByLabelText('時間帯別いいね棒グラフ')).toBeTruthy();
  });

  it('曜日別いいね棒グラフが表示される', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByLabelText('曜日別いいね棒グラフ')).toBeTruthy();
  });

  it('時間帯別いいねのセクションタイトルが表示される', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('時間帯別いいね（0〜23時）')).toBeTruthy();
  });

  it('曜日別いいねのセクションタイトルが表示される', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('曜日別いいね')).toBeTruthy();
  });

  it('peakHour 以外の時間帯バーにはピーク表記がない', () => {
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByLabelText('0時: 10いいね')).toBeTruthy();
    expect(screen.queryByLabelText('0時: 10いいね（ピーク）')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 境界値
// ---------------------------------------------------------------------------

describe('LikesView: 境界値', () => {
  it('totalLikes=1 （最小値）のときサマリが表示される', () => {
    mockLikesQuery.data = makeLikesData({
      totalLikes: 1,
      hourlyData: Array.from({ length: 24 }, (_, i) => i === 0 ? 1 : 0),
      weekdayData: [1, 0, 0, 0, 0, 0, 0],
      peakHour: 0,
      peakWeekday: 0,
    });
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('総いいね数')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('peakHour=0 のとき「0:00 – 1:00」が表示される', () => {
    mockLikesQuery.data = makeLikesData({
      totalLikes: 10,
      hourlyData: Array.from({ length: 24 }, (_, i) => i === 0 ? 10 : 1),
      weekdayData: [5, 3, 2, 4, 1, 2, 3],
      peakHour: 0,
      peakWeekday: 0,
    });
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('0:00 – 1:00')).toBeTruthy();
  });

  it('peakWeekday=0 のとき「日曜日」が表示される', () => {
    mockLikesQuery.data = makeLikesData({
      totalLikes: 10,
      hourlyData: Array.from({ length: 24 }, (_, i) => i === 12 ? 10 : 1),
      weekdayData: [10, 3, 2, 4, 1, 2, 3],
      peakHour: 12,
      peakWeekday: 0,
    });
    renderWithProviders(<LikesView period={30} />);
    expect(screen.getByText('日曜日')).toBeTruthy();
  });
});
