/**
 * @module __tests__/components/analytics/PeriodComparisonView
 * PeriodComparisonView のコンポーネントテスト。
 * current / previous / change パーセントの表示と増減の色分けを確認する。
 * モック境界: useAnalyticsPeriodComparisonQuery（lib/queries/analytics）+ useOnlineStatus
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { PeriodComparisonView } from '@/components/analytics/PeriodComparisonView';
import { ApiError } from '@/lib/api/errors';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockComparisonQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsPeriodComparisonQuery: () => mockComparisonQuery,
}));

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

function makeComparisonData(overrides?: {
  posts?: { current: number; previous: number; change: number | null };
  likes?: { current: number; previous: number; change: number | null };
  comments?: { current: number; previous: number; change: number | null };
  followers?: { current: number; previous: number; change: number | null };
}) {
  return {
    posts: { current: 10, previous: 8, change: 25 },
    likes: { current: 200, previous: 150, change: 33 },
    comments: { current: 50, previous: 60, change: -17 },
    followers: { current: 120, previous: 120, change: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockComparisonQuery.data = undefined;
  mockComparisonQuery.isLoading = false;
  mockComparisonQuery.isError = false;
  mockComparisonQuery.error = null;
  mockComparisonQuery.isFetching = false;
  mockComparisonQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('PeriodComparisonView: ローディング状態', () => {
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockComparisonQuery.isLoading = true;
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('PeriodComparisonView: エラー状態', () => {
  it('isError=true のとき ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockComparisonQuery.isError = true;
    mockComparisonQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('エラー時の「再試行する」ボタンをタップすると refetch が呼ばれる', async () => {
    mockComparisonQuery.isError = true;
    mockComparisonQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockComparisonQuery.refetch = refetch;

    renderWithProviders(<PeriodComparisonView period={30} />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('PeriodComparisonView: オフライン状態', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockComparisonQuery.data = makeComparisonData();
    renderWithProviders(<PeriodComparisonView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner の accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockComparisonQuery.data = makeComparisonData();
    renderWithProviders(<PeriodComparisonView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// current / previous / change の表示
// ---------------------------------------------------------------------------

describe('PeriodComparisonView: current・previous・change の表示', () => {
  beforeEach(() => {
    mockComparisonQuery.data = makeComparisonData();
  });

  it('投稿数の current が表示される', () => {
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByLabelText('投稿数: 今期 10、前期 8')).toBeTruthy();
  });

  it('いいねの current が表示される', () => {
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByLabelText('いいね: 今期 200、前期 150')).toBeTruthy();
  });

  it('コメントの current が表示される', () => {
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByLabelText('コメント: 今期 50、前期 60')).toBeTruthy();
  });

  it('フォロワーの current が表示される', () => {
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByLabelText('フォロワー: 今期 120、前期 120')).toBeTruthy();
  });

  it('増加（+25%）の change が「前期比 +25%」ラベル付きで表示される', () => {
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByLabelText('前期比 +25%')).toBeTruthy();
  });

  it('減少（-17%）の change が「前期比 -17%」ラベル付きで表示される', () => {
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByLabelText('前期比 -17%')).toBeTruthy();
  });

  it('change=null のとき「—」が表示される', () => {
    mockComparisonQuery.data = makeComparisonData({
      posts: { current: 5, previous: 0, change: null },
    });
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 増減の色分け
// ---------------------------------------------------------------------------

describe('PeriodComparisonView: 増減の色分け', () => {
  it('change が正のとき changePositive スタイル（緑）が適用される', () => {
    mockComparisonQuery.data = makeComparisonData({
      posts: { current: 10, previous: 8, change: 25 },
    });
    renderWithProviders(<PeriodComparisonView period={30} />);
    const el = screen.getByLabelText('前期比 +25%');
    const style = el.props.style;
    const styleArr = Array.isArray(style) ? style : [style];
    const hasGreen = styleArr.some(
      (s) => s && typeof s === 'object' && 'color' in s && s.color === '#3a6b42'
    );
    expect(hasGreen).toBe(true);
  });

  it('change が負のとき changeNegative スタイル（赤）が適用される', () => {
    mockComparisonQuery.data = makeComparisonData({
      comments: { current: 50, previous: 60, change: -17 },
    });
    renderWithProviders(<PeriodComparisonView period={30} />);
    const el = screen.getByLabelText('前期比 -17%');
    const style = el.props.style;
    const styleArr = Array.isArray(style) ? style : [style];
    const hasRed = styleArr.some(
      (s) => s && typeof s === 'object' && 'color' in s && s.color === '#c21721'
    );
    expect(hasRed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 説明テキスト
// ---------------------------------------------------------------------------

describe('PeriodComparisonView: 説明テキスト', () => {
  it('「前の同期間と比較した数値の変化を示します」が表示される', () => {
    mockComparisonQuery.data = makeComparisonData();
    renderWithProviders(<PeriodComparisonView period={30} />);
    expect(screen.getByText('前の同期間と比較した数値の変化を示します')).toBeTruthy();
  });
});
