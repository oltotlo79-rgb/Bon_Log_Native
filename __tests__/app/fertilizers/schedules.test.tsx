/**
 * app/fertilizers/schedules/index のコンポーネントテスト。
 * 松柏・雑木のセクション表示・ローディング・エラー・空状態・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FertilizerSchedulesScreen from '@/app/fertilizers/schedules/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockTreeSpeciesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerNutrientsQuery: jest.fn(),
  useFertilizerCategoriesQuery: jest.fn(),
  useFertilizerTreeSpeciesQuery: () => mockTreeSpeciesQuery,
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizationScheduleQuery: jest.fn(),
}));

jest.mock('@/components/fertilizer/TreeSpeciesCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    TreeSpeciesCard: ({
      name,
      slug,
      onPress,
    }: {
      name: string;
      category: string;
      fertilizingPolicy: string | null;
      slug: string;
      onPress: (slug: string, name: string) => void;
    }) =>
      React.createElement(
        Pressable,
        {
          onPress: () => onPress(slug, name),
          accessibilityRole: 'button',
          accessibilityLabel: `${name}の詳細を見る`,
        },
        React.createElement(Text, null, name)
      ),
  };
});

const mockRouter = jest.requireMock('expo-router').router;

function makeTreeSpecies() {
  return [
    {
      id: 'ts1',
      slug: 'kuromatsu',
      name: '黒松',
      category: 'conifer',
      fertilizingPolicy: '春と秋の二季施肥が基本',
    },
    {
      id: 'ts2',
      slug: 'goyomatsu',
      name: '五葉松',
      category: 'conifer',
      fertilizingPolicy: '控えめに施肥する',
    },
    {
      id: 'ts3',
      slug: 'keyaki',
      name: '欅',
      category: 'deciduous',
      fertilizingPolicy: '春から秋にかけてしっかり施肥する',
    },
    {
      id: 'ts4',
      slug: 'kaede',
      name: '楓',
      category: 'deciduous',
      fertilizingPolicy: '夏は控えめにする',
    },
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockTreeSpeciesQuery.data = undefined;
  mockTreeSpeciesQuery.isLoading = false;
  mockTreeSpeciesQuery.isError = false;
  mockTreeSpeciesQuery.refetch = jest.fn();
});

describe('FertilizerSchedulesScreen', () => {
  describe('ローディング', () => {
    it('isLoading=true のとき ScreenLoading が表示される', () => {
      mockTreeSpeciesQuery.isLoading = true;
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき ScreenError が表示される', () => {
      mockTreeSpeciesQuery.isError = true;
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('樹種情報を読み込めませんでした。')).toBeTruthy();
    });

    it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
      mockTreeSpeciesQuery.isError = true;
      renderWithProviders(<FertilizerSchedulesScreen />);
      fireEvent.press(screen.getByLabelText('再試行する'));
      await waitFor(() => {
        expect(mockTreeSpeciesQuery.refetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('空状態', () => {
    it('data が空配列のとき「データがありません」が表示される', () => {
      mockTreeSpeciesQuery.data = [];
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('データがありません')).toBeTruthy();
    });
  });

  describe('セクション表示', () => {
    it('「松柏類」セクションヘッダーが表示される', () => {
      mockTreeSpeciesQuery.data = makeTreeSpecies();
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('松柏類')).toBeTruthy();
    });

    it('「雑木類」セクションヘッダーが表示される', () => {
      mockTreeSpeciesQuery.data = makeTreeSpecies();
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('雑木類')).toBeTruthy();
    });

    it('松柏類の「黒松」が表示される', () => {
      mockTreeSpeciesQuery.data = makeTreeSpecies();
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('黒松')).toBeTruthy();
    });

    it('松柏類の「五葉松」が表示される', () => {
      mockTreeSpeciesQuery.data = makeTreeSpecies();
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('五葉松')).toBeTruthy();
    });

    it('雑木類の「欅」が表示される', () => {
      mockTreeSpeciesQuery.data = makeTreeSpecies();
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('欅')).toBeTruthy();
    });

    it('雑木類の「楓」が表示される', () => {
      mockTreeSpeciesQuery.data = makeTreeSpecies();
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('楓')).toBeTruthy();
    });

    it('conifer のみの場合「松柏類」のみ表示される（雑木類セクションは非表示）', () => {
      mockTreeSpeciesQuery.data = [
        {
          id: 'ts1',
          slug: 'kuromatsu',
          name: '黒松',
          category: 'conifer',
          fertilizingPolicy: null,
        },
      ];
      renderWithProviders(<FertilizerSchedulesScreen />);
      expect(screen.getByText('松柏類')).toBeTruthy();
      expect(screen.queryByText('雑木類')).toBeNull();
    });
  });

  describe('樹種カードのタップ遷移', () => {
    it('「黒松」カードタップで /fertilizers/tree-species/[slug] へ push する', () => {
      mockTreeSpeciesQuery.data = makeTreeSpecies();
      renderWithProviders(<FertilizerSchedulesScreen />);
      fireEvent.press(screen.getByLabelText('黒松の詳細を見る'));
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/fertilizers/tree-species/[slug]',
        params: { slug: 'kuromatsu', name: '黒松' },
      });
    });
  });

  describe('オフライン', () => {
    it('オフライン時に OfflineBanner が表示される', () => {
      mockUseOnlineStatus.mockReturnValue(false);
      mockTreeSpeciesQuery.data = makeTreeSpecies();
      renderWithProviders(<FertilizerSchedulesScreen />);
      const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
      expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
    });
  });
});
