/**
 * app/bonsai/index の画面テスト。
 * ローディング・空状態・エラー・FAB・OfflineBanner を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import BonsaiScreen from '@/app/bonsai/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseBonsaiListQuery = jest.fn();
jest.mock('@/lib/queries/bonsai', () => ({
  useBonsaiListQuery: () => mockUseBonsaiListQuery(),
}));

// BonsaiCard のモック
jest.mock('@/components/bonsai/BonsaiCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    BonsaiCard: ({ name, onPress }: { name: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: 'button', accessibilityLabel: `${name}の詳細` },
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

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBonsaiListQuery.mockReturnValue(defaultQuery);
});

describe('BonsaiScreen', () => {
  describe('ヘッダー', () => {
    it('「マイ盆栽」というタイトルが表示される', () => {
      renderWithProviders(<BonsaiScreen />);
      expect(screen.getByText('マイ盆栽')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      renderWithProviders(<BonsaiScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときヘッダーが表示される', () => {
      mockUseBonsaiListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<BonsaiScreen />);
      expect(screen.getByText('マイ盆栽')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseBonsaiListQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<BonsaiScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('items が空のとき「まだ盆栽が登録されていません」が表示される', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<BonsaiScreen />);
      expect(screen.getByText('まだ盆栽が登録されていません')).toBeTruthy();
    });
  });

  describe('FAB', () => {
    it('「盆栽を登録する」FABが表示される', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<BonsaiScreen />);
      expect(screen.getByRole('button', { name: '盆栽を登録する' })).toBeTruthy();
    });

    it('FABタップで新規盆栽登録画面へ遷移する', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<BonsaiScreen />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽を登録する' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/bonsai/new');
    });
  });

  describe('データ表示', () => {
    it('盆栽カードが表示される', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [
            {
              items: [
                {
                  id: 'bonsai-1',
                  name: '黒松',
                  species: null,
                  recordCount: 0,
                  latestRecord: null,
                  updatedAt: '2025-06-01T00:00:00Z',
                  acquiredAt: null,
                  description: null,
                  createdAt: '2025-06-01T00:00:00Z',
                },
              ],
              nextCursor: null,
            },
          ],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<BonsaiScreen />);
      expect(screen.getByText('黒松')).toBeTruthy();
    });

    it('盆栽カードタップで詳細画面へ遷移する', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [
            {
              items: [
                {
                  id: 'bonsai-1',
                  name: '黒松',
                  species: null,
                  recordCount: 0,
                  latestRecord: null,
                  updatedAt: '2025-06-01T00:00:00Z',
                  acquiredAt: null,
                  description: null,
                  createdAt: '2025-06-01T00:00:00Z',
                },
              ],
              nextCursor: null,
            },
          ],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<BonsaiScreen />);
      fireEvent.press(screen.getByRole('button', { name: '黒松の詳細' }));
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/bonsai/[id]',
        params: { id: 'bonsai-1' },
      });
    });
  });

  describe('オフライン', () => {
    it('オフライン時に OfflineBanner が表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      const { toJSON } = renderWithProviders(<BonsaiScreen />);
      expect(JSON.stringify(toJSON())).toContain('"accessibilityLiveRegion":"assertive"');
    });
  });
});
