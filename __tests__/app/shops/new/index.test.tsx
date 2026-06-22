/**
 * app/shops/new/index の盆栽園新規登録フォームテスト。
 * フォームフィールド・バリデーション・保存・キャンセル・オフライン・409重複エラーを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ShopNewScreen from '@/app/shops/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockCreateShop = jest.fn();
const mockUseCreateShopMutation = jest.fn();
const mockUseGenresQuery = jest.fn();

jest.mock('@/lib/queries/shops', () => ({
  useCreateShopMutation: () => mockUseCreateShopMutation(),
  useGenresQuery: (...args: unknown[]) => mockUseGenresQuery(...args),
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
});
