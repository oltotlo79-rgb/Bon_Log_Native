/**
 * @module __tests__/components/analytics/FollowerGrowthView
 * FollowerGrowthView のコンポーネントテスト。
 * 4状態（ローディング・エラー・空・データあり）と
 * currentFollowers / totalNewInPeriod サマリ、growth 棒グラフを確認する。
 * モック境界: useAnalyticsFollowerGrowthQuery（lib/queries/analytics）+ useOnlineStatus
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { FollowerGrowthView } from '@/components/analytics/FollowerGrowthView';
import { ApiError } from '@/lib/api/errors';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockFollowerQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsFollowerGrowthQuery: () => mockFollowerQuery,
}));

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

function makeGrowthEntry(date: string, newFollowers: number, totalFollowers: number) {
  return { date, newFollowers, totalFollowers };
}

function makeFollowerData(overrides?: {
  currentFollowers?: number;
  totalNewInPeriod?: number;
  growth?: ReturnType<typeof makeGrowthEntry>[];
}) {
  return {
    currentFollowers: overrides?.currentFollowers ?? 250,
    totalNewInPeriod: overrides?.totalNewInPeriod ?? 12,
    growth: overrides?.growth ?? [
      makeGrowthEntry('2025-06-01', 3, 241),
      makeGrowthEntry('2025-06-02', 5, 246),
      makeGrowthEntry('2025-06-03', 4, 250),
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockFollowerQuery.data = undefined;
  mockFollowerQuery.isLoading = false;
  mockFollowerQuery.isError = false;
  mockFollowerQuery.error = null;
  mockFollowerQuery.isFetching = false;
  mockFollowerQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('FollowerGrowthView: ローディング状態', () => {
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockFollowerQuery.isLoading = true;
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('isLoading=true のときサマリカードが表示されない', () => {
    mockFollowerQuery.isLoading = true;
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.queryByText('フォロワー')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('FollowerGrowthView: エラー状態', () => {
  it('isError=true のとき ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockFollowerQuery.isError = true;
    mockFollowerQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('403 PREMIUM_REQUIRED のときも ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockFollowerQuery.isError = true;
    mockFollowerQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'premium required',
    });
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('エラー時の「再試行する」ボタンをタップすると refetch が呼ばれる', async () => {
    mockFollowerQuery.isError = true;
    mockFollowerQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockFollowerQuery.refetch = refetch;

    renderWithProviders(<FollowerGrowthView period={30} />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態（growth が空配列）
// ---------------------------------------------------------------------------

describe('FollowerGrowthView: 空状態', () => {
  it('growth が空配列のとき「この期間のフォロワーデータがありません」が表示される', () => {
    mockFollowerQuery.data = makeFollowerData({ growth: [] });
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('この期間のフォロワーデータがありません')).toBeTruthy();
  });

  it('growth が空でもサマリカード（currentFollowers）は表示される', () => {
    mockFollowerQuery.data = makeFollowerData({
      currentFollowers: 100,
      totalNewInPeriod: 0,
      growth: [],
    });
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByLabelText('現在のフォロワー数 100, 期間内増加数 0')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('FollowerGrowthView: オフライン状態', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockFollowerQuery.data = makeFollowerData();
    renderWithProviders(<FollowerGrowthView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner の accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockFollowerQuery.data = makeFollowerData();
    renderWithProviders(<FollowerGrowthView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// サマリカード（currentFollowers・totalNewInPeriod）
// ---------------------------------------------------------------------------

describe('FollowerGrowthView: サマリカード', () => {
  beforeEach(() => {
    mockFollowerQuery.data = makeFollowerData();
  });

  it('サマリカードの accessibilityLabel が正しい', () => {
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByLabelText('現在のフォロワー数 250, 期間内増加数 12')).toBeTruthy();
  });

  it('「フォロワー」ラベルが表示される', () => {
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('フォロワー')).toBeTruthy();
  });

  it('currentFollowers の数値が表示される', () => {
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('250')).toBeTruthy();
  });

  it('「期間内増加」ラベルが表示される', () => {
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('期間内増加')).toBeTruthy();
  });

  it('totalNewInPeriod が正のとき「+12」と表示される', () => {
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('+12')).toBeTruthy();
  });

  it('totalNewInPeriod が 0 のとき「+0」と表示される', () => {
    mockFollowerQuery.data = makeFollowerData({ totalNewInPeriod: 0 });
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('+0')).toBeTruthy();
  });

  it('totalNewInPeriod が負のとき「-3」と表示される（プラス記号なし）', () => {
    mockFollowerQuery.data = makeFollowerData({ totalNewInPeriod: -3 });
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('-3')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// growth 棒グラフ
// ---------------------------------------------------------------------------

describe('FollowerGrowthView: growth 棒グラフ', () => {
  beforeEach(() => {
    mockFollowerQuery.data = makeFollowerData();
  });

  it('日次新規フォロワー棒グラフが表示される', () => {
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByLabelText('日次新規フォロワー棒グラフ')).toBeTruthy();
  });

  it('各 growth エントリのアクセシビリティラベルが表示される', () => {
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByLabelText('2025-06-01: 新規 3人, 合計 241人')).toBeTruthy();
    expect(screen.getByLabelText('2025-06-02: 新規 5人, 合計 246人')).toBeTruthy();
  });

  it('「日次新規フォロワー」セクションタイトルが表示される', () => {
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('日次新規フォロワー')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 直近データリスト
// ---------------------------------------------------------------------------

describe('FollowerGrowthView: 直近データリスト', () => {
  it('「直近の推移」セクションタイトルが表示される', () => {
    mockFollowerQuery.data = makeFollowerData();
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('直近の推移')).toBeTruthy();
  });

  it('直近エントリの日付が表示される', () => {
    mockFollowerQuery.data = makeFollowerData();
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('2025-06-03')).toBeTruthy();
  });

  it('6件以上あるとき直近5件だけ表示される', () => {
    const growthEntries = Array.from({ length: 7 }, (_, i) =>
      makeGrowthEntry(`2025-06-0${i + 1}`, i + 1, 200 + i)
    );
    mockFollowerQuery.data = makeFollowerData({ growth: growthEntries });
    renderWithProviders(<FollowerGrowthView period={30} />);
    // 最新5件（06-07 〜 06-03）が表示され、06-01 は非表示
    expect(screen.getByText('2025-06-07')).toBeTruthy();
    expect(screen.queryByText('2025-06-01')).toBeNull();
  });

  it('新規フォロワーが正のとき「+3」形式で表示される', () => {
    mockFollowerQuery.data = makeFollowerData();
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('+3')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 境界値
// ---------------------------------------------------------------------------

describe('FollowerGrowthView: 境界値', () => {
  it('currentFollowers=0 のときサマリに「0」が表示される', () => {
    mockFollowerQuery.data = makeFollowerData({
      currentFollowers: 0,
      totalNewInPeriod: 0,
    });
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByLabelText('現在のフォロワー数 0, 期間内増加数 0')).toBeTruthy();
  });

  it('大きな currentFollowers（1000000）が数値フォーマットされて表示される', () => {
    mockFollowerQuery.data = makeFollowerData({
      currentFollowers: 1_000_000,
      totalNewInPeriod: 1,
    });
    renderWithProviders(<FollowerGrowthView period={30} />);
    expect(screen.getByText('1,000,000')).toBeTruthy();
  });
});
