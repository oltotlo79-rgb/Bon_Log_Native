/**
 * app/shops/[id]/index の盆栽園詳細画面テスト。
 * ローディング・エラー（not-found/forbidden/汎用）・正常表示・オーナーメニューを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import ShopDetailScreen from '@/app/shops/[id]/index';
import { ApiError } from '@/lib/api/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

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

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

function makeShop(overrides = {}) {
  return {
    id: 'shop-1',
    name: '盆栽専門店 松苑',
    address: '東京都新宿区1-1-1',
    averageRating: 4.2,
    reviewCount: 10,
    isOwner: false,
    genres: [{ id: 'genre-1', name: '販売', type: 'shop' }],
    latitude: null,
    longitude: null,
    phone: null,
    website: null,
    businessHours: null,
    closedDays: null,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'shop-1' });
  mockUseShopDetailQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseShopReviewsQuery.mockReturnValue({ data: undefined, isLoading: false });
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
});

describe('ShopDetailScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のとき「盆栽園詳細」ヘッダーが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('盆栽園詳細')).toBeTruthy();
    });
  });

  describe('404 not-found', () => {
    it('id が空のとき「店舗が見つかりません」が表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('店舗が見つかりません')).toBeTruthy();
    });

    it('404 エラーのとき「店舗が見つかりません」が表示される', () => {
      const err = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'NOT_FOUND' });
      mockUseShopDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: err,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('店舗が見つかりません')).toBeTruthy();
    });
  });

  describe('403 forbidden', () => {
    it('403 エラーのとき「閲覧できません」が表示される', () => {
      const err = new ApiError({ code: 'GUEST_NOT_ALLOWED', status: 403, message: 'FORBIDDEN' });
      mockUseShopDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: err,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('閲覧できません')).toBeTruthy();
    });
  });

  describe('正常表示', () => {
    it('店舗名が表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop(),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getAllByText('盆栽専門店 松苑').length).toBeGreaterThan(0);
    });

    it('「戻る」ボタンが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop(),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('住所が表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ address: '東京都新宿区1-1-1' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('東京都新宿区1-1-1')).toBeTruthy();
    });
  });

  describe('オーナーメニュー', () => {
    it('isOwner=true のときメニューボタンが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ isOwner: true }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByRole('button', { name: '店舗のメニューを開く' })).toBeTruthy();
    });

    it('isOwner=false のときメニューボタンが表示されない', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ isOwner: false }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.queryByRole('button', { name: '店舗のメニューを開く' })).toBeNull();
    });

    it('メニューボタンタップで Alert が呼ばれる', () => {
      const AlertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ isOwner: true }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '店舗のメニューを開く' }));
      expect(AlertSpy).toHaveBeenCalled();
      AlertSpy.mockRestore();
    });
  });

  describe('handleOpenMenu の Alert コールバック', () => {
    it('メニューの「店舗情報を編集する」をタップすると router.push が呼ばれる', () => {
      const mockRouter = jest.requireMock('expo-router').router;
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons, options) => {
        alertCalls.push([title, message, buttons, options]);
      });
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ isOwner: true }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '店舗のメニューを開く' }));
      const options = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const editOption = options?.find((o) => o.text === '店舗情報を編集する');
      editOption?.onPress?.();
      expect(mockRouter.push).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe('Web サイトリンク', () => {
    it('Web サイトがある場合リンクが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ website: 'https://example.com' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByRole('link', { name: '公式サイトを開く（外部リンク）' })).toBeTruthy();
    });

    it('Web サイトリンクタップで openBrowserAsync が呼ばれる', () => {
      const { openBrowserAsync } = jest.requireMock('expo-web-browser') as { openBrowserAsync: jest.Mock };
      openBrowserAsync.mockResolvedValue({});
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ website: 'https://example.com' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      fireEvent.press(screen.getByRole('link', { name: '公式サイトを開く（外部リンク）' }));
      expect(openBrowserAsync).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('電話ボタン', () => {
    it('電話番号がある場合に電話ボタンが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ phone: '03-1234-5678' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByRole('link', { name: /電話をかける/ })).toBeTruthy();
    });

    it('電話ボタンタップで Linking.openURL が呼ばれる', () => {
      const Linking = require('react-native').Linking;
      Linking.openURL = jest.fn().mockResolvedValue(undefined);
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ phone: '03-1234-5678' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      fireEvent.press(screen.getByRole('link', { name: /電話をかける/ }));
      expect(Linking.openURL).toHaveBeenCalledWith('tel:03-1234-5678');
    });
  });

  describe('地図ボタン', () => {
    it('緯度経度がある場合に地図ボタンが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ latitude: 35.6895, longitude: 139.6917 }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByRole('link', { name: '地図アプリで開く' })).toBeTruthy();
    });

    it('地図ボタンタップで Linking.canOpenURL が呼ばれる', () => {
      const Linking = require('react-native').Linking;
      Linking.canOpenURL = jest.fn().mockResolvedValue(true);
      Linking.openURL = jest.fn().mockResolvedValue(undefined);
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ latitude: 35.6895, longitude: 139.6917, name: '松苑' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      fireEvent.press(screen.getByRole('link', { name: '地図アプリで開く' }));
      expect(Linking.canOpenURL).toHaveBeenCalled();
    });
  });

  describe('汎用エラー状態', () => {
    it('isError=true（404/403 以外）のとき「読み込めませんでした」が表示される', () => {
      const err = new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'Internal Server Error' });
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop(),
        isLoading: false,
        isError: true,
        error: err,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('レビュープレビュー', () => {
    it('レビューがある場合にレビュー情報が表示される', () => {
      mockUseShopReviewsQuery.mockReturnValue({
        data: {
          pages: [{
            items: [{
              id: 'rev-1',
              rating: 5,
              content: '素晴らしい店舗でした',
              images: [],
              user: { id: 'u1', nickname: '盆栽太郎', avatarUrl: null },
              createdAt: '2025-06-01T00:00:00Z',
            }],
            nextCursor: null,
          }],
          pageParams: [undefined],
        },
        isLoading: false,
      });
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop(),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('素晴らしい店舗でした')).toBeTruthy();
    });

    it('ログイン時は「レビューを書く」ボタンが表示される', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop(),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByRole('button', { name: 'レビューを書く' })).toBeTruthy();
    });

    it('「レビューを書く」タップで router.push が呼ばれる', () => {
      const mockRouter = jest.requireMock('expo-router').router;
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop(),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'レビューを書く' }));
      expect(mockRouter.push).toHaveBeenCalled();
    });

    it('reviewCount > 3 のとき「すべてのレビューを見る」ボタンが表示される', () => {
      const reviews = [1, 2, 3, 4].map((i) => ({
        id: `rev-${i}`,
        rating: 4,
        content: `レビュー${i}`,
        images: [],
        user: { id: `u${i}`, nickname: `ユーザー${i}`, avatarUrl: null },
        createdAt: '2025-06-01T00:00:00Z',
      }));
      mockUseShopReviewsQuery.mockReturnValue({
        data: { pages: [{ items: reviews, nextCursor: null }], pageParams: [undefined] },
        isLoading: false,
      });
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ reviewCount: 10 }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByRole('button', { name: /すべてのレビューを見る/ })).toBeTruthy();
    });

    it('評価が表示されている場合にレビュー件数リンクが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ averageRating: 4.2, reviewCount: 10 }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByRole('link', { name: /レビュー.*件を見る/ })).toBeTruthy();
    });

    it('「レビュー件数」リンクタップで router.push が呼ばれる', () => {
      const mockRouter = jest.requireMock('expo-router').router;
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ averageRating: 4.2, reviewCount: 10 }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      fireEvent.press(screen.getByRole('link', { name: /レビュー.*件を見る/ }));
      expect(mockRouter.push).toHaveBeenCalled();
    });

    it('ビジネス時間と定休日の情報が表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ businessHours: '10:00〜18:00', closedDays: '月曜日' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('10:00〜18:00')).toBeTruthy();
      expect(screen.getByText('定休日: 月曜日')).toBeTruthy();
    });
  });

  describe('ジャンル表示', () => {
    it('ジャンルが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ genres: [{ id: 'g1', name: '松柏類', type: 'shop' }, { id: 'g2', name: '雑木類', type: 'shop' }] }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<ShopDetailScreen />);
      expect(screen.getByText('松柏類 / 雑木類')).toBeTruthy();
    });
  });
});
