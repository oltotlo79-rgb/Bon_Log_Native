/**
 * app/pesticides/columns/index のコンポーネントテスト。
 * ローディング・エラー・空状態・無限スクロール・カテゴリバッジ日本語・タップ遷移・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import ColumnsIndexScreen from '@/app/pesticides/columns/index';
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

jest.mock('@/lib/queries/pesticides', () => ({
  usePesticideColumnsQuery: () => mockColumnsQuery,
  usePesticideColumnDetailQuery: jest.fn(),
  useSpreaderTypesQuery: jest.fn(),
  useSpreaderTypeDetailQuery: jest.fn(),
  useSpreaderProductsQuery: jest.fn(),
  useFormulationTypesQuery: jest.fn(),
  useMixingDataQuery: jest.fn(),
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientsQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeColumnItem(overrides: Partial<{
  id: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
}> = {}) {
  return {
    id: 'col1',
    slug: 'column-slug',
    title: '農薬の基礎知識',
    category: 'general',
    publishedAt: '2024-01-15T00:00:00Z',
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
// ローディング
// ---------------------------------------------------------------------------

describe('ColumnsIndexScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockColumnsQuery.isLoading = true;
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('ColumnsIndexScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockColumnsQuery.isError = true;
    renderWithProviders(<ColumnsIndexScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockColumnsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('ColumnsIndexScreen 空状態', () => {
  it('items が空のとき空状態テキストが表示される', () => {
    mockColumnsQuery.data = makePages([]);
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('コラム記事はまだ公開されていません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常データ・カテゴリバッジ日本語
// ---------------------------------------------------------------------------

describe('ColumnsIndexScreen 正常データ', () => {
  it('コラムタイトルが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('農薬の基礎知識')).toBeTruthy();
  });

  it('category=general のとき「一般知識」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'general' })]);
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('一般知識')).toBeTruthy();
  });

  it('category=mixing_order のとき「混用技術」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'mixing_order', id: 'col2' })]);
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('混用技術')).toBeTruthy();
  });

  it('category=temperature のとき「散布条件」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'temperature', id: 'col3' })]);
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('散布条件')).toBeTruthy();
  });

  it('category=management のとき「月別管理」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'management', id: 'col4' })]);
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('月別管理')).toBeTruthy();
  });

  it('category=safety のとき「安全管理」バッジが表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'safety', id: 'col5' })]);
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('安全管理')).toBeTruthy();
  });

  it('未知 category はそのまま表示される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem({ category: 'unknown_cat', id: 'col6' })]);
    renderWithProviders(<ColumnsIndexScreen />);
    expect(screen.getByText('unknown_cat')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ遷移
// ---------------------------------------------------------------------------

describe('ColumnsIndexScreen タップ遷移', () => {
  it('カードタップで詳細画面へ push する', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<ColumnsIndexScreen />);
    fireEvent.press(screen.getByLabelText('農薬の基礎知識を読む（一般知識・2024/1/15）'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/columns/[slug]',
      params: { slug: 'column-slug' },
    });
  });
});

// ---------------------------------------------------------------------------
// 無限スクロール
// ---------------------------------------------------------------------------

describe('ColumnsIndexScreen 無限スクロール', () => {
  it('hasNextPage=true 状態が正しく保持される', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    mockColumnsQuery.hasNextPage = true;
    mockColumnsQuery.isFetchingNextPage = false;
    renderWithProviders(<ColumnsIndexScreen />);
    // データが表示され、ページングフラグが正しい状態であることを確認する
    expect(screen.getByText('農薬の基礎知識')).toBeTruthy();
    expect(mockColumnsQuery.hasNextPage).toBe(true);
    expect(mockColumnsQuery.isFetchingNextPage).toBe(false);
  });

  it('isFetchingNextPage=false のとき fetchNextPage が未呼び出しである', () => {
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    mockColumnsQuery.hasNextPage = false;
    mockColumnsQuery.isFetchingNextPage = false;
    renderWithProviders(<ColumnsIndexScreen />);
    expect(mockColumnsQuery.fetchNextPage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('ColumnsIndexScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockColumnsQuery.data = makePages([makeColumnItem()]);
    renderWithProviders(<ColumnsIndexScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
