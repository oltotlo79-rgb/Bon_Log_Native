/**
 * app/events/index の画面テスト。
 * カレンダービュー / リストビュー切り替え・RegionFilterBar・FAB（ログイン時のみ）・
 * ローディング・空状態・エラー・OfflineBanner を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
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

// ---------------------------------------------------------------------------
// 子コンポーネントのモック
// EventCalendarNative は react-native-calendars に依存しているためモック化する。
// EventsRegionFilterBar / EventsViewToggleBar は実コンポーネントを使うと
// 追加の依存チェーンが深くなるのでシンプルなモックで代替する。
// ---------------------------------------------------------------------------

jest.mock('@/components/events/EventCalendarNative', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    EventCalendarNative: () =>
      React.createElement(View, null, React.createElement(Text, null, 'カレンダービュー')),
  };
});

jest.mock('@/components/events/EventsRegionFilterBar', () => {
  const React = require('react');
  const { View, Pressable, Text } = require('react-native');
  return {
    EventsRegionFilterBar: ({
      selectedRegion,
      onRegionChange,
    }: {
      selectedRegion: string;
      onRegionChange: (region: string) => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'radio',
            accessibilityLabel: '全国',
            accessibilityState: { selected: selectedRegion === '' },
            onPress: () => onRegionChange(''),
          },
          React.createElement(Text, null, '全国')
        ),
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'radio',
            accessibilityLabel: '関東',
            accessibilityState: { selected: selectedRegion === '関東' },
            onPress: () => onRegionChange('関東'),
          },
          React.createElement(Text, null, '関東')
        )
      ),
  };
});

jest.mock('@/components/events/EventsViewToggleBar', () => {
  const React = require('react');
  const { View, Pressable, Text } = require('react-native');
  return {
    EventsViewToggleBar: ({
      viewMode,
      onViewModeChange,
    }: {
      viewMode: string;
      showPast: boolean;
      onViewModeChange: (mode: string) => void;
      onShowPastChange: (v: boolean) => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'radio',
            accessibilityLabel: 'カレンダー表示',
            accessibilityState: { selected: viewMode === 'calendar' },
            onPress: () => onViewModeChange('calendar'),
          },
          React.createElement(Text, null, 'カレンダー')
        ),
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'radio',
            accessibilityLabel: 'リスト表示',
            accessibilityState: { selected: viewMode === 'list' },
            onPress: () => onViewModeChange('list'),
          },
          React.createElement(Text, null, 'リスト')
        )
      ),
  };
});

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

// ---------------------------------------------------------------------------
// デフォルトのクエリデータ
// ---------------------------------------------------------------------------

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

function makeItem(
  id: string,
  title: string,
  startDate: string,
  prefecture: string | null = null
) {
  return {
    id,
    title,
    startDate,
    endDate: null,
    prefecture,
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
  };
}

const oneItemData = {
  pages: [
    {
      items: [makeItem('event-1', '秋の盆栽展', '2099-09-15', '東京都')],
      nextCursor: null,
    },
  ],
  pageParams: [undefined],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseEventsListQuery.mockReturnValue(defaultQuery);
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
});

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // ビュー切り替え
  // ---------------------------------------------------------------------------

  describe('ビュー切り替え', () => {
    it('初期状態でカレンダービューが表示される', () => {
      renderWithProviders(<EventsScreen />);
      expect(screen.getByText('カレンダービュー')).toBeTruthy();
    });

    it('「リスト表示」ボタンをタップするとリストビューに切り替わる', () => {
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: 'リスト表示' }));
      // リストビューではカレンダービューのコンテンツが消える
      expect(screen.queryByText('カレンダービュー')).toBeNull();
    });

    it('リストビューに切り替えた後「カレンダー表示」で戻れる', () => {
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: 'リスト表示' }));
      fireEvent.press(screen.getByRole('radio', { name: 'カレンダー表示' }));
      expect(screen.getByText('カレンダービュー')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // フィルタチップ（RegionFilterBar）
  // ---------------------------------------------------------------------------

  describe('フィルタチップ', () => {
    it('「全国」チップが表示される', () => {
      renderWithProviders(<EventsScreen />);
      expect(screen.getByRole('radio', { name: '全国' })).toBeTruthy();
    });

    it('「関東」チップが表示される', () => {
      renderWithProviders(<EventsScreen />);
      expect(screen.getByRole('radio', { name: '関東' })).toBeTruthy();
    });

    it('「関東」チップをタップすると useEventsListQuery に region が渡される', () => {
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: '関東' }));
      expect(mockUseEventsListQuery).toHaveBeenCalledWith(
        expect.objectContaining({ region: '関東' })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // ローディング状態
  // ---------------------------------------------------------------------------

  describe('ローディング状態', () => {
    it('isLoading=true のときヘッダーが表示される（画面はマウントされる）', () => {
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
      renderWithProviders(<EventsScreen />);
      expect(screen.getByText('イベント')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // エラー状態（リストビューのみ早期リターン）
  // ---------------------------------------------------------------------------

  describe('エラー状態', () => {
    it('リストビューで isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery, isError: true });
      renderWithProviders(<EventsScreen />);
      // リストビューに切り替えてエラー確認
      fireEvent.press(screen.getByRole('radio', { name: 'リスト表示' }));
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // 空状態（リストビュー）
  // ---------------------------------------------------------------------------

  describe('空状態', () => {
    it('リストビューで items が空のとき「イベントがありません」が表示される', () => {
      mockUseEventsListQuery.mockReturnValue({
        ...defaultQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: 'リスト表示' }));
      expect(screen.getByText('イベントがありません')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // FAB（ログイン時のみ）
  // ---------------------------------------------------------------------------

  describe('FAB（ログイン時のみ）', () => {
    it('未ログイン時は「イベントを作成する」FABが表示されない', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      renderWithProviders(<EventsScreen />);
      expect(screen.queryByRole('button', { name: 'イベントを作成する' })).toBeNull();
    });

    it('ログイン時は「イベントを作成する」FABが表示される', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<EventsScreen />);
      expect(screen.getByRole('button', { name: 'イベントを作成する' })).toBeTruthy();
    });

    it('FABタップで新規イベント画面へ遷移する', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'イベントを作成する' }));
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // データ表示（リストビュー）
  // ---------------------------------------------------------------------------

  describe('データ表示', () => {
    it('リストビューでイベントカードが表示される', () => {
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery, data: oneItemData });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: 'リスト表示' }));
      expect(screen.getByText('秋の盆栽展')).toBeTruthy();
    });

    it('リストビューで件数「1件」がリストヘッダーに表示される', () => {
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery, data: oneItemData });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: 'リスト表示' }));
      expect(screen.getByText('1件')).toBeTruthy();
    });

    it('リストビューで複数ページのデータは結合した件数で表示される', () => {
      const twoPageData = {
        pages: [
          { items: [makeItem('e1', '展覧会1', '2099-09-01')], nextCursor: 'cursor1' },
          { items: [makeItem('e2', '展覧会2', '2099-09-10')], nextCursor: null },
        ],
        pageParams: [undefined, 'cursor1'],
      };
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery, data: twoPageData });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: 'リスト表示' }));
      expect(screen.getByText('2件')).toBeTruthy();
    });

    it('リストビューでイベントカードタップで詳細画面へ遷移する', async () => {
      mockUseEventsListQuery.mockReturnValue({ ...defaultQuery, data: oneItemData });
      renderWithProviders(<EventsScreen />);
      fireEvent.press(screen.getByRole('radio', { name: 'リスト表示' }));
      await waitFor(() => {
        expect(screen.getByLabelText('秋の盆栽展の詳細を見る')).toBeTruthy();
      });
      fireEvent.press(screen.getByLabelText('秋の盆栽展の詳細を見る'));
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // オフライン
  // ---------------------------------------------------------------------------

  describe('オフライン', () => {
    it('オフライン時に OfflineBanner（ERR_OFFLINE メッセージ）が表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      renderWithProviders(<EventsScreen />);
      const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
      expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
    });
  });
});
