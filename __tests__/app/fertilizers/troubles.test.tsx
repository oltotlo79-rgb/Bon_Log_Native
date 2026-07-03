/**
 * app/fertilizers/troubles/index のコンポーネントテスト。
 * useFertilizerColumnsQuery を 'trouble' カテゴリで呼ぶことを検証する。
 * ローディング・エラー・空状態・正常データ・タップ遷移・オフラインを網羅する。
 * 注意: 'trouble' と 'troubleshooting' は別の category 値。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FertilizerTroublesScreen from '@/app/fertilizers/troubles/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockColumnsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
};

let capturedCategory: string | undefined;
jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerColumnsQuery: (category: string) => {
    capturedCategory = category;
    return mockColumnsQuery;
  },
  useFertilizerColumnDetailQuery: jest.fn(),
  useFertilizerNutrientsQuery: jest.fn(),
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizerCategoriesQuery: jest.fn(),
  useFertilizerTreeSpeciesQuery: jest.fn(),
  useFertilizationScheduleQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeColumnItem(overrides = {}) {
  return {
    id: 'trb1',
    slug: 'trouble-slug',
    title: '過施肥による葉焼け',
    category: 'trouble',
    publishedAt: '2024-08-01T00:00:00Z',
    ...overrides,
  };
}

function makePages(items: ReturnType<typeof makeColumnItem>[]) {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedCategory = undefined;
  mockUseOnlineStatus.mockReturnValue(true);
  mockColumnsQuery.data = undefined;
  mockColumnsQuery.isLoading = false;
  mockColumnsQuery.isError = false;
  mockColumnsQuery.fetchNextPage = jest.fn();
  mockColumnsQuery.hasNextPage = false;
  mockColumnsQuery.isFetchingNextPage = false;
  mockColumnsQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// category 引数の検証
// ---------------------------------------------------------------------------

describe('FertilizerTroublesScreen カテゴリ引数', () => {
  it('useFertilizerColumnsQuery を trouble カテゴリで呼ぶ（troubleshooting ではない）', () => {
    mockColumnsQuery.isLoading = true;
    renderWithProviders(<FertilizerTroublesScreen />);
    expect(capturedCategory).toBe('trouble');
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('FertilizerTroublesScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockColumnsQuery.isLoading = true;
    renderWithProviders(<FertilizerTroublesScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('FertilizerTroublesScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<FertilizerTroublesScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<FertilizerTroublesScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockColumnsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('FertilizerTroublesScreen 空状態', () => {
  it('items が空のとき空状態テキストが表示される', () => {
    mockColumnsQuery.data = makePages([]);
    renderWithProviders(<FertilizerTroublesScreen />);
    expect(screen.getByText('トラブル事例はまだ公開されていません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常データ
// ---------------------------------------------------------------------------

describe('FertilizerTroublesScreen 正常データ', () => {
  it('コラムタイトルが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerTroublesScreen />);
    expect(screen.getByText('過施肥による葉焼け')).toBeTruthy();
  });

  it('「トラブル事例」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerTroublesScreen />);
    expect(screen.getByText('トラブル事例')).toBeTruthy();
  });

  it('公開日が表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerTroublesScreen />);
    expect(screen.getByText(/2024/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ遷移
// ---------------------------------------------------------------------------

describe('FertilizerTroublesScreen タップ遷移', () => {
  it('カードタップでコラム詳細へ push する', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerTroublesScreen />);
    fireEvent.press(screen.getByLabelText(/過施肥による葉焼けを読む（トラブル事例/));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/fertilizers/columns/[slug]',
      params: { slug: 'trouble-slug' },
    });
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('FertilizerTroublesScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<FertilizerTroublesScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
