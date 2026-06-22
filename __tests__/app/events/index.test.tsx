/**
 * app/events/index の画面テスト。
 * ローディング・空状態・エラー・フィルタチップ・FAB（ログイン時のみ）・OfflineBanner を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import EventsScreen from '@/app/events/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseEventsListQuery = jest.fn();
jest.mock('@/lib/queries/events', () => ({
  useEventsListQuery: (...args: unknown[]) => mockUseEventsListQuery(...args),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

// EventCard のモック
jest.mock('@/components/events/EventCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    EventCard: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: 'button', accessibilityLabel: `${title}の詳細を見る` },
        React.createElement(Text, null, title)
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
  mockUseEventsListQuery.mockReturnValue(defaultQuery);
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
});

describe('EventsScreen', () => {
  describe('ヘッダー', () => {
    it('「イベント」というタイトルが表示される', () => {
      renderWithProviders(<EventsScreen />);
      expect(screen.getByText('イベント')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      renderWithProviders(<EventsScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });
  });

  describe('フィルタチップ', () => {
    it('「全国」チップが表示される', () => {
      renderWithProviders(<EventsScreen />);
      expect(screen.getByRole('radio', { name: '全国' })).toBeTruthy();
    });

    it('「関東」チップが表示される', () => {
      renderWithProviders(<EventsScreen />);
      expect(screen.getByRole('radio', { name: '関東' })).toBeTruthy();
    });

    it('「関東」チップタップでフィルタが更新される（useEventsListQuery に region が渡される）', () => {
      mockUseEventsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '関東' }));
      expect(mockUseEventsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ region: '関東' })
      );
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときヘッダーが表示される', () => {
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<EventsScreen />);
      expect(screen.getByText('イベント')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<EventsScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('items が空のとき「イベントがありません」が表示される', () => {
      mockUseEventsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<EventsScreen />);
      expect(screen.getByText('イベントがありません')).toBeTruthy();
    });
  });

  describe('FAB（ログイン時のみ）', () => {
    it('未ログイン時は「イベントを作成する」FABが表示されない', () => {
      mockUseEventsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      renderWithProviders(<EventsScreen />);
      expect(screen.queryByRole('button', { name: 'イベントを作成する' })).toBeNull();
    });

    it('ログイン時は「イベントを作成する」FABが表示される', () => {
      mockUseEventsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<EventsScreen />);
      expect(screen.getByRole('button', { name: 'イベントを作成する' })).toBeTruthy();
    });

    it('FABタップで新規イベント画面へ遷移する', () => {
      mockUseEventsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'イベントを作成する' }));
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  describe('データ表示', () => {
    it('イベントカードが表示される', () => {
      mockUseEventsListQuery.mockReturnValue({
        ...defaultQuery,
        data: {
          pages: [
            {
              items: [
                {
                  id: 'event-1',
                  title: '秋の盆栽展',
                  startDate: '2025-09-15',
                  endDate: null,
                  prefecture: '東京都',
                  city: null,
                  venue: null,
                  organizer: null,
                  admissionFee: null,
                  hasSales: false,
                  externalUrl: null,
                  description: null,
                  createdAt: '2025-06-01T00:00:00Z',
                  updatedAt: '2025-06-01T00:00:00Z',
                  userId: 'user-1',
                },
              ],
              nextCursor: null,
            },
          ],
          pageParams: [undefined],
        },
      });
      renderWithProviders(<EventsScreen />);
      expect(screen.getByText('秋の盆栽展')).toBeTruthy();
    });
  });

  describe('オフライン', () => {
    it('オフライン時に OfflineBanner が表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      mockUseEventsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      const { toJSON } = renderWithProviders(<EventsScreen />);
      expect(JSON.stringify(toJSON())).toContain('"accessibilityLiveRegion":"assertive"');
    });
  });
});
