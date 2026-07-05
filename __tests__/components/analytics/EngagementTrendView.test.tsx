/**
 * @module __tests__/components/analytics/EngagementTrendView
 * EngagementTrendView のコンポーネントテスト。
 * 4状態（ローディング・エラー・空・データあり）と
 * trend 棒グラフ・合計サマリ（エンゲージメント / いいね / コメント / 投稿）を確認する。
 * モック境界: useAnalyticsEngagementTrendQuery（lib/queries/analytics）+ useOnlineStatus
 */

import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { EngagementTrendView } from '@/components/analytics/EngagementTrendView';
import { ApiError } from '@/lib/api/errors';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockEngagementQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsEngagementTrendQuery: () => mockEngagementQuery,
}));

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

function makeTrendEntry(date: string, overrides?: {
  engagement?: number;
  likes?: number;
  comments?: number;
  posts?: number;
}) {
  return {
    date,
    engagement: overrides?.engagement ?? 25,
    likes: overrides?.likes ?? 15,
    comments: overrides?.comments ?? 10,
    posts: overrides?.posts ?? 3,
  };
}

function makeTrendData(entries?: ReturnType<typeof makeTrendEntry>[]) {
  return {
    trend: entries ?? [
      makeTrendEntry('2025-06-01', { engagement: 20, likes: 12, comments: 8, posts: 2 }),
      makeTrendEntry('2025-06-02', { engagement: 35, likes: 20, comments: 15, posts: 4 }),
      makeTrendEntry('2025-06-03', { engagement: 15, likes: 9, comments: 6, posts: 1 }),
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockEngagementQuery.data = undefined;
  mockEngagementQuery.isLoading = false;
  mockEngagementQuery.isError = false;
  mockEngagementQuery.error = null;
  mockEngagementQuery.isFetching = false;
  mockEngagementQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('EngagementTrendView: ローディング状態', () => {
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockEngagementQuery.isLoading = true;
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('isLoading=true のときサマリカードが表示されない', () => {
    mockEngagementQuery.isLoading = true;
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.queryByText('エンゲージメント')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('EngagementTrendView: エラー状態', () => {
  it('isError=true のとき ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockEngagementQuery.isError = true;
    mockEngagementQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('403 PREMIUM_REQUIRED のときも ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockEngagementQuery.isError = true;
    mockEngagementQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'premium required',
    });
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('エラー時の「再試行する」ボタンをタップすると refetch が呼ばれる', async () => {
    mockEngagementQuery.isError = true;
    mockEngagementQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockEngagementQuery.refetch = refetch;

    renderWithProviders(<EngagementTrendView period={30} />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態（trend が空配列）
// ---------------------------------------------------------------------------

describe('EngagementTrendView: 空状態', () => {
  it('trend が空配列のとき「この期間のエンゲージメントデータがありません」が表示される', () => {
    mockEngagementQuery.data = makeTrendData([]);
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('この期間のエンゲージメントデータがありません')).toBeTruthy();
  });

  it('trend が空のときサマリカードが表示されない', () => {
    mockEngagementQuery.data = makeTrendData([]);
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.queryByText('エンゲージメント')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('EngagementTrendView: オフライン状態', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockEngagementQuery.data = makeTrendData();
    renderWithProviders(<EngagementTrendView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner の accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockEngagementQuery.data = makeTrendData();
    renderWithProviders(<EngagementTrendView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 合計サマリカード
// ---------------------------------------------------------------------------

describe('EngagementTrendView: サマリカード', () => {
  beforeEach(() => {
    mockEngagementQuery.data = makeTrendData();
  });

  it('サマリカードに accessibilityLabel がある', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    // 合計エンゲージメント: 20+35+15=70
    expect(screen.getByLabelText('エンゲージメント合計 70')).toBeTruthy();
  });

  it('「エンゲージメント」ラベルが表示される', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('エンゲージメント')).toBeTruthy();
  });

  it('エンゲージメント合計値が表示される（20+35+15=70）', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('70')).toBeTruthy();
  });

  it('「いいね」ラベルが表示される（棒グラフ凡例にも同名があるためサマリカード内で検証）', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    const summaryCard = within(screen.getByLabelText('エンゲージメント合計 70'));
    expect(summaryCard.getByText('いいね')).toBeTruthy();
  });

  it('いいね合計値が表示される（12+20+9=41）', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('41')).toBeTruthy();
  });

  it('「コメント」ラベルが表示される（棒グラフ凡例にも同名があるためサマリカード内で検証）', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    const summaryCard = within(screen.getByLabelText('エンゲージメント合計 70'));
    expect(summaryCard.getByText('コメント')).toBeTruthy();
  });

  it('コメント合計値が表示される（8+15+6=29）', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('29')).toBeTruthy();
  });

  it('「投稿」ラベルが表示される', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('投稿')).toBeTruthy();
  });

  it('投稿合計値が表示される（2+4+1=7）', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('7')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 棒グラフ
// ---------------------------------------------------------------------------

describe('EngagementTrendView: 棒グラフ', () => {
  beforeEach(() => {
    mockEngagementQuery.data = makeTrendData();
  });

  it('エンゲージメント推移棒グラフが表示される', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByLabelText('エンゲージメント推移棒グラフ')).toBeTruthy();
  });

  it('各 trend エントリのアクセシビリティラベルが表示される（積み上げ2色: いいね・コメント）', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByLabelText('2025-06-01: いいね 12, コメント 8')).toBeTruthy();
    expect(screen.getByLabelText('2025-06-02: いいね 20, コメント 15')).toBeTruthy();
  });

  it('「エンゲージメント推移（日次）」セクションタイトルが表示される', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('エンゲージメント推移（日次）')).toBeTruthy();
  });

  it('サマリカードと凡例の両方に「いいね」「コメント」が表示される（積み上げ2色の凡例追加分）', () => {
    renderWithProviders(<EngagementTrendView period={30} />);
    // サマリカード内の1件 + 棒グラフ凡例の1件 = 2件ずつ表示される
    expect(screen.getAllByText('いいね')).toHaveLength(2);
    expect(screen.getAllByText('コメント')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 直近データリスト（直近5件表示）
// ---------------------------------------------------------------------------

describe('EngagementTrendView: 直近データリスト', () => {
  it('「直近の日別データ」セクションタイトルが表示される', () => {
    mockEngagementQuery.data = makeTrendData();
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('直近の日別データ')).toBeTruthy();
  });

  it('直近エントリの日付が表示される', () => {
    mockEngagementQuery.data = makeTrendData();
    renderWithProviders(<EngagementTrendView period={30} />);
    expect(screen.getByText('2025-06-03')).toBeTruthy();
  });

  it('6件以上あるとき直近5件だけ表示される', () => {
    const entries = Array.from({ length: 7 }, (_, i) =>
      makeTrendEntry(`2025-06-0${i + 1}`, { engagement: 10 + i })
    );
    mockEngagementQuery.data = makeTrendData(entries);
    renderWithProviders(<EngagementTrendView period={30} />);
    // 最新5件 = 06-07 〜 06-03 が表示され、06-01 は非表示
    expect(screen.getByText('2025-06-07')).toBeTruthy();
    expect(screen.queryByText('2025-06-01')).toBeNull();
  });
});
