/**
 * @module __tests__/components/analytics/QuotesView
 * QuotesView のコンポーネントテスト。
 * 4状態（ローディング・エラー・空・データあり）と
 * totalQuotes / totalReposts サマリ・quotes 一覧表示・引用行タップを確認する。
 * このビューは引数なしフックで期間非依存。
 * モック境界: useAnalyticsQuotesQuery（lib/queries/analytics）+ useOnlineStatus
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { QuotesView } from '@/components/analytics/QuotesView';
import { ApiError } from '@/lib/api/errors';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockQuotesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsQuotesQuery: () => mockQuotesQuery,
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

function makeQuoteItem(id: string, overrides?: {
  content?: string | null;
  originalContent?: string | null;
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
  userId?: string;
  nickname?: string;
  avatarUrl?: string | null;
}) {
  return {
    id,
    content: overrides?.content ?? `引用投稿 ${id}`,
    originalContent: overrides?.originalContent ?? `元の投稿 ${id}`,
    likeCount: overrides?.likeCount ?? 5,
    commentCount: overrides?.commentCount ?? 2,
    createdAt: overrides?.createdAt ?? '2025-06-01T10:00:00Z',
    user: {
      id: overrides?.userId ?? `user-${id}`,
      nickname: overrides?.nickname ?? `ユーザー${id}`,
      avatarUrl: overrides?.avatarUrl ?? null,
    },
  };
}

function makeQuotesData(overrides?: {
  totalQuotes?: number;
  totalReposts?: number;
  quotes?: ReturnType<typeof makeQuoteItem>[];
}) {
  return {
    totalQuotes: overrides?.totalQuotes ?? 8,
    totalReposts: overrides?.totalReposts ?? 3,
    quotes: overrides?.quotes ?? [
      makeQuoteItem('q1', { nickname: '盆栽太郎', likeCount: 10, commentCount: 3 }),
      makeQuoteItem('q2', { nickname: '松の匠', likeCount: 5, commentCount: 1 }),
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockQuotesQuery.data = undefined;
  mockQuotesQuery.isLoading = false;
  mockQuotesQuery.isError = false;
  mockQuotesQuery.error = null;
  mockQuotesQuery.isFetching = false;
  mockQuotesQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('QuotesView: ローディング状態', () => {
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockQuotesQuery.isLoading = true;
    renderWithProviders(<QuotesView />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('isLoading=true のとき引用数サマリが表示されない', () => {
    mockQuotesQuery.isLoading = true;
    renderWithProviders(<QuotesView />);
    expect(screen.queryByText('引用数')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('QuotesView: エラー状態', () => {
  it('isError=true のとき ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockQuotesQuery.isError = true;
    mockQuotesQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    renderWithProviders(<QuotesView />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('403 PREMIUM_REQUIRED のときも ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockQuotesQuery.isError = true;
    mockQuotesQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'premium required',
    });
    renderWithProviders(<QuotesView />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('エラー時の「再試行する」ボタンをタップすると refetch が呼ばれる', async () => {
    mockQuotesQuery.isError = true;
    mockQuotesQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockQuotesQuery.refetch = refetch;

    renderWithProviders(<QuotesView />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態（quotes が空配列）
// ---------------------------------------------------------------------------

describe('QuotesView: 空状態', () => {
  it('quotes が空配列のとき「引用された投稿はありません」が表示される', () => {
    mockQuotesQuery.data = makeQuotesData({ quotes: [] });
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('引用された投稿はありません')).toBeTruthy();
  });

  it('quotes が空でもサマリカード（totalQuotes / totalReposts）は表示される', () => {
    mockQuotesQuery.data = makeQuotesData({
      totalQuotes: 5,
      totalReposts: 2,
      quotes: [],
    });
    renderWithProviders(<QuotesView />);
    expect(screen.getByLabelText('引用 5件, リポスト 2件')).toBeTruthy();
  });

  it('quotes が空のとき「引用一覧」セクションタイトルが表示されない', () => {
    mockQuotesQuery.data = makeQuotesData({ quotes: [] });
    renderWithProviders(<QuotesView />);
    expect(screen.queryByText('引用一覧')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('QuotesView: オフライン状態', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockQuotesQuery.data = makeQuotesData();
    renderWithProviders(<QuotesView />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner の accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockQuotesQuery.data = makeQuotesData();
    renderWithProviders(<QuotesView />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// サマリカード（totalQuotes / totalReposts）
// ---------------------------------------------------------------------------

describe('QuotesView: サマリカード', () => {
  beforeEach(() => {
    mockQuotesQuery.data = makeQuotesData();
  });

  it('サマリカードの accessibilityLabel が正しい', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByLabelText('引用 8件, リポスト 3件')).toBeTruthy();
  });

  it('「引用数」ラベルが表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('引用数')).toBeTruthy();
  });

  it('totalQuotes の数値が表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('8')).toBeTruthy();
  });

  it('「リポスト数」ラベルが表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('リポスト数')).toBeTruthy();
  });

  it('totalReposts の数値が表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('3')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 全期間通知バナー
// ---------------------------------------------------------------------------

describe('QuotesView: 全期間通知バナー', () => {
  it('「引用データは全期間の集計です」テキストが表示される', () => {
    mockQuotesQuery.data = makeQuotesData();
    renderWithProviders(<QuotesView />);
    expect(
      screen.getByText('引用データは全期間の集計です。期間切替は反映されません。')
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 引用一覧
// ---------------------------------------------------------------------------

describe('QuotesView: 引用一覧', () => {
  beforeEach(() => {
    mockQuotesQuery.data = makeQuotesData();
  });

  it('「引用一覧」セクションタイトルが表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('引用一覧')).toBeTruthy();
  });

  it('各引用行のアクセシビリティラベルが表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(
      screen.getByLabelText('盆栽太郎の引用: 引用投稿 q1, いいね10, コメント3')
    ).toBeTruthy();
  });

  it('引用ユーザーのニックネームが表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('盆栽太郎')).toBeTruthy();
    expect(screen.getByText('松の匠')).toBeTruthy();
  });

  it('引用コンテンツのテキストが表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('引用投稿 q1')).toBeTruthy();
  });

  it('originalContent が表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('元の投稿 q1')).toBeTruthy();
  });

  it('content が空のとき「（テキストなし）」が表示される', () => {
    mockQuotesQuery.data = makeQuotesData({
      quotes: [makeQuoteItem('q-empty', { content: '' })],
    });
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('（テキストなし）')).toBeTruthy();
  });

  it('originalContent が空のとき引用元ボックスが表示されない', () => {
    mockQuotesQuery.data = makeQuotesData({
      quotes: [makeQuoteItem('q-no-original', { originalContent: '' })],
    });
    renderWithProviders(<QuotesView />);
    expect(screen.queryByText('引用元: ')).toBeNull();
  });

  it('いいね数が表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('いいね 10')).toBeTruthy();
  });

  it('コメント数が表示される', () => {
    renderWithProviders(<QuotesView />);
    expect(screen.getByText('コメント 3')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 引用行タップ → 投稿詳細遷移
// ---------------------------------------------------------------------------

describe('QuotesView: 引用行タップ', () => {
  beforeEach(() => {
    mockQuotesQuery.data = makeQuotesData();
  });

  it('引用行をタップすると router.push で投稿詳細へ遷移する', () => {
    renderWithProviders(<QuotesView />);
    fireEvent.press(
      screen.getByLabelText('盆栽太郎の引用: 引用投稿 q1, いいね10, コメント3')
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/posts/q1');
  });
});

// ---------------------------------------------------------------------------
// 期間非依存の確認（引数なしフック）
// ---------------------------------------------------------------------------

describe('QuotesView: 期間非依存', () => {
  it('QuotesView は props に period を受け取らない（引数なしフックで動作する）', () => {
    mockQuotesQuery.data = makeQuotesData();
    renderWithProviders(<QuotesView />);
    // period props を渡さずにレンダーできること自体が確認
    expect(screen.getByText('引用数')).toBeTruthy();
  });
});
