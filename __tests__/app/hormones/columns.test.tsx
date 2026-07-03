/**
 * app/hormones/columns/index と app/hormones/columns/[slug]/index のコンポーネントテスト。
 * 一覧: ローディング・エラー・空状態・カテゴリバッジ・タップ遷移・無限スクロール・オフライン。
 * 詳細: ローディング・エラー・タイトル・カテゴリ・日付・本文・オフライン。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import HormoneColumnsScreen from '@/app/hormones/columns/index';
import HormoneColumnDetailScreen from '@/app/hormones/columns/[slug]/index';
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

const mockColumnDetailQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/hormones', () => ({
  useHormoneColumnsQuery: () => mockColumnsQuery,
  useHormoneColumnDetailQuery: () => mockColumnDetailQuery,
  useHormonesQuery: jest.fn(),
  useHormoneDetailQuery: jest.fn(),
  useHormoneInteractionsQuery: jest.fn(),
  useHormoneTechniquesQuery: jest.fn(),
  useHormoneSimulatorQuery: jest.fn(),
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

function makeColumnItem(overrides = {}) {
  return {
    id: 'hcol1',
    slug: 'hormone-column-slug',
    title: 'ホルモンの基礎',
    category: 'bonsai_practice',
    publishedAt: '2024-05-01T00:00:00Z',
    ...overrides,
  };
}

function makePages(items: ReturnType<typeof makeColumnItem>[]) {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

function makeDetailData(overrides = {}) {
  return {
    id: 'hcol1',
    slug: 'hormone-column-slug',
    title: 'ホルモンの基礎',
    category: 'bonsai_practice',
    publishedAt: '2024-05-01T00:00:00Z',
    content: 'ホルモンは植物の成長を調節する重要な物質です。',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ slug: 'hormone-column-slug' });
  mockColumnsQuery.data = undefined;
  mockColumnsQuery.isLoading = false;
  mockColumnsQuery.isError = false;
  mockColumnsQuery.fetchNextPage = jest.fn();
  mockColumnsQuery.hasNextPage = false;
  mockColumnsQuery.isFetchingNextPage = false;
  mockColumnsQuery.refetch = jest.fn();
  mockColumnDetailQuery.data = undefined as unknown;
  mockColumnDetailQuery.isLoading = false;
  mockColumnDetailQuery.isError = false;
  mockColumnDetailQuery.refetch = jest.fn();
});

// ===========================================================================
// 一覧 (index) テスト
// ===========================================================================

describe('HormoneColumnsScreen 一覧 ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockColumnsQuery.isLoading = true;
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

describe('HormoneColumnsScreen 一覧 エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<HormoneColumnsScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockColumnsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('HormoneColumnsScreen 一覧 空状態', () => {
  it('items が空のとき空状態テキストが表示される', () => {
    mockColumnsQuery.data = makePages([]);
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.getByText('コラム記事はまだ公開されていません')).toBeTruthy();
  });
});

describe('HormoneColumnsScreen 一覧 正常データ', () => {
  it('コラムタイトルが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.getByText('ホルモンの基礎')).toBeTruthy();
  });

  it('category=bonsai_practice のとき「盆栽実践」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'bonsai_practice' })]);
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.getByText('盆栽実践')).toBeTruthy();
  });

  it('category=seasonal のとき「季節の管理」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'seasonal', id: 'hcol2' })]);
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.getByText('季節の管理')).toBeTruthy();
  });

  it('category=basics のとき「基礎知識」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'basics', id: 'hcol3' })]);
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.getByText('基礎知識')).toBeTruthy();
  });

  it('publishedAt がある場合に日付が表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.getByText(/2024/)).toBeTruthy();
  });

  it('publishedAt が null のとき日付が表示されない', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ publishedAt: null })]);
    renderWithProviders(<HormoneColumnsScreen />);
    expect(screen.queryByText(/2024/)).toBeNull();
  });
});

describe('HormoneColumnsScreen 一覧 タップ遷移', () => {
  it('カードタップで詳細画面へ push する', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<HormoneColumnsScreen />);
    fireEvent.press(screen.getByLabelText('ホルモンの基礎を読む（盆栽実践）'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: { slug: 'hormone-column-slug' } }),
    );
  });
});

describe('HormoneColumnsScreen 一覧 オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<HormoneColumnsScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});

// ===========================================================================
// 詳細 ([slug]) テスト
// ===========================================================================

describe('HormoneColumnDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockColumnDetailQuery.isLoading = true;
    renderWithProviders(<HormoneColumnDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

describe('HormoneColumnDetailScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockColumnDetailQuery.isError = true;
    renderWithProviders(<HormoneColumnDetailScreen />);
    expect(screen.getByText('記事を読み込めませんでした')).toBeTruthy();
  });

  it('data=undefined のとき ScreenError が表示される', () => {
    mockColumnDetailQuery.data = undefined;
    renderWithProviders(<HormoneColumnDetailScreen />);
    expect(screen.getByText('記事を読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockColumnDetailQuery.isError = true;
    renderWithProviders(<HormoneColumnDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockColumnDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('HormoneColumnDetailScreen 正常データ', () => {
  it('タイトルが表示される', () => {
    mockColumnDetailQuery.data = makeDetailData();
    renderWithProviders(<HormoneColumnDetailScreen />);
    expect(screen.getByText('ホルモンの基礎')).toBeTruthy();
  });

  it('category=bonsai_practice のとき「盆栽実践」バッジが表示される', () => {
    mockColumnDetailQuery.data = makeDetailData({ category: 'bonsai_practice' });
    renderWithProviders(<HormoneColumnDetailScreen />);
    expect(screen.getByText('盆栽実践')).toBeTruthy();
  });

  it('公開日が表示される', () => {
    mockColumnDetailQuery.data = makeDetailData();
    renderWithProviders(<HormoneColumnDetailScreen />);
    expect(screen.getByText(/2024/)).toBeTruthy();
  });

  it('本文が表示される', () => {
    mockColumnDetailQuery.data = makeDetailData();
    renderWithProviders(<HormoneColumnDetailScreen />);
    expect(screen.getByText('ホルモンは植物の成長を調節する重要な物質です。')).toBeTruthy();
  });

  it('publishedAt が null のとき日付が表示されない', () => {
    mockColumnDetailQuery.data = makeDetailData({ publishedAt: null });
    renderWithProviders(<HormoneColumnDetailScreen />);
    expect(screen.queryByText(/2024/)).toBeNull();
  });
});

describe('HormoneColumnDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockColumnDetailQuery.data = makeDetailData();
    renderWithProviders(<HormoneColumnDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
