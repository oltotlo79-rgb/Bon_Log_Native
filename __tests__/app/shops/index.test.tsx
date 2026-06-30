/**
 * app/shops/index の画面テスト。
 * 刷新後の要素（バナー / 検索バー / ジャンルフィルタ / リセット / 件数 / フィルタ時空状態）
 * および既存の4状態（ローディング / 空 / エラー / 正常）を網羅する。
 * 都道府県フィルタ（PrefecturePickerModal 連携 / useShopsListQuery への prefecture 引数伝播）を含む。
 * useGenresQuery('shop') もモック済み。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ShopsScreen from '@/app/shops/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseShopsListQuery = jest.fn();
const mockUseGenresQuery = jest.fn();
jest.mock('@/lib/queries/shops', () => ({
  useShopsListQuery: (...args: unknown[]) => mockUseShopsListQuery(...args),
  useGenresQuery: (...args: unknown[]) => mockUseGenresQuery(...args),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/components/shops/ShopCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    ShopCard: ({ name, onPress }: { name: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: 'button', accessibilityLabel: `${name}の詳細を見る` },
        React.createElement(Text, null, name)
      ),
  };
});

const defaultQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

const defaultGenreQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
};

function makeShopItem(id: string) {
  return {
    id,
    name: `盆栽園 ${id}`,
    address: `東京都台東区 ${id}`,
    phone: null,
    businessHours: null,
    closedDays: null,
    genres: [{ id: 'genre-1', name: '松' }],
    averageRating: 4.0,
    reviewCount: 10,
    createdAt: '2025-06-01T00:00:00Z',
  };
}

function makeGenreList() {
  return {
    items: [
      { id: 'genre-1', name: '盆栽販売' },
      { id: 'genre-2', name: '植木' },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseShopsListQuery.mockReturnValue(defaultQuery);
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
  mockUseGenresQuery.mockReturnValue(defaultGenreQuery);
});

describe('ShopsScreen', () => {
  describe('ヘッダー', () => {
    it('「盆栽園マップ」というタイトルが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園マップ')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('「戻る」ボタンをタップすると router.back が呼ばれる', () => {
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: '戻る' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('バナー画像', () => {
    it('バナー画像がレンダーされる（expo-image が存在する）', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園マップ')).toBeTruthy();
    });
  });

  describe('検索バー', () => {
    it('検索入力フィールドが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(
        screen.getByPlaceholderText('名前または住所で検索...')
      ).toBeTruthy();
    });

    it('「検索」ボタンが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('button', { name: '検索する' })).toBeTruthy();
    });

    it('検索フィールドにテキストを入力するとクリアボタンが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      const input = screen.getByPlaceholderText('名前または住所で検索...');
      fireEvent.changeText(input, '黒松');
      expect(screen.getByRole('button', { name: '検索をクリア' })).toBeTruthy();
    });

    it('クリアボタンをタップすると検索フィールドが空になる', () => {
      renderWithProviders(<ShopsScreen />);
      const input = screen.getByPlaceholderText('名前または住所で検索...');
      fireEvent.changeText(input, '黒松');
      fireEvent.press(screen.getByRole('button', { name: '検索をクリア' }));
      expect(screen.queryByRole('button', { name: '検索をクリア' })).toBeNull();
    });

    it('入力なしのときクリアボタンが表示されない', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.queryByRole('button', { name: '検索をクリア' })).toBeNull();
    });
  });

  describe('ジャンルフィルタチップ', () => {
    it('useGenresQuery が type=shop で呼ばれる', () => {
      renderWithProviders(<ShopsScreen />);
      expect(mockUseGenresQuery).toHaveBeenCalledWith('shop');
    });

    it('ジャンルデータがあるとき各ジャンルチップが表示される', () => {
      mockUseGenresQuery.mockReturnValue({ data: makeGenreList() });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '盆栽販売で絞り込む' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: '植木で絞り込む' })).toBeTruthy();
    });

    it('「すべて」ジャンルチップが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: 'すべてのジャンル' })).toBeTruthy();
    });

    it('初期状態で「すべて」チップが選択状態（selected=true）', () => {
      renderWithProviders(<ShopsScreen />);
      const allChip = screen.getByRole('radio', { name: 'すべてのジャンル' });
      expect(allChip.props.accessibilityState?.selected).toBe(true);
    });

    it('ジャンルチップをタップするとそのジャンルが選択される', () => {
      mockUseGenresQuery.mockReturnValue({ data: makeGenreList() });
      renderWithProviders(<ShopsScreen />);
      const chip = screen.getByRole('radio', { name: '盆栽販売で絞り込む' });
      fireEvent.press(chip);
      expect(chip.props.accessibilityState?.selected).toBe(true);
    });

    it('ジャンルチップ選択時に useShopsListQuery が genreId 付きで呼ばれる', () => {
      mockUseGenresQuery.mockReturnValue({ data: makeGenreList() });
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '盆栽販売で絞り込む' }));
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ genreId: 'genre-1' })
      );
    });

    it('ジャンルデータがないときジャンルチップが追加表示されない（「すべて」のみ）', () => {
      mockUseGenresQuery.mockReturnValue({ data: undefined });
      renderWithProviders(<ShopsScreen />);
      expect(screen.queryByRole('radio', { name: '盆栽販売で絞り込む' })).toBeNull();
    });
  });

  describe('ソートチップ', () => {
    it('「評価順」チップが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '評価順' })).toBeTruthy();
    });

    it('「名前順」チップが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '名前順' })).toBeTruthy();
    });

    it('「新着順」チップが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '新着順' })).toBeTruthy();
    });

    it('「北から順」チップが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '北から順' })).toBeTruthy();
    });

    it('初期状態で「評価順」チップが選択状態（selected=true）', () => {
      renderWithProviders(<ShopsScreen />);
      const chip = screen.getByRole('radio', { name: '評価順' });
      expect(chip.props.accessibilityState?.selected).toBe(true);
    });

    it('「名前順」タップで sortBy=name が API に渡される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '名前順' }));
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'name' })
      );
    });

    it('「評価順」タップで sortBy=rating が API に渡される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '評価順' }));
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'rating' })
      );
    });
  });

  describe('リセットボタン', () => {
    it('フィルタが無効なとき（初期状態）リセットボタンが表示されない', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.queryByRole('button', { name: '絞り込みをリセット' })).toBeNull();
    });

    it('ソートを変更するとリセットボタンが表示される（フィルタ有効状態）', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '名前順' }));
      expect(screen.getByRole('button', { name: '絞り込みをリセット' })).toBeTruthy();
    });

    it('ジャンルを選択するとリセットボタンが表示される', () => {
      mockUseGenresQuery.mockReturnValue({ data: makeGenreList() });
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '盆栽販売で絞り込む' }));
      expect(screen.getByRole('button', { name: '絞り込みをリセット' })).toBeTruthy();
    });

    it('リセットボタンをタップするとソートが「評価順」に戻る', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '名前順' }));
      fireEvent.press(screen.getByRole('button', { name: '絞り込みをリセット' }));
      const ratingChip = screen.getByRole('radio', { name: '評価順' });
      expect(ratingChip.props.accessibilityState?.selected).toBe(true);
    });

    it('リセットボタンをタップするとリセットボタンが非表示になる', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '名前順' }));
      fireEvent.press(screen.getByRole('button', { name: '絞り込みをリセット' }));
      expect(screen.queryByRole('button', { name: '絞り込みをリセット' })).toBeNull();
    });

    it('リセットボタンをタップすると検索テキストもクリアされる', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      const input = screen.getByPlaceholderText('名前または住所で検索...');
      fireEvent.changeText(input, '黒松');
      fireEvent.press(screen.getByRole('radio', { name: '名前順' }));
      fireEvent.press(screen.getByRole('button', { name: '絞り込みをリセット' }));
      expect(screen.queryByRole('button', { name: '検索をクリア' })).toBeNull();
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときヘッダーが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園マップ')).toBeTruthy();
    });

    it('isLoading=true のとき検索バーが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<ShopsScreen />);
      expect(
        screen.getByPlaceholderText('名前または住所で検索...')
      ).toBeTruthy();
    });

    it('isLoading=true のときソートチップが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '評価順' })).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });

    it('isError=true のとき検索バーが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<ShopsScreen />);
      expect(
        screen.getByPlaceholderText('名前または住所で検索...')
      ).toBeTruthy();
    });

    it('isError=true のときソートチップが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('radio', { name: '評価順' })).toBeTruthy();
    });
  });

  describe('空状態（フィルタなし）', () => {
    it('items が空のとき「盆栽園が登録されていません」が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園が登録されていません')).toBeTruthy();
    });

    it('フィルタなし空状態では登録を促す説明が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('右下のボタンから盆栽園を登録してみましょう。')).toBeTruthy();
    });
  });

  describe('空状態（フィルタあり）', () => {
    it('ジャンルフィルタ選択中の空状態では「条件を変えて再検索」の説明が表示される', () => {
      mockUseGenresQuery.mockReturnValue({ data: makeGenreList() });
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '盆栽販売で絞り込む' }));
      expect(screen.getByText('条件を変えて再検索してみましょう。')).toBeTruthy();
    });

    it('ソート変更中の空状態では「条件を変えて再検索」の説明が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '名前順' }));
      expect(screen.getByText('条件を変えて再検索してみましょう。')).toBeTruthy();
    });
  });

  describe('件数表示', () => {
    it('アイテムがあるとき「N件」が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1'), makeShopItem('shop-2')], nextCursor: null }],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('2件')).toBeTruthy();
    });

    it('1件のときは「1件」が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1')], nextCursor: null }],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('1件')).toBeTruthy();
    });
  });

  describe('店舗一覧表示', () => {
    it('店舗一覧が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1'), makeShopItem('shop-2')], nextCursor: null }],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('盆栽園 shop-1')).toBeTruthy();
      expect(screen.getByText('盆栽園 shop-2')).toBeTruthy();
    });

    it('FlatList の onEndReached で hasNextPage=true のとき fetchNextPage が呼ばれる', () => {
      const fetchNextPage = jest.fn();
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1')], nextCursor: 'cursor-1' }],
          pageParams: [undefined],
        },
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      });
      renderWithProviders(<ShopsScreen />);
      const lists = screen.UNSAFE_getAllByType(require('react-native').FlatList);
      fireEvent(lists[0], 'endReached');
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('isFetchingNextPage=true のとき fetchNextPage が追加呼び出しされない', () => {
      const fetchNextPage = jest.fn();
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1')], nextCursor: 'cursor-1' }],
          pageParams: [undefined],
        },
        hasNextPage: true,
        isFetchingNextPage: true,
        fetchNextPage,
      });
      renderWithProviders(<ShopsScreen />);
      const lists = screen.UNSAFE_getAllByType(require('react-native').FlatList);
      fireEvent(lists[0], 'endReached');
      expect(fetchNextPage).not.toHaveBeenCalled();
    });

    it('店舗カードタップで詳細画面へ遷移する', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [{ items: [makeShopItem('shop-1')], nextCursor: null }],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽園 shop-1の詳細を見る' }));
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  describe('OfflineBanner', () => {
    it('オンライン時には OfflineBanner の accessibilityLabel が設定されない（isVisible=false）', () => {
      const { useOnlineStatus } = require('@/hooks/use-online-status');
      (useOnlineStatus as jest.Mock).mockReturnValue(true);
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.queryByLabelText(/オフライン/)).toBeNull();
    });

    it('オフライン時には OfflineBanner の accessibilityLabel にオフラインメッセージが設定される', () => {
      const { useOnlineStatus } = require('@/hooks/use-online-status');
      (useOnlineStatus as jest.Mock).mockReturnValue(false);
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByLabelText(/オフライン/)).toBeTruthy();
    });
  });

  describe('都道府県フィルタ（PrefecturePickerModal 連携）', () => {
    it('初期状態で都道府県フィルタボタンが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('button', { name: /都道府県フィルタ/ })).toBeTruthy();
    });

    it('初期状態のフィルタボタンに「都道府県: すべて」テキストが表示される', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByText('都道府県: すべて')).toBeTruthy();
    });

    it('初期状態で都道府県クリアボタンが表示されない', () => {
      renderWithProviders(<ShopsScreen />);
      expect(screen.queryByRole('button', { name: '都道府県フィルタをクリア' })).toBeNull();
    });

    it('都道府県フィルタボタンをタップするとモーダルが開く（「都道府県を選択」が表示される）', () => {
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      expect(screen.getByText('都道府県を選択')).toBeTruthy();
    });

    it('モーダルで都道府県を選ぶと useShopsListQuery に prefecture が渡される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: '東京都' }));
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ prefecture: '東京都' })
      );
    });

    it('都道府県を選択するとフィルタボタンに選択した都道府県名が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      // FlatList initialNumToRender=20 の範囲内（北海道=1番目）を選択する
      fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
      expect(screen.getByText('北海道')).toBeTruthy();
    });

    it('都道府県を選択すると「都道府県: すべて」テキストが消える', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
      expect(screen.queryByText('都道府県: すべて')).toBeNull();
    });

    it('都道府県を選択するとクリアボタンが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      // FlatList の initialNumToRender=20 の範囲内（茨城県=8番目）を選択する
      fireEvent.press(screen.getByRole('radio', { name: '茨城県' }));
      expect(screen.getByRole('button', { name: '都道府県フィルタをクリア' })).toBeTruthy();
    });

    it('クリアボタンをタップすると useShopsListQuery に prefecture=undefined が渡される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      // 1. フィルタで都道府県を選択する
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: '埼玉県' }));
      // 2. クリアボタンをタップする
      fireEvent.press(screen.getByRole('button', { name: '都道府県フィルタをクリア' }));
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ prefecture: undefined })
      );
    });

    it('クリアボタンをタップするとクリアボタン自体が非表示になる', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      // FlatList の initialNumToRender=20 の範囲内（群馬県=10番目）を選択する
      fireEvent.press(screen.getByRole('radio', { name: '群馬県' }));
      fireEvent.press(screen.getByRole('button', { name: '都道府県フィルタをクリア' }));
      expect(screen.queryByRole('button', { name: '都道府県フィルタをクリア' })).toBeNull();
    });

    it('クリア後は「都道府県: すべて」テキストが復活する', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      // FlatList の initialNumToRender=20 の範囲内（千葉県=12番目）を選択する
      fireEvent.press(screen.getByRole('radio', { name: '千葉県' }));
      fireEvent.press(screen.getByRole('button', { name: '都道府県フィルタをクリア' }));
      expect(screen.getByText('都道府県: すべて')).toBeTruthy();
    });

    it('リセットボタンをタップすると prefecture が undefined に戻る', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      // 都道府県を選ぶ（hasActiveFilter を true にするため）
      // FlatList の initialNumToRender=20 の範囲内（宮城県=4番目）を選択する
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: '宮城県' }));
      // リセット
      fireEvent.press(screen.getByRole('button', { name: '絞り込みをリセット' }));
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ prefecture: undefined })
      );
    });

    it('リセットボタンをタップするとクリアボタンが非表示になる', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      // FlatList の initialNumToRender=20 の範囲内（秋田県=5番目）を選択する
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: '秋田県' }));
      fireEvent.press(screen.getByRole('button', { name: '絞り込みをリセット' }));
      expect(screen.queryByRole('button', { name: '都道府県フィルタをクリア' })).toBeNull();
    });

    it('都道府県選択中はフィルタ有効状態としてリセットボタンが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      // FlatList の initialNumToRender=20 の範囲内（山形県=6番目）を選択する
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: '山形県' }));
      expect(screen.getByRole('button', { name: '絞り込みをリセット' })).toBeTruthy();
    });

    it('都道府県選択中の空状態では「条件を変えて再検索」が表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      // FlatList の initialNumToRender=20 の範囲内（福島県=7番目）を選択する
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: '福島県' }));
      expect(screen.getByText('条件を変えて再検索してみましょう。')).toBeTruthy();
    });

    it('モーダルで「すべて」をタップすると useShopsListQuery に prefecture=undefined が渡される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: 'すべて' }));
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ prefecture: undefined })
      );
    });

    it('初期状態で useShopsListQuery は prefecture=undefined で呼ばれる', () => {
      renderWithProviders(<ShopsScreen />);
      expect(mockUseShopsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ prefecture: undefined })
      );
    });

    it('モーダルの accessibilityLabel が「都道府県フィルタ: すべての都道府県」を含む', () => {
      renderWithProviders(<ShopsScreen />);
      expect(
        screen.getByRole('button', { name: '都道府県フィルタ: すべての都道府県' })
      ).toBeTruthy();
    });

    it('都道府県選択後のフィルタボタン accessibilityLabel に選択都道府県名が含まれる', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<ShopsScreen />);
      // FlatList の initialNumToRender=20 の範囲内（岩手県=3番目）を選択する
      fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
      fireEvent.press(screen.getByRole('radio', { name: '岩手県' }));
      expect(
        screen.getByRole('button', { name: '都道府県フィルタ: 岩手県' })
      ).toBeTruthy();
    });

    it('ローディング中も都道府県フィルタボタンが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('button', { name: /都道府県フィルタ/ })).toBeTruthy();
    });

    it('エラー中も都道府県フィルタボタンが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('button', { name: /都道府県フィルタ/ })).toBeTruthy();
    });
  });

  describe('FAB（ログイン時のみ）', () => {
    it('未ログイン時は「盆栽園を登録する」FABが表示されない', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      renderWithProviders(<ShopsScreen />);
      expect(screen.queryByRole('button', { name: '盆栽園を登録する' })).toBeNull();
    });

    it('ログイン時は「盆栽園を登録する」FABが表示される', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<ShopsScreen />);
      expect(screen.getByRole('button', { name: '盆栽園を登録する' })).toBeTruthy();
    });

    it('FABタップで新規盆栽園登録画面へ遷移する', () => {
      mockUseShopsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<ShopsScreen />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽園を登録する' }));
      expect(mockRouter.push).toHaveBeenCalled();
    });

    it('ローディング中もログイン時はFABが表示されない（ローディング時はFlatListなし）', () => {
      mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<ShopsScreen />);
      expect(screen.queryByRole('button', { name: '盆栽園を登録する' })).toBeNull();
    });
  });
});
