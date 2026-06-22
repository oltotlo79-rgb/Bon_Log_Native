/**
 * app/dictionary/[slug]/index のコンポーネントテスト。
 * slug ガード・本文表示・関連語・前後ナビ・エラー・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import DictionaryDetailScreen from '@/app/dictionary/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockDetailQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/dictionary', () => ({
  useDictionaryListQuery: jest.fn(),
  useDictionaryDetailQuery: () => mockDetailQuery,
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeDetailData(overrides?: Partial<Record<string, unknown>>) {
  return {
    term: {
      id: 't1',
      slug: 'kuromatsu',
      term: '黒松',
      reading: 'くろまつ',
      category: '樹木管理',
      description: '黒松は日本の代表的な盆栽用樹種です。',
    },
    related: [
      { id: 'r1', slug: 'goyomatsu', term: '五葉松', reading: 'ごようまつ' },
    ],
    prev: { id: 'p1', slug: 'kakihan', term: '柿葉' },
    next: { id: 'n1', slug: 'keyaki', term: '欅' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockDetailQuery.data = undefined;
  mockDetailQuery.isLoading = false;
  mockDetailQuery.isError = false;
  mockDetailQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'kuromatsu' });
});

// ---------------------------------------------------------------------------
// slug ガード
// ---------------------------------------------------------------------------

describe('DictionaryDetailScreen slug ガード', () => {
  it('空文字 slug のとき「この用語は見つかりません。」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: '' });
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByText('この用語は見つかりません。')).toBeTruthy();
  });

  it('配列 slug のとき先頭要素（kuromatsu）を使用し、isError でなければエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: ['kuromatsu', 'goyomatsu'] });
    renderWithProviders(<DictionaryDetailScreen />);
    // slug = 'kuromatsu'（非空）、isError=false → エラー画面ではない
    expect(screen.queryByText('この用語は見つかりません。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('DictionaryDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockDetailQuery.isLoading = true;
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('DictionaryDetailScreen エラー', () => {
  it('isError=true のとき「この用語は見つかりません。」が表示される', () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByText('この用語は見つかりません。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<DictionaryDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('DictionaryDetailScreen 正常表示', () => {
  it('用語名が表示される', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByText('黒松')).toBeTruthy();
  });

  it('読みが表示される', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByText('くろまつ')).toBeTruthy();
  });

  it('説明文が表示される', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByText('黒松は日本の代表的な盆栽用樹種です。')).toBeTruthy();
  });

  it('関連語チップが表示される', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByLabelText('五葉松の詳細を見る')).toBeTruthy();
  });

  it('関連語チップタップで push する', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    fireEvent.press(screen.getByLabelText('五葉松の詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/dictionary/[slug]',
      params: { slug: 'goyomatsu' },
    });
  });

  it('前の用語ナビが表示される', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByLabelText('前の用語: 柿葉')).toBeTruthy();
  });

  it('次の用語ナビが表示される', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.getByLabelText('次の用語: 欅')).toBeTruthy();
  });

  it('前の用語タップで push する', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    fireEvent.press(screen.getByLabelText('前の用語: 柿葉'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/dictionary/[slug]',
      params: { slug: 'kakihan' },
    });
  });

  it('次の用語タップで push する', () => {
    mockDetailQuery.data = makeDetailData();
    renderWithProviders(<DictionaryDetailScreen />);
    fireEvent.press(screen.getByLabelText('次の用語: 欅'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/dictionary/[slug]',
      params: { slug: 'keyaki' },
    });
  });

  it('関連語が空のとき「関連語」セクションが表示されない', () => {
    mockDetailQuery.data = makeDetailData({ related: [] });
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.queryByText('関連語')).toBeNull();
  });

  it('prev が null のとき前ナビが表示されない', () => {
    mockDetailQuery.data = makeDetailData({ prev: null });
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.queryByLabelText(/前の用語/)).toBeNull();
  });

  it('next が null のとき次ナビが表示されない', () => {
    mockDetailQuery.data = makeDetailData({ next: null });
    renderWithProviders(<DictionaryDetailScreen />);
    expect(screen.queryByLabelText(/次の用語/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('DictionaryDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<DictionaryDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
