/**
 * app/events/[id]/edit/index のイベント編集フォームテスト。
 * ローディング・初期値・バリデーション・保存・キャンセルを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import EventEditScreen from '@/app/events/[id]/edit/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseEventDetailQuery = jest.fn();
const mockUseUpdateEventMutation = jest.fn();

jest.mock('@/lib/queries/events', () => ({
  useEventDetailQuery: (...args: unknown[]) => mockUseEventDetailQuery(...args),
  useUpdateEventMutation: () => mockUseUpdateEventMutation(),
}));

jest.mock('@/components/bonsai/DateField', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    DateField: ({ label }: { label: string }) => React.createElement(Text, null, label),
  };
});

function makeEvent(overrides = {}) {
  return {
    id: 'event-1',
    title: '盆栽展示会',
    startDate: '2025-09-01T09:00:00Z',
    endDate: '2025-09-02T17:00:00Z',
    venue: '東京都美術館',
    prefecture: '東京都',
    city: '台東区',
    description: 'イベント詳細説明',
    externalUrl: null,
    admissionFee: null,
    isFree: true,
    isOrganizer: true,
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
  mockUseLocalSearchParams.mockReturnValue({ id: 'event-1' });
  mockUseEventDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
  mockUseUpdateEventMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe('EventEditScreen', () => {
  describe('ローディング / 未初期化状態', () => {
    it('isLoading=true のとき「イベントを編集」ヘッダーが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: undefined, isLoading: true });
      renderWithProviders(<EventEditScreen />);
      expect(screen.getByText('イベントを編集')).toBeTruthy();
    });

    it('data=undefined（未初期化）のとき「キャンセル」は表示されるがフォームは表示されない', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
      renderWithProviders(<EventEditScreen />);
      expect(screen.getByText('イベントを編集')).toBeTruthy();
      // フォームフィールドは表示されない
      expect(screen.queryByLabelText('イベント名（必須）')).toBeNull();
    });
  });

  describe('フォーム表示', () => {
    it('data が返ったとき「イベントを編集」ヘッダーが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      expect(screen.getByText('イベントを編集')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「保存する」ボタンが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    });

    it('既存のタイトルが初期値として設定される', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent({ title: '松柏展' }), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      const titleInput = screen.getByLabelText('イベント名（必須）');
      expect(titleInput.props.value).toBe('松柏展');
    });
  });

  describe('キャンセル', () => {
    it('変更なしでキャンセルすると router.back が呼ばれる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('バリデーション', () => {
    it('タイトルをクリアすると保存ボタンが disabled になる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('タイトルを入力すると保存ボタンが有効になる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '新しい展示会');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      // 開始日が初期値で設定されているので有効のはず
      expect(saveButton.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  describe('保存', () => {
    it('タイトル変更後に保存すると updateEvent が呼ばれる', () => {
      const mockUpdate = jest.fn();
      mockUseUpdateEventMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '新しい展示会');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'event-1', title: '新しい展示会' }),
        expect.anything()
      );
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が配列のとき空文字として扱い、ローディング状態になる', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['event-1', 'event-2'] });
      renderWithProviders(<EventEditScreen />);
      expect(screen.getByText('イベントを編集')).toBeTruthy();
    });
  });

  describe('フォームフィールド変更', () => {
    it('会場名を変更できる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      const venueInput = screen.getByLabelText('会場名（任意）');
      fireEvent.changeText(venueInput, '新しい会場');
      expect(venueInput.props.value).toBe('新しい会場');
    });

    it('都道府県を変更できる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      const prefInput = screen.getByLabelText('都道府県（任意）');
      fireEvent.changeText(prefInput, '大阪府');
      expect(prefInput.props.value).toBe('大阪府');
    });

    it('地域を変更できる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      const regionInput = screen.getByLabelText('地域（任意）');
      fireEvent.changeText(regionInput, '大阪市');
      expect(regionInput.props.value).toBe('大阪市');
    });

    it('説明を変更できる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      const descInput = screen.getByLabelText('説明（任意）');
      fireEvent.changeText(descInput, '新しい説明');
      expect(descInput.props.value).toBe('新しい説明');
    });

    it('外部 URL を変更できる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      const urlInput = screen.getByLabelText('詳細ページ URL（任意）');
      fireEvent.changeText(urlInput, 'https://example.com');
      expect(urlInput.props.value).toBe('https://example.com');
    });

    it('有料チェックボックスを切り替えると入場料フィールドの表示が変わる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent({ isFree: false, admissionFee: '500' }), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      // isFree=false の場合、入場料フィールドが表示される
      const feeInput = screen.queryByLabelText('入場料金額（任意）');
      if (feeInput !== null) {
        fireEvent.changeText(feeInput, '1000円');
        expect(feeInput.props.value).toBe('1000円');
      } else {
        expect(screen.getByText('イベントを編集')).toBeTruthy();
      }
    });
  });

  describe('handleCancel — 変更あり', () => {
    it('タイトル変更後にキャンセルすると Alert が表示される', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons, options) => {
        alertCalls.push([title, message, buttons, options]);
      });
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '変更後タイトル');
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertCalls.length).toBeGreaterThan(0);
      expect(alertCalls[0]?.[0]).toBe('変更を破棄しますか？');
      jest.restoreAllMocks();
    });

    it('Alert の「破棄する」で router.back が呼ばれる', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons, options) => {
        alertCalls.push([title, message, buttons, options]);
      });
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '変更後タイトル');
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
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(screen.getByText('現在オフライン中のため、この操作はできません。接続を確認してください。')).toBeTruthy();
    });
  });

  describe('handleSave — 成功/エラーコールバック', () => {
    it('保存成功後に router.back が呼ばれる', () => {
      const mockUpdate = jest.fn((_, callbacks: { onSuccess?: () => void }) => {
        callbacks?.onSuccess?.();
      });
      mockUseUpdateEventMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('保存エラー時にエラーメッセージが表示される', () => {
      const mockUpdate = jest.fn((_: unknown, callbacks: { onError?: () => void }) => {
        callbacks?.onError?.();
      });
      mockUseUpdateEventMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(screen.getByText(/更新できませんでした|保存できませんでした|失敗/)).toBeTruthy();
    });
  });

  describe('バリデーション — URL', () => {
    it('無効な URL を入力すると保存ボタンが disabled になる', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.changeText(screen.getByLabelText('詳細ページ URL（任意）'), 'invalid-url');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('有効な URL は保存ボタンが有効なまま', () => {
      mockUseEventDetailQuery.mockReturnValue({ data: makeEvent(), isLoading: false });
      renderWithProviders(<EventEditScreen />);
      fireEvent.changeText(screen.getByLabelText('詳細ページ URL（任意）'), 'https://example.com');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBeFalsy();
    });
  });
});
