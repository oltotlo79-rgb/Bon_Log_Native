/**
 * app/pesticides/disease-pests/[slug]/index のライトボックスと同カテゴリリンクのテスト。
 * 画像タップ → ライトボックス開閉・閉じるボタン・同カテゴリリンクのナビゲーションを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import DiseasePestDetailScreen from '@/app/pesticides/disease-pests/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
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
    category: 'pest',
    description: '新芽や若葉に集団で付着する小型害虫。',
    imageUrl: 'https://cdn.example.com/aphid.jpg',
    bodySizeMinMm: null,
    bodySizeMaxMm: null,
    effects: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockDetailQuery.data = undefined;
  mockDetailQuery.isLoading = false;
  mockDetailQuery.isError = false;
  mockDetailQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'aphid' });
});

// ---------------------------------------------------------------------------
// ライトボックスの開閉
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen ライトボックス', () => {
  it('imageUrl がある場合、画像タップボタンが表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByLabelText('アブラムシの画像を大きく表示')).toBeTruthy();
  });

  it('画像タップでライトボックスが開く（「閉じる」ボタンが現れる）', async () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシの画像を大きく表示'));
    await waitFor(() => {
      expect(screen.getByLabelText('閉じる')).toBeTruthy();
    });
  });

  it('ライトボックスの「閉じる」ボタンでライトボックスが閉じる', async () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシの画像を大きく表示'));
    await waitFor(() => screen.getByLabelText('閉じる'));
    fireEvent.press(screen.getByLabelText('閉じる'));
    await waitFor(() => {
      expect(screen.queryByLabelText('閉じる')).toBeNull();
    });
  });

  it('ライトボックスの背景タップ（「画像を閉じる」）でライトボックスが閉じる', async () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシの画像を大きく表示'));
    await waitFor(() => screen.getByLabelText('画像を閉じる'));
    fireEvent.press(screen.getByLabelText('画像を閉じる'));
    await waitFor(() => {
      expect(screen.queryByLabelText('閉じる')).toBeNull();
    });
  });

  it('ライトボックスに拡大画像ラベルが表示される', async () => {
    mockDetailQuery.data = makeDiseasePestDetail();
    renderWithProviders(<DiseasePestDetailScreen />);
    fireEvent.press(screen.getByLabelText('アブラムシの画像を大きく表示'));
    await waitFor(() => {
      expect(screen.getByLabelText('アブラムシの拡大画像')).toBeTruthy();
    });
  });

  it('imageUrl が null の場合はライトボックス開くボタン自体が存在しない', () => {
    mockDetailQuery.data = makeDiseasePestDetail({ imageUrl: null });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.queryByLabelText('アブラムシの画像を大きく表示')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 同カテゴリリンク
// ---------------------------------------------------------------------------

describe('DiseasePestDetailScreen 同カテゴリリンク', () => {
  it('pest カテゴリのとき「同じカテゴリ（害虫）の病害虫を見る」リンクが表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetail({ category: 'pest' });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByLabelText('同じカテゴリ（害虫）の病害虫を見る')).toBeTruthy();
  });

  it('disease カテゴリのとき「同じカテゴリ（病害）の病害虫を見る」リンクが表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetail({ category: 'disease', effects: [] });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByLabelText('同じカテゴリ（病害）の病害虫を見る')).toBeTruthy();
  });

  it('beneficial_insect カテゴリのとき「同じカテゴリ（益虫）の病害虫を見る」リンクが表示される', () => {
    mockDetailQuery.data = makeDiseasePestDetail({ category: 'beneficial_insect' });
    renderWithProviders(<DiseasePestDetailScreen />);
    expect(screen.getByLabelText('同じカテゴリ（益虫）の病害虫を見る')).toBeTruthy();
  });

  it('同カテゴリリンクタップで /pesticides に category パラメータ付きで push する', () => {
    mockDetailQuery.data = makeDiseasePestDetail({ category: 'pest' });
    renderWithProviders(<DiseasePestDetailScreen />);
    fireEvent.press(screen.getByLabelText('同じカテゴリ（害虫）の病害虫を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides',
      params: { category: 'pest' },
    });
  });

  it('disease カテゴリリンクタップで category="disease" が渡される', () => {
    mockDetailQuery.data = makeDiseasePestDetail({ category: 'disease', effects: [] });
    renderWithProviders(<DiseasePestDetailScreen />);
    fireEvent.press(screen.getByLabelText('同じカテゴリ（病害）の病害虫を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides',
      params: { category: 'disease' },
    });
  });
});
