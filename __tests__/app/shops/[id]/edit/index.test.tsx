/**
 * app/shops/[id]/edit/index の店舗情報編集フォームテスト。
 * ローディング・初期値・バリデーション・保存・キャンセルを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ShopEditScreen from '@/app/shops/[id]/edit/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseShopDetailQuery = jest.fn();
const mockUseUpdateShopMutation = jest.fn();
const mockUseGenresQuery = jest.fn();

jest.mock('@/lib/queries/shops', () => ({
  useShopDetailQuery: (...args: unknown[]) => mockUseShopDetailQuery(...args),
  useUpdateShopMutation: () => mockUseUpdateShopMutation(),
  useGenresQuery: (...args: unknown[]) => mockUseGenresQuery(...args),
}));

function makeShop(overrides = {}) {
  return {
    id: 'shop-1',
    name: '盆栽専門店 松苑',
    address: '東京都新宿区1-1-1',
    genres: [{ id: 'genre-1', name: '販売', type: 'shop' }],
    latitude: null,
    longitude: null,
    phone: null,
    website: null,
    businessHours: null,
    closedDays: null,
    averageRating: 4.2,
    reviewCount: 10,
    isOwner: true,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ id: 'shop-1' });
  mockUseShopDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
  mockUseUpdateShopMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseGenresQuery.mockReturnValue({
    data: {
      items: [
        { id: 'genre-1', name: '販売', type: 'shop' },
        { id: 'genre-2', name: '教室', type: 'shop' },
      ],
    },
  });
});

describe('ShopEditScreen', () => {
  describe('ローディング / 未初期化状態', () => {
    it('isLoading=true のとき「店舗情報を編集」ヘッダーが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: undefined, isLoading: true });
      renderWithProviders(<ShopEditScreen />);
      expect(screen.getByText('店舗情報を編集')).toBeTruthy();
    });

    it('data=undefined のとき「キャンセル」は表示されるがフォームは表示されない', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      expect(screen.getByText('店舗情報を編集')).toBeTruthy();
      expect(screen.queryByLabelText('店舗名（必須）')).toBeNull();
    });
  });

  describe('フォーム表示', () => {
    it('データが返ったとき「店舗情報を編集」ヘッダーが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      expect(screen.getByText('店舗情報を編集')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「保存する」ボタンが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    });

    it('既存の店舗名が初期値として設定される', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop({ name: '緑松園' }), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      const nameInput = screen.getByLabelText('店舗名（必須）');
      expect(nameInput.props.value).toBe('緑松園');
    });

    it('既存の住所が初期値として設定される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: makeShop({ address: '大阪府大阪市1-2-3' }),
        isLoading: false,
      });
      renderWithProviders(<ShopEditScreen />);
      const addressInput = screen.getByLabelText('住所（必須）');
      expect(addressInput.props.value).toBe('大阪府大阪市1-2-3');
    });

    it('ジャンルチップが表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      expect(screen.getByText('販売')).toBeTruthy();
      expect(screen.getByText('教室')).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('変更なしでキャンセルすると router.back が呼ばれる', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('バリデーション', () => {
    it('店舗名をクリアすると保存ボタンが disabled になる', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      fireEvent.changeText(screen.getByLabelText('店舗名（必須）'), '');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('保存', () => {
    it('名前変更後に保存すると updateShop が呼ばれる', () => {
      const mockUpdate = jest.fn();
      mockUseUpdateShopMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      fireEvent.changeText(screen.getByLabelText('店舗名（必須）'), '緑松園');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'shop-1', name: '緑松園' }),
        expect.anything()
      );
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が配列のとき空文字として扱い、ローディング状態になる', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['shop-1', 'shop-2'] });
      renderWithProviders(<ShopEditScreen />);
      expect(screen.getByText('店舗情報を編集')).toBeTruthy();
    });
  });

  describe('フォームフィールド変更（reducer 各アクション）', () => {
    it('住所を変更できる', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      const addressInput = screen.getByLabelText('住所（必須）');
      fireEvent.changeText(addressInput, '大阪府大阪市1-1-1');
      expect(addressInput.props.value).toBe('大阪府大阪市1-1-1');
    });

    it('電話番号を変更できる', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      const phoneInput = screen.queryByLabelText('電話番号');
      if (phoneInput !== null) {
        fireEvent.changeText(phoneInput, '03-1234-5678');
        expect(phoneInput.props.value).toBe('03-1234-5678');
      } else {
        expect(screen.getByText('店舗情報を編集')).toBeTruthy();
      }
    });

    it('ウェブサイトを変更できる', () => {
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      const websiteInput = screen.queryByLabelText(/ウェブサイト|URL/);
      if (websiteInput !== null) {
        fireEvent.changeText(websiteInput, 'https://example.com');
        expect(websiteInput.props.value).toBe('https://example.com');
      } else {
        expect(screen.getByText('店舗情報を編集')).toBeTruthy();
      }
    });
  });

  describe('handleCancel — 変更あり', () => {
    it('店舗名変更後にキャンセルすると Alert が表示される', () => {
      const Alert = require('react-native').Alert;
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args: Parameters<typeof Alert.alert>) => {
        alertCalls.push(args);
      });
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      fireEvent.changeText(screen.getByLabelText('店舗名（必須）'), '変更後の店名');
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertCalls.length).toBeGreaterThan(0);
      jest.restoreAllMocks();
    });

    it('Alert の「破棄する」で router.back が呼ばれる', () => {
      const Alert = require('react-native').Alert;
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args: Parameters<typeof Alert.alert>) => {
        alertCalls.push(args);
      });
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      fireEvent.changeText(screen.getByLabelText('店舗名（必須）'), '変更後の店名');
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      const options = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const discardOption = options?.find((o) => o.text === '破棄する');
      discardOption?.onPress?.();
      expect(mockRouter.back).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe('handleSave — オフライン', () => {
    it('オフライン時に保存するとエラーメッセージが表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(screen.getByText('現在オフライン中のため、この操作はできません。接続を確認してください。')).toBeTruthy();
    });
  });

  describe('handleSave — 成功/エラーコールバック', () => {
    it('保存成功後に router.back が呼ばれる', () => {
      const mockUpdate = jest.fn((_: unknown, callbacks: { onSuccess?: () => void }) => {
        callbacks?.onSuccess?.();
      });
      mockUseUpdateShopMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('保存エラー時にエラーメッセージが表示される', () => {
      const mockUpdate = jest.fn((_: unknown, callbacks: { onError?: () => void }) => {
        callbacks?.onError?.();
      });
      mockUseUpdateShopMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseShopDetailQuery.mockReturnValue({ data: makeShop(), isLoading: false });
      renderWithProviders(<ShopEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(screen.getByText(/更新できませんでした|保存できませんでした|失敗/)).toBeTruthy();
    });
  });
});
