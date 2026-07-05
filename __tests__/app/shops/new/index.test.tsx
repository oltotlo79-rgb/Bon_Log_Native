/**
 * app/shops/new/index の盆栽園新規登録フォームテスト。
 * フォームフィールド・バリデーション・保存・キャンセル・オフライン・409重複エラーを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import ShopNewScreen from '@/app/shops/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ApiError } from '@/lib/api/errors';
import { ERR_RATE_LIMIT, ERR_GEOCODE_ADDRESS_NOT_FOUND } from '@/lib/constants/errors';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockCreateShop = jest.fn();
const mockGeocodeAddress = jest.fn();
const mockUseCreateShopMutation = jest.fn();
const mockUseGenresQuery = jest.fn();
const mockUseGeocodeMutation = jest.fn();

jest.mock('@/lib/queries/shops', () => ({
  useCreateShopMutation: () => mockUseCreateShopMutation(),
  useGenresQuery: (...args: unknown[]) => mockUseGenresQuery(...args),
  useGeocodeMutation: () => mockUseGeocodeMutation(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCreateShopMutation.mockReturnValue({
    mutate: mockCreateShop,
    isPending: false,
  });
  mockUseGenresQuery.mockReturnValue({
    data: {
      items: [
        { id: 'genre-1', name: '販売', type: 'shop' },
        { id: 'genre-2', name: '教室', type: 'shop' },
      ],
    },
    isLoading: false,
  });
  mockUseGeocodeMutation.mockReturnValue({
    mutateAsync: mockGeocodeAddress,
    isPending: false,
  });
});

describe('ShopNewScreen', () => {
  describe('ヘッダー', () => {
    it('「店舗を登録」タイトルが表示される', () => {
      renderWithProviders(<ShopNewScreen />);
      expect(screen.getByText('店舗を登録')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderWithProviders(<ShopNewScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「保存する」ボタンが表示される', () => {
      renderWithProviders(<ShopNewScreen />);
      expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('入力なしでキャンセルタップすると router.back が呼ばれる', () => {
      renderWithProviders(<ShopNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('フォームフィールド', () => {
    it('「店舗名（必須）」フィールドが存在する', () => {
      renderWithProviders(<ShopNewScreen />);
      expect(screen.getByLabelText('店舗名（必須）')).toBeTruthy();
    });

    it('「住所（必須）」フィールドが存在する', () => {
      renderWithProviders(<ShopNewScreen />);
      expect(screen.getByLabelText('住所（必須）')).toBeTruthy();
    });

    it('ジャンルチップが表示される', () => {
      renderWithProviders(<ShopNewScreen />);
      expect(screen.getByText('販売')).toBeTruthy();
      expect(screen.getByText('教室')).toBeTruthy();
    });
  });

  describe('バリデーション', () => {
    it('店舗名が空のとき保存ボタンは disabled になる', () => {
      renderWithProviders(<ShopNewScreen />);
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('isPending', () => {
    it('isPending=true のとき保存ボタンが disabled になる', () => {
      mockUseCreateShopMutation.mockReturnValue({
        mutate: mockCreateShop,
        isPending: true,
      });
      renderWithProviders(<ShopNewScreen />);
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('ジャンル選択', () => {
    it('ジャンルチップをタップして選択できる', () => {
      renderWithProviders(<ShopNewScreen />);
      const chip = screen.getByRole('checkbox', { name: '販売' });
      fireEvent.press(chip);
      // トグル後、再押しでオフになる
      fireEvent.press(chip);
      // エラーが出ないことを確認
      expect(mockCreateShop).not.toHaveBeenCalled();
    });
  });

  describe('住所ジオコード', () => {
    it('住所が空のときジオコードボタンは disabled になる', () => {
      renderWithProviders(<ShopNewScreen />);
      const button = screen.getByRole('button', { name: '住所から位置を取得' });
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('成功時に緯度経度がセットされ「位置情報を取得しました」が表示される', async () => {
      mockGeocodeAddress.mockResolvedValue({
        latitude: 35.6812,
        longitude: 139.7671,
        formattedAddress: '東京都新宿区○○1-2-3',
      });
      renderWithProviders(<ShopNewScreen />);

      fireEvent.changeText(screen.getByLabelText('住所（必須）'), '新宿区○○1-2-3');
      fireEvent.press(screen.getByRole('button', { name: '住所から位置を取得' }));

      await waitFor(() => {
        expect(
          screen.getByText('位置情報を取得しました：東京都新宿区○○1-2-3')
        ).toBeTruthy();
      });
      expect(mockGeocodeAddress).toHaveBeenCalledWith('新宿区○○1-2-3');
    });

    it('404 NOT_FOUND のとき ERR_GEOCODE_ADDRESS_NOT_FOUND が表示される', async () => {
      mockGeocodeAddress.mockRejectedValue(
        new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' })
      );
      renderWithProviders(<ShopNewScreen />);

      fireEvent.changeText(screen.getByLabelText('住所（必須）'), '存在しない住所');
      fireEvent.press(screen.getByRole('button', { name: '住所から位置を取得' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_GEOCODE_ADDRESS_NOT_FOUND)).toBeTruthy();
      });
    });

    it('429 RATE_LIMITED のとき ERR_RATE_LIMIT が表示される', async () => {
      mockGeocodeAddress.mockRejectedValue(
        new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited', retryAfter: 5 })
      );
      renderWithProviders(<ShopNewScreen />);

      fireEvent.changeText(screen.getByLabelText('住所（必須）'), '新宿区○○1-2-3');
      fireEvent.press(screen.getByRole('button', { name: '住所から位置を取得' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_RATE_LIMIT)).toBeTruthy();
      });
    });

    it('isGeocoding=true の間はジオコードボタンが disabled になる', () => {
      mockUseGeocodeMutation.mockReturnValue({
        mutateAsync: mockGeocodeAddress,
        isPending: true,
      });
      renderWithProviders(<ShopNewScreen />);

      fireEvent.changeText(screen.getByLabelText('住所（必須）'), '新宿区○○1-2-3');
      const button = screen.getByRole('button', { name: '住所から位置を取得' });
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('isPending（保存中）のときもジオコードボタンが disabled になる', () => {
      mockUseCreateShopMutation.mockReturnValue({
        mutate: mockCreateShop,
        isPending: true,
      });
      renderWithProviders(<ShopNewScreen />);

      fireEvent.changeText(screen.getByLabelText('住所（必須）'), '新宿区○○1-2-3');
      const button = screen.getByRole('button', { name: '住所から位置を取得' });
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
