/**
 * app/shops/[id]/reviews/index の盆栽園レビュー一覧画面テスト。
 * ローディング・エラー・空状態・正常表示・FAB 表示を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ShopReviewsScreen from '@/app/shops/[id]/reviews/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { REPORT_TARGET_LABELS } from '@/lib/constants/report';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseShopDetailQuery = jest.fn();
const mockUseShopReviewsQuery = jest.fn();
const mockUseCurrentUserQuery = jest.fn();

jest.mock('@/lib/queries/shops', () => ({
  useShopDetailQuery: (...args: unknown[]) => mockUseShopDetailQuery(...args),
  useShopReviewsQuery: (...args: unknown[]) => mockUseShopReviewsQuery(...args),
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

// ReportDialog は別コンポーネントのテスト（__tests__/components/report/ReportDialog.test.tsx）で
// 内部動作を検証するため、ここでは受け取った props を検証できる簡易スタブに置き換える
jest.mock('@/components/report/ReportDialog', () => ({
  ReportDialog: ({
    targetType,
    targetId,
    targetDisplayName,
    onClose,
  }: {
    targetType: string;
    targetId: string;
    targetDisplayName: string;
    onClose: () => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock ファクトリ内では ESM import が使えないため require を使用する（Jest 制約）
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="report-dialog">
        <Text testID="report-dialog-target-type">{targetType}</Text>
        <Text testID="report-dialog-target-id">{targetId}</Text>
        <Text testID="report-dialog-target-display-name">{targetDisplayName}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="通報ダイアログを閉じる">
          <Text>閉じる</Text>
        </Pressable>
      </View>
    );
  },
}));

function makeReview(overrides = {}) {
  return {
    id: 'review-1',
    rating: 4,
    content: '良い店舗でした',
    images: [],
    user: { id: 'user-1', nickname: '盆栽太郎', avatarUrl: null },
    createdAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeReviewsPage(items = [makeReview()]) {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ id: 'shop-1' });
  mockUseShopDetailQuery.mockReturnValue({ data: undefined });
  mockUseShopReviewsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isRefetching: false,
  });
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
});

describe('ShopReviewsScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のとき「レビュー」ヘッダーが表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('レビュー')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('レビューが 0 件のとき「まだレビューはありません」が表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('まだレビューはありません')).toBeTruthy();
    });
  });

  describe('正常表示', () => {
    it('レビュー一覧が表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview({ content: '良い店舗でした' })]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('良い店舗でした')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('レビュアーのニックネームが表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview({ user: { id: 'u1', nickname: '松太郎', avatarUrl: null } })]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('松太郎')).toBeTruthy();
    });

    it('平均評価が表示される（shop データあり）', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: {
          id: 'shop-1',
          name: '松苑',
          averageRating: 4.2,
          reviewCount: 5,
        },
      });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview()]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('5件のレビュー')).toBeTruthy();
    });
  });

  describe('FAB（レビューを書く）', () => {
    it('ログイン済みのときFABが表示される', () => {
      mockUseCurrentUserQuery.mockReturnValue({
        data: { id: 'user-1', nickname: 'テスト', isPremium: false },
      });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview()]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByRole('button', { name: 'レビューを書く' })).toBeTruthy();
    });

    it('未ログインのときFABが表示されない', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([makeReview()]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.queryByRole('button', { name: 'レビューを書く' })).toBeNull();
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が空のとき（配列）画面がクラッシュしない', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['shop-1', 'shop-2'] });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByText('まだレビューはありません')).toBeTruthy();
    });
  });

  describe('通報導線（レビュー）', () => {
    const reportButtonLabel = `この${REPORT_TARGET_LABELS.review}を通報する`;

    it('他人のレビューには通報ボタン（flag アイコン）が表示される', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'me' } });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([
          makeReview({ user: { id: 'other-user', nickname: '他ユーザー', avatarUrl: null } }),
        ]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.getByRole('button', { name: reportButtonLabel })).toBeTruthy();
    });

    it('自分のレビューには通報ボタンが表示されない', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'me' } });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([
          makeReview({ user: { id: 'me', nickname: '自分', avatarUrl: null } }),
        ]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.queryByRole('button', { name: reportButtonLabel })).toBeNull();
    });

    it('未ログイン時は通報ボタンが表示されない', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([
          makeReview({ user: { id: 'other-user', nickname: '他ユーザー', avatarUrl: null } }),
        ]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      expect(screen.queryByRole('button', { name: reportButtonLabel })).toBeNull();
    });

    it('通報ボタンを押すと ReportDialog が targetType="review" で開く', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'me' } });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([
          makeReview({
            id: 'review-9',
            user: { id: 'other-user', nickname: '他ユーザー', avatarUrl: null },
          }),
        ]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      fireEvent.press(screen.getByRole('button', { name: reportButtonLabel }));
      expect(screen.getByTestId('report-dialog-target-type').props.children).toBe('review');
      expect(screen.getByTestId('report-dialog-target-id').props.children).toBe('review-9');
      expect(screen.getByTestId('report-dialog-target-display-name').props.children).toBe('他ユーザーのレビュー');
    });

    it('ReportDialog の onClose で通報ダイアログが閉じる', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'me' } });
      mockUseShopReviewsQuery.mockReturnValue({
        data: makeReviewsPage([
          makeReview({
            id: 'review-9',
            user: { id: 'other-user', nickname: '他ユーザー', avatarUrl: null },
          }),
        ]),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isRefetching: false,
      });
      renderWithProviders(<ShopReviewsScreen />);
      fireEvent.press(screen.getByRole('button', { name: reportButtonLabel }));
      expect(screen.getByTestId('report-dialog')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: '通報ダイアログを閉じる' }));
      expect(screen.queryByTestId('report-dialog')).toBeNull();
    });
  });
});
