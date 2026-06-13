/**
 * @module __tests__/app/(tabs)/feed-extended
 * FeedScreen の追加テスト（ローディング / エラー / 有データ / 無限スクロール）。
 * feed.test.tsx の既存テストと重複しないよう、新規ケースのみを扱う。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import FeedScreen from '@/app/(tabs)/feed/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeFeedItem } from '@/__tests__/utils/data-factories';
import { ERR_FEED_LOAD_FAILED } from '@/lib/constants/errors';

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
  useRegisterMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

const mockUseFeedQuery = jest.fn();

jest.mock('@/lib/queries/feed', () => ({
  useFeedQuery: () => mockUseFeedQuery(),
}));

const defaultFeedState = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
  isRefetching: false,
};

describe('FeedScreen - 拡張テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeedQuery.mockReturnValue(defaultFeedState);
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときローディングコンテンツが表示される（ヘッダーは残る）', () => {
      mockUseFeedQuery.mockReturnValue({ ...defaultFeedState, isLoading: true });
      renderWithProviders(<FeedScreen />);
      // ヘッダーは常時表示
      expect(screen.getByRole('header', { name: 'ホーム' })).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のときエラーメッセージが表示される', () => {
      mockUseFeedQuery.mockReturnValue({
        ...defaultFeedState,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<FeedScreen />);
      expect(screen.getByText(ERR_FEED_LOAD_FAILED)).toBeTruthy();
    });

    it('エラー時に再試行ボタンが表示される', () => {
      const refetch = jest.fn();
      mockUseFeedQuery.mockReturnValue({
        ...defaultFeedState,
        isError: true,
        error: new Error('Network error'),
        refetch,
      });
      renderWithProviders(<FeedScreen />);
      const retryButton = screen.getByRole('button', { name: '再試行' });
      expect(retryButton).toBeTruthy();
      fireEvent.press(retryButton);
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('有データ状態', () => {
    it('フィードアイテムがある場合に feed-list testID が存在する', () => {
      const item = makeFeedItem({ id: 'post-1', content: 'テスト投稿内容' });
      mockUseFeedQuery.mockReturnValue({
        ...defaultFeedState,
        data: { pages: [{ items: [item], nextCursor: null, isGuest: false }] },
      });
      renderWithProviders(<FeedScreen />);
      expect(screen.getByTestId('feed-list')).toBeTruthy();
    });

    it('複数アイテムがある場合もリストが表示される', () => {
      const items = [
        makeFeedItem({ id: 'post-1' }),
        makeFeedItem({ id: 'post-2' }),
      ];
      mockUseFeedQuery.mockReturnValue({
        ...defaultFeedState,
        data: { pages: [{ items, nextCursor: null, isGuest: false }] },
      });
      renderWithProviders(<FeedScreen />);
      expect(screen.getByTestId('feed-list')).toBeTruthy();
    });
  });

  describe('無限スクロール', () => {
    it('hasNextPage=true のとき onEndReached で fetchNextPage が呼ばれる', () => {
      const fetchNextPage = jest.fn();
      const item = makeFeedItem({ id: 'post-1' });
      mockUseFeedQuery.mockReturnValue({
        ...defaultFeedState,
        data: { pages: [{ items: [item], nextCursor: 'cursor-1', isGuest: false }] },
        hasNextPage: true,
        fetchNextPage,
      });
      renderWithProviders(<FeedScreen />);
      const list = screen.getByTestId('feed-list');
      fireEvent.scroll(list, {
        nativeEvent: {
          contentOffset: { y: 500 },
          contentSize: { height: 600, width: 400 },
          layoutMeasurement: { height: 100, width: 400 },
        },
      });
      // onEndReached トリガー
      fireEvent(list, 'endReached');
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('hasNextPage=false のとき onEndReached で fetchNextPage が呼ばれない', () => {
      const fetchNextPage = jest.fn();
      const item = makeFeedItem({ id: 'post-1' });
      mockUseFeedQuery.mockReturnValue({
        ...defaultFeedState,
        data: { pages: [{ items: [item], nextCursor: null, isGuest: false }] },
        hasNextPage: false,
        fetchNextPage,
      });
      renderWithProviders(<FeedScreen />);
      const list = screen.getByTestId('feed-list');
      fireEvent(list, 'endReached');
      expect(fetchNextPage).not.toHaveBeenCalled();
    });

    it('isFetchingNextPage=true のとき fetchNextPage が再度呼ばれない', () => {
      const fetchNextPage = jest.fn();
      const item = makeFeedItem({ id: 'post-1' });
      mockUseFeedQuery.mockReturnValue({
        ...defaultFeedState,
        data: { pages: [{ items: [item], nextCursor: 'cursor-1', isGuest: false }] },
        hasNextPage: true,
        isFetchingNextPage: true,
        fetchNextPage,
      });
      renderWithProviders(<FeedScreen />);
      const list = screen.getByTestId('feed-list');
      fireEvent(list, 'endReached');
      expect(fetchNextPage).not.toHaveBeenCalled();
    });
  });
});
