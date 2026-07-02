/**
 * app/fertilizers/nutrients/index のコンポーネントテスト。
 * primary / secondary / trace セクション分け・ローディング・エラー・空状態・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FertilizerNutrientsScreen from '@/app/fertilizers/nutrients/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockNutrientsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerNutrientsQuery: () => mockNutrientsQuery,
  useFertilizerCategoriesQuery: jest.fn(),
  useFertilizerTreeSpeciesQuery: jest.fn(),
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizationScheduleQuery: jest.fn(),
}));

jest.mock('@/components/fertilizer/NutrientCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    NutrientCard: ({
      name,
      symbol,
      slug,
      onPress,
    }: {
      name: string;
      symbol: string;
      slug: string;
      category: string;
      bonsaiRole: string;
      onPress: (slug: string) => void;
    }) =>
      React.createElement(
        Pressable,
        {
          onPress: () => onPress(slug),
          accessibilityRole: 'button',
          accessibilityLabel: `${name}の詳細を見る`,
        },
        React.createElement(Text, null, symbol),
        React.createElement(Text, null, name)
      ),
  };
});

const mockRouter = jest.requireMock('expo-router').router;

function makeNutrients() {
  return [
    {
      id: 'n1',
      slug: 'nitrogen',
      name: '窒素',
      symbol: 'N',
      category: 'primary',
      bonsaiRole: '葉と枝の生長を促進する',
    },
    {
      id: 'n2',
      slug: 'phosphorus',
      name: 'リン酸',
      symbol: 'P',
      category: 'primary',
      bonsaiRole: '花芽と根の発達を助ける',
    },
    {
      id: 'n3',
      slug: 'potassium',
      name: 'カリウム',
      symbol: 'K',
      category: 'primary',
      bonsaiRole: '耐寒性と茎の強度に関わる',
    },
    {
      id: 'n4',
      slug: 'calcium',
      name: 'カルシウム',
      symbol: 'Ca',
      category: 'secondary',
      bonsaiRole: '細胞壁を強化する',
    },
    {
      id: 'n5',
      slug: 'magnesium',
      name: 'マグネシウム',
      symbol: 'Mg',
      category: 'secondary',
      bonsaiRole: 'クロロフィルの中心元素',
    },
    {
      id: 'n6',
      slug: 'iron',
      name: '鉄',
      symbol: 'Fe',
      category: 'trace',
      bonsaiRole: 'クロロフィル合成に必要',
    },
  ];
}

// trace 単独データ: SectionList の仮想化で primary/secondary が先頭にある場合
// trace アイテムが初期レンダリングウィンドウ外に押し出されることがあるため
// trace のみのデータセットを用意する。
function makeTraceOnlyNutrients() {
  return [
    {
      id: 'n6',
      slug: 'iron',
      name: '鉄',
      symbol: 'Fe',
      category: 'trace',
      bonsaiRole: 'クロロフィル合成に必要',
    },
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockNutrientsQuery.data = undefined;
  mockNutrientsQuery.isLoading = false;
  mockNutrientsQuery.isError = false;
  mockNutrientsQuery.refetch = jest.fn();
});

describe('FertilizerNutrientsScreen', () => {
  describe('ローディング', () => {
    it('isLoading=true のとき ScreenLoading が表示される', () => {
      mockNutrientsQuery.isLoading = true;
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき ScreenError が表示される', () => {
      mockNutrientsQuery.isError = true;
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('栄養素情報を読み込めませんでした。')).toBeTruthy();
    });

    it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
      mockNutrientsQuery.isError = true;
      renderWithProviders(<FertilizerNutrientsScreen />);
      fireEvent.press(screen.getByLabelText('再試行する'));
      await waitFor(() => {
        expect(mockNutrientsQuery.refetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('空状態', () => {
    it('data が空配列のとき「データがありません」が表示される', () => {
      mockNutrientsQuery.data = [];
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('データがありません')).toBeTruthy();
    });
  });

  describe('セクション表示', () => {
    it('「三大要素」セクションヘッダーが表示される', () => {
      mockNutrientsQuery.data = makeNutrients();
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('三大要素')).toBeTruthy();
    });

    it('「二次要素」セクションヘッダーが表示される', () => {
      mockNutrientsQuery.data = makeNutrients();
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('二次要素')).toBeTruthy();
    });

    it('「微量要素」セクションヘッダーが表示される', () => {
      mockNutrientsQuery.data = makeNutrients();
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('微量要素')).toBeTruthy();
    });

    it('primary カテゴリの「窒素」が表示される', () => {
      mockNutrientsQuery.data = makeNutrients();
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('窒素')).toBeTruthy();
    });

    it('secondary カテゴリの「カルシウム」が表示される', () => {
      mockNutrientsQuery.data = makeNutrients();
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('カルシウム')).toBeTruthy();
    });

    it('trace カテゴリの「鉄」が表示される（trace 単独データでセクションを確認）', () => {
      mockNutrientsQuery.data = makeTraceOnlyNutrients();
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('微量要素')).toBeTruthy();
      expect(screen.getByText('鉄')).toBeTruthy();
    });

    it('primary のみの場合「三大要素」のみ表示される（secondary / trace セクションは非表示）', () => {
      mockNutrientsQuery.data = [
        {
          id: 'n1',
          slug: 'nitrogen',
          name: '窒素',
          symbol: 'N',
          category: 'primary',
          bonsaiRole: '葉と枝の生長を促進する',
        },
      ];
      renderWithProviders(<FertilizerNutrientsScreen />);
      expect(screen.getByText('三大要素')).toBeTruthy();
      expect(screen.queryByText('二次要素')).toBeNull();
      expect(screen.queryByText('微量要素')).toBeNull();
    });
  });

  describe('栄養素チップのタップ遷移', () => {
    it('「窒素」カードタップで /fertilizers/nutrients/[slug] へ push する', () => {
      mockNutrientsQuery.data = makeNutrients();
      renderWithProviders(<FertilizerNutrientsScreen />);
      fireEvent.press(screen.getByLabelText('窒素の詳細を見る'));
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/fertilizers/nutrients/[slug]',
        params: { slug: 'nitrogen' },
      });
    });
  });

  describe('オフライン', () => {
    it('オフライン時に OfflineBanner が表示される', () => {
      mockUseOnlineStatus.mockReturnValue(false);
      mockNutrientsQuery.data = makeNutrients();
      renderWithProviders(<FertilizerNutrientsScreen />);
      const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
      expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
    });
  });
});
