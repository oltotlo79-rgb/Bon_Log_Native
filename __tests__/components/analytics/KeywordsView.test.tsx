/**
 * @module __tests__/components/analytics/KeywordsView
 * KeywordsView のコンポーネントテスト。
 * keywords の頻度順表示・totalWords・uniqueWords の表示と4状態を確認する。
 * モック境界: useAnalyticsKeywordsQuery（lib/queries/analytics）+ useOnlineStatus
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { KeywordsView } from '@/components/analytics/KeywordsView';
import { ApiError } from '@/lib/api/errors';
import { ERR_ANALYTICS_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockKeywordsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/analytics', () => ({
  useAnalyticsKeywordsQuery: () => mockKeywordsQuery,
}));

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

function makeKeywordsData(overrides?: {
  totalWords?: number;
  uniqueWords?: number;
  keywords?: { word: string; count: number }[];
}) {
  return {
    totalWords: 1500,
    uniqueWords: 320,
    keywords: [
      { word: '黒松', count: 45 },
      { word: '剪定', count: 38 },
      { word: '五葉松', count: 27 },
      { word: '水やり', count: 20 },
      { word: '肥料', count: 15 },
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
  mockKeywordsQuery.data = undefined;
  mockKeywordsQuery.isLoading = false;
  mockKeywordsQuery.isError = false;
  mockKeywordsQuery.error = null;
  mockKeywordsQuery.isFetching = false;
  mockKeywordsQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('KeywordsView: ローディング状態', () => {
  it('isLoading=true のときローディングスピナーが表示される', () => {
    mockKeywordsQuery.isLoading = true;
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('isLoading=true のとき totalWords が表示されない', () => {
    mockKeywordsQuery.isLoading = true;
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.queryByText('1,500')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('KeywordsView: エラー状態', () => {
  it('isError=true のとき ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockKeywordsQuery.isError = true;
    mockKeywordsQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('403 PREMIUM_REQUIRED のときも ERR_ANALYTICS_LOAD_FAILED が表示される', () => {
    mockKeywordsQuery.isError = true;
    mockKeywordsQuery.error = new ApiError({
      code: 'PREMIUM_REQUIRED',
      status: 403,
      message: 'premium required',
    });
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByText(ERR_ANALYTICS_LOAD_FAILED)).toBeTruthy();
  });

  it('エラー時の「再試行する」ボタンをタップすると refetch が呼ばれる', async () => {
    mockKeywordsQuery.isError = true;
    mockKeywordsQuery.error = new ApiError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'server error',
    });
    const refetch = jest.fn().mockResolvedValue({});
    mockKeywordsQuery.refetch = refetch;

    renderWithProviders(<KeywordsView period={30} />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('KeywordsView: 空状態', () => {
  it('keywords が空配列のとき「この期間のキーワードデータがありません」が表示される', () => {
    mockKeywordsQuery.data = makeKeywordsData({ keywords: [] });
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByText('この期間のキーワードデータがありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('KeywordsView: オフライン状態', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockKeywordsQuery.data = makeKeywordsData();
    renderWithProviders(<KeywordsView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner の accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockKeywordsQuery.data = makeKeywordsData();
    renderWithProviders(<KeywordsView period={30} />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// totalWords / uniqueWords の表示
// ---------------------------------------------------------------------------

describe('KeywordsView: totalWords / uniqueWords', () => {
  beforeEach(() => {
    mockKeywordsQuery.data = makeKeywordsData();
  });

  it('totalWords と uniqueWords のアクセシビリティラベルが表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByLabelText('総単語数 1500, ユニーク語数 320')).toBeTruthy();
  });

  it('「総単語数」ラベルが表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByText('総単語数')).toBeTruthy();
  });

  it('「ユニーク語数」ラベルが表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByText('ユニーク語数')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// keywords の頻度順表示
// ---------------------------------------------------------------------------

describe('KeywordsView: keywords の頻度順表示', () => {
  beforeEach(() => {
    mockKeywordsQuery.data = makeKeywordsData();
  });

  it('1位キーワード「黒松」がアクセシビリティラベル付きで表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByLabelText('1位: 黒松 45回')).toBeTruthy();
  });

  it('2位キーワード「剪定」がアクセシビリティラベル付きで表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByLabelText('2位: 剪定 38回')).toBeTruthy();
  });

  it('3位キーワード「五葉松」がアクセシビリティラベル付きで表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByLabelText('3位: 五葉松 27回')).toBeTruthy();
  });

  it('各キーワードの回数テキストが表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByText('45回')).toBeTruthy();
    expect(screen.getByText('38回')).toBeTruthy();
    expect(screen.getByText('27回')).toBeTruthy();
  });

  it('「よく使うキーワード（頻度順）」セクションタイトルが表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByText('よく使うキーワード（頻度順）')).toBeTruthy();
  });

  it('キーワードの word テキストが表示される', () => {
    renderWithProviders(<KeywordsView period={30} />);
    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.getByText('剪定')).toBeTruthy();
  });
});
