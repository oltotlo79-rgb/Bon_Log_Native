/**
 * app/pesticides/disease-pests/[slug]/index のコンポーネントテスト。
 * slug ガード・名称表示・関連農薬製品リスト・タップ遷移・エラー・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import DiseasePestDetailScreen from '@/app/pesticides/disease-pests/[slug]/index';
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

jest.mock('@/lib/queries/pesticides', () => ({
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideIngredientsQuery: jest.fn(),
  usePesticideDiseasePestDetailQuery: () => mockDetailQuery,
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeDiseasePestDetail(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'dp1',
    slug: 'aphid',
    name: 'アブラムシ',
    nameKana: 'あぶらむし',
    category: '害虫',
    description: '新芽や若葉に集団で付着する小型害虫。',
    effects: [
      {
        pesticide: {
          id: 'p1',
          slug: 'product-a',
          name: 'アブラムシ専用殺虫剤',
          pesticideType: '殺虫剤',
        },
      },
      {
        pesticide: {
          id: 'p2',
          slug: 'product-b',
          name: '総合殺虫剤B',
          pesticideType: '殺虫剤',
        },
      },
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
  mockDetailQuery.data = undefined;
  mockDetailQuery.isLoading = false;
  mockDetailQuery.isError = false;
  mockDetailQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'aphid' });
});

// ---------------------------------------------------------------------------
// slug ガード
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen slug ガード', () => {
  it('空文字 slug のとき「この情報は見つかりません。」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: '' });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('この情報は見つかりません。')).toBeTruthy();
  });

  it('配列 slug のとき先頭要素を使用し、isError でなければエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: ['aphid', 'other'] });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.queryByText('この情報は見つかりません。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockDetailQuery.isLoading = true;
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen エラー', () => {
  it('isError=true のとき「この情報は見つかりません。」が表示される', () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('この情報は見つかりません。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<DiseasePestDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen 正常表示', () => {
  it('病害虫名が表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('アブラムシ')).toBeTruthy();
  });

  it('カナ名が表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('あぶらむし')).toBeTruthy();
  });

  it('説明が表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('新芽や若葉に集団で付着する小型害虫。')).toBeTruthy();
  });

  it('関連農薬製品セクションと製品名が表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByText('関連農薬製品')).toBeTruthy();
    expect(screen.getByText('アブラムシ専用殺虫剤')).toBeTruthy();
    expect(screen.getByText('総合殺虫剤B')).toBeTruthy();
  });

  it('関連農薬製品タップで製品詳細へ push する', () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシ専用殺虫剤の詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/products/[slug]',
      params: { slug: 'product-a' },
    });
  });

  it('effects が空のとき「関連農薬製品」セクションが表示されない', () => {
    mockDetailQuery.data = makeDiseasePestDetail({ effects: [] });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.queryByText('関連農薬製品')).toBeNull();
  });

  it('nameKana が null のとき読みが表示されない', () => {
    mockDetailQuery.data = makeDiseasePestDetail({ nameKana: null });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.queryByText('あぶらむし')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<DiseasePestDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
