/**
 * app/shops/index の地方フィルタ関連テスト。
 * 地方フィルタ（RegionPickerModal 連携）と地方↔都道府県の排他制御を検証する。
 * 既存の index.test.tsx に都道府県テストが存在するため、地方フィルタを別ファイルで管理する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ShopsScreen from '@/app/shops/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// デフォルトのクエリ戻り値
// ---------------------------------------------------------------------------

const defaultQuery = {
  data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
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

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseShopsListQuery.mockReturnValue(defaultQuery);
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
  mockUseGenresQuery.mockReturnValue(defaultGenreQuery);
});

// ---------------------------------------------------------------------------
// 地方フィルタ（RegionPickerModal 連携）
// ---------------------------------------------------------------------------

describe('ShopsScreen 地方フィルタ（RegionPickerModal 連携）', () => {
  it('初期状態で地方フィルタボタンが表示される', () => {
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByRole('button', { name: /地方フィルタ/ })).toBeTruthy();
  });

  it('初期状態のフィルタボタンに「地方: すべて」テキストが表示される', () => {
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByText('地方: すべて')).toBeTruthy();
  });

  it('初期状態で地方クリアボタンが表示されない', () => {
    renderWithProviders(<ShopsScreen />);
    expect(screen.queryByRole('button', { name: '地方フィルタをクリア' })).toBeNull();
  });

  it('地方フィルタボタンをタップするとモーダルが開く（「地方を選択」が表示される）', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    expect(screen.getByText('地方を選択')).toBeTruthy();
  });

  it('モーダルで地方を選ぶと useShopsListQuery に region が渡される', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '関東' }));
    expect(mockUseShopsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ region: '関東' })
    );
  });

  it('地方を選択するとフィルタボタンに選択した地方名が表示される', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
    expect(screen.getByText('北海道')).toBeTruthy();
  });

  it('地方を選択すると「地方: すべて」テキストが消える', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '東北' }));
    expect(screen.queryByText('地方: すべて')).toBeNull();
  });

  it('地方を選択するとクリアボタンが表示される', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '近畿' }));
    expect(screen.getByRole('button', { name: '地方フィルタをクリア' })).toBeTruthy();
  });

  it('クリアボタンをタップすると useShopsListQuery に region=undefined が渡される', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '中部' }));
    fireEvent.press(screen.getByRole('button', { name: '地方フィルタをクリア' }));
    expect(mockUseShopsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ region: undefined })
    );
  });

  it('クリアボタンをタップするとクリアボタン自体が非表示になる', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '中国' }));
    fireEvent.press(screen.getByRole('button', { name: '地方フィルタをクリア' }));
    expect(screen.queryByRole('button', { name: '地方フィルタをクリア' })).toBeNull();
  });

  it('クリア後は「地方: すべて」テキストが復活する', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '四国' }));
    fireEvent.press(screen.getByRole('button', { name: '地方フィルタをクリア' }));
    expect(screen.getByText('地方: すべて')).toBeTruthy();
  });

  it('初期状態で useShopsListQuery は region=undefined で呼ばれる', () => {
    renderWithProviders(<ShopsScreen />);
    expect(mockUseShopsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ region: undefined })
    );
  });

  it('地方選択中はフィルタ有効状態としてリセットボタンが表示される', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '九州・沖縄' }));
    expect(screen.getByRole('button', { name: '絞り込みをリセット' })).toBeTruthy();
  });

  it('地方選択中の空状態では「条件を変えて再検索」が表示される', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '関東' }));
    expect(screen.getByText('条件を変えて再検索してみましょう。')).toBeTruthy();
  });

  it('モーダルで「すべて」をタップすると useShopsListQuery に region=undefined が渡される', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: 'すべて' }));
    expect(mockUseShopsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ region: undefined })
    );
  });

  it('ローディング中も地方フィルタボタンが表示される', () => {
    mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true, data: undefined });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByRole('button', { name: /地方フィルタ/ })).toBeTruthy();
  });

  it('エラー中も地方フィルタボタンが表示される', () => {
    mockUseShopsListQuery.mockReturnValue({ ...defaultQuery, isError: true, data: undefined });
    renderWithProviders(<ShopsScreen />);
    expect(screen.getByRole('button', { name: /地方フィルタ/ })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 地方↔都道府県の排他制御
// ---------------------------------------------------------------------------

describe('ShopsScreen 地方↔都道府県 排他制御', () => {
  it('地方を選択すると都道府県がリセットされ prefecture=undefined になる', () => {
    renderWithProviders(<ShopsScreen />);
    // まず都道府県を選択する
    fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
    // FlatList は PrefecturePickerModal のデフォルト実装（initialNumToRender=20）を使用
    // 初期レンダーで表示される「北海道」を選択する
    fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
    // 次に地方を選択する
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '東北' }));
    // prefecture=undefined、region=東北 で呼ばれることを確認
    expect(mockUseShopsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ region: '東北', prefecture: undefined })
    );
  });

  it('地方を選択すると都道府県クリアボタンが非表示になる', () => {
    renderWithProviders(<ShopsScreen />);
    // 都道府県を選択してクリアボタンを表示させる
    fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '東京都' }));
    expect(screen.getByRole('button', { name: '都道府県フィルタをクリア' })).toBeTruthy();
    // 地方を選択すると都道府県がリセットされる
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '関東' }));
    // 都道府県クリアボタンが非表示になる
    expect(screen.queryByRole('button', { name: '都道府県フィルタをクリア' })).toBeNull();
  });

  it('都道府県を選択すると地方がリセットされ region=undefined になる', () => {
    renderWithProviders(<ShopsScreen />);
    // まず地方を選択する
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '関東' }));
    // 次に都道府県を選択する（initialNumToRender=20 の範囲内）
    fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '東京都' }));
    // region=undefined、prefecture=東京都 で呼ばれることを確認
    expect(mockUseShopsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ region: undefined, prefecture: '東京都' })
    );
  });

  it('都道府県を選択すると地方クリアボタンが非表示になる', () => {
    renderWithProviders(<ShopsScreen />);
    // 地方を選択してクリアボタンを表示させる
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '近畿' }));
    expect(screen.getByRole('button', { name: '地方フィルタをクリア' })).toBeTruthy();
    // 都道府県を選択すると地方がリセットされる
    // PrefecturePickerModal の initialNumToRender=20 の範囲内（東京都=13番目）を選択する
    fireEvent.press(screen.getByRole('button', { name: /都道府県フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '東京都' }));
    // 地方クリアボタンが非表示になる
    expect(screen.queryByRole('button', { name: '地方フィルタをクリア' })).toBeNull();
  });

  it('リセットボタンをタップすると地方と都道府県がともに undefined になる', () => {
    renderWithProviders(<ShopsScreen />);
    // 地方を選択する
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '中部' }));
    // リセットボタンをタップする
    fireEvent.press(screen.getByRole('button', { name: '絞り込みをリセット' }));
    expect(mockUseShopsListQuery).toHaveBeenCalledWith(
      expect.objectContaining({ region: undefined, prefecture: undefined })
    );
  });

  it('リセットボタンをタップすると地方クリアボタンが非表示になる', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '東北' }));
    fireEvent.press(screen.getByRole('button', { name: '絞り込みをリセット' }));
    expect(screen.queryByRole('button', { name: '地方フィルタをクリア' })).toBeNull();
  });

  it('地方フィルタボタンの accessibilityLabel に選択地方名が含まれる', () => {
    renderWithProviders(<ShopsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /地方フィルタ/ }));
    fireEvent.press(screen.getByRole('radio', { name: '九州・沖縄' }));
    expect(
      screen.getByRole('button', { name: '地方フィルタ: 九州・沖縄' })
    ).toBeTruthy();
  });

  it('初期状態の地方フィルタ accessibilityLabel が「地方フィルタ: すべて」', () => {
    renderWithProviders(<ShopsScreen />);
    expect(
      screen.getByRole('button', { name: '地方フィルタ: すべて' })
    ).toBeTruthy();
  });
});
