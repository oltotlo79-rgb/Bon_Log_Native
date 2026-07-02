/**
 * app/fertilizers/categories/index のコンポーネントテスト。
 * ローディング・エラー・空状態・正常データ表示・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FertilizerCategoriesScreen from '@/app/fertilizers/categories/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockCategoriesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerNutrientsQuery: jest.fn(),
  useFertilizerCategoriesQuery: () => mockCategoriesQuery,
  useFertilizerTreeSpeciesQuery: jest.fn(),
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizationScheduleQuery: jest.fn(),
}));

jest.mock('@/components/fertilizer/CategoryComparisonCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    CategoryComparisonCard: ({
      name,
      description,
    }: {
      name: string;
      description: string;
    }) =>
      React.createElement(
        View,
        { accessibilityRole: 'text' },
        React.createElement(Text, null, name),
        React.createElement(Text, null, description)
      ),
  };
});

function makeCategoryItems() {
  return [
    {
      code: 'organic_solid',
      name: '有機固形肥料',
      description: '油粕・魚粉・骨粉などを主体とした固形有機肥料',
      merit: 'ゆっくり長く効く・土壌微生物を活性化する',
      demerit: '効果が出るまで時間がかかる',
      bonsaiUsage: '置き肥として鉢の縁に設置',
    },
    {
      code: 'liquid',
      name: '液体肥料',
      description: '水に溶かして使う速効性肥料',
      merit: '速効性・均一に広がる',
      demerit: '効果が短い',
      bonsaiUsage: '生長期に灌水と合わせて施す',
    },
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockCategoriesQuery.data = undefined;
  mockCategoriesQuery.isLoading = false;
  mockCategoriesQuery.isError = false;
  mockCategoriesQuery.refetch = jest.fn();
});

describe('FertilizerCategoriesScreen', () => {
  describe('ローディング', () => {
    it('isLoading=true のとき ScreenLoading が表示される', () => {
      mockCategoriesQuery.isLoading = true;
      renderWithProviders(<FertilizerCategoriesScreen />);
      expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき ScreenError が表示される', () => {
      mockCategoriesQuery.isError = true;
      renderWithProviders(<FertilizerCategoriesScreen />);
      expect(screen.getByText('肥料カテゴリを読み込めませんでした。')).toBeTruthy();
    });

    it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
      mockCategoriesQuery.isError = true;
      renderWithProviders(<FertilizerCategoriesScreen />);
      fireEvent.press(screen.getByLabelText('再試行する'));
      await waitFor(() => {
        expect(mockCategoriesQuery.refetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('空状態', () => {
    it('data が空配列のとき「データがありません」が表示される', () => {
      mockCategoriesQuery.data = [];
      renderWithProviders(<FertilizerCategoriesScreen />);
      expect(screen.getByText('データがありません')).toBeTruthy();
    });

    it('data が undefined のとき「データがありません」が表示される', () => {
      mockCategoriesQuery.data = undefined;
      renderWithProviders(<FertilizerCategoriesScreen />);
      expect(screen.getByText('データがありません')).toBeTruthy();
    });
  });

  describe('正常データ表示', () => {
    it('カテゴリ名「有機固形肥料」が表示される', () => {
      mockCategoriesQuery.data = makeCategoryItems();
      renderWithProviders(<FertilizerCategoriesScreen />);
      expect(screen.getByText('有機固形肥料')).toBeTruthy();
    });

    it('カテゴリ名「液体肥料」が表示される', () => {
      mockCategoriesQuery.data = makeCategoryItems();
      renderWithProviders(<FertilizerCategoriesScreen />);
      expect(screen.getByText('液体肥料')).toBeTruthy();
    });

    it('カテゴリの description が表示される', () => {
      mockCategoriesQuery.data = makeCategoryItems();
      renderWithProviders(<FertilizerCategoriesScreen />);
      expect(screen.getByText('油粕・魚粉・骨粉などを主体とした固形有機肥料')).toBeTruthy();
    });
  });

  describe('オフライン', () => {
    it('オフライン時に OfflineBanner が表示される', () => {
      mockUseOnlineStatus.mockReturnValue(false);
      mockCategoriesQuery.data = makeCategoryItems();
      renderWithProviders(<FertilizerCategoriesScreen />);
      const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
      expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
    });

    it('オフライン + エラー時も OfflineBanner が表示される', () => {
      mockUseOnlineStatus.mockReturnValue(false);
      mockCategoriesQuery.isError = true;
      renderWithProviders(<FertilizerCategoriesScreen />);
      const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
      expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
    });
  });
});
