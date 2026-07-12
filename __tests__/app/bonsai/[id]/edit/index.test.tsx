/**
 * app/bonsai/[id]/edit/index の盆栽編集フォームテスト。
 * ローディング・初期値設定・バリデーション・保存・キャンセルを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, act } from '@testing-library/react-native';
import BonsaiEditScreen from '@/app/bonsai/[id]/edit/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseBonsaiDetailQuery = jest.fn();
const mockUseUpdateBonsaiMutation = jest.fn();

jest.mock('@/lib/queries/bonsai', () => ({
  useBonsaiDetailQuery: (...args: unknown[]) => mockUseBonsaiDetailQuery(...args),
  useUpdateBonsaiMutation: () => mockUseUpdateBonsaiMutation(),
}));

function makeBonsai(overrides = {}) {
  return {
    id: 'bonsai-1',
    name: '黒松',
    species: '松柏類',
    acquiredAt: null,
    description: null,
    recordCount: 0,
    latestRecord: null,
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
  mockUseLocalSearchParams.mockReturnValue({ id: 'bonsai-1' });
  mockUseBonsaiDetailQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
  });
  mockUseUpdateBonsaiMutation.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
});

describe('BonsaiEditScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のときローディング表示になる', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({ data: undefined, isLoading: true });
      renderWithProviders(<BonsaiEditScreen />);
      // data が undefined のときローディングインジケーターが表示される
      expect(screen.queryByLabelText('盆栽名（必須）')).toBeNull();
    });

    it('data=undefined のときローディング表示になる', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      expect(screen.queryByLabelText('盆栽名（必須）')).toBeNull();
    });
  });

  describe('フォーム表示', () => {
    it('「盆栽を編集」ヘッダーが表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      expect(screen.getByText('盆栽を編集')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「保存する」ボタンが表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    });

    it('既存の盆栽名が初期値として設定される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai({ name: '五葉松' }), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      const input = screen.getByLabelText('盆栽名（必須）');
      expect(input.props.value).toBe('五葉松');
    });
  });

  describe('キャンセル', () => {
    it('変更なしでキャンセルすると router.back が呼ばれる', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('保存', () => {
    it('名前変更後に保存すると updateBonsai が呼ばれる', () => {
      const mockUpdate = jest.fn();
      mockUseUpdateBonsaiMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '白梅');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bonsai-1', name: '白梅' }),
        expect.anything()
      );
    });
  });

  describe('handleSave — onSuccess', () => {
    it('保存成功後にrouter.backが呼ばれる', () => {
      let capturedOnSuccess: (() => void) | undefined;
      const mockUpdate = jest.fn((_params, options: { onSuccess?: () => void }) => {
        capturedOnSuccess = options.onSuccess;
      });
      mockUseUpdateBonsaiMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '白梅');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      capturedOnSuccess?.();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleSave — onError', () => {
    it('保存エラー時にエラーメッセージが表示される', async () => {
      let capturedOnError: (() => void) | undefined;
      const mockUpdate = jest.fn((_params, options: { onError?: () => void }) => {
        capturedOnError = options.onError;
      });
      mockUseUpdateBonsaiMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '白梅');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      await act(async () => {
        capturedOnError?.();
      });
      expect(screen.getByText('盆栽情報の更新に失敗しました。もう一度お試しください。')).toBeTruthy();
    });
  });

  describe('handleSave — オフライン', () => {
    it('オフライン時に保存するとエラーメッセージが表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      const mockUpdate = jest.fn();
      mockUseUpdateBonsaiMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '白梅');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(screen.getByText(/オフライン|接続/)).toBeTruthy();
    });
  });

  describe('handleCancel — isDirty=true', () => {
    it('変更後にキャンセルするとAlertが表示される', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '白梅');
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertSpy).toHaveBeenCalledWith(
        '変更を破棄しますか？',
        expect.any(String),
        expect.any(Array)
      );
      jest.restoreAllMocks();
    });

    it('Alert の「破棄する」でrouter.backが呼ばれる', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '白梅');
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      const buttons = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const discardBtn = buttons?.find((b) => b.text === '破棄する');
      discardBtn?.onPress?.();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      jest.restoreAllMocks();
    });
  });

  describe('isPending', () => {
    it('isPending=true のとき保存ボタンが disabled になる', () => {
      mockUseUpdateBonsaiMutation.mockReturnValue({ mutate: jest.fn(), isPending: true });
      mockUseBonsaiDetailQuery.mockReturnValue({ data: makeBonsai(), isLoading: false });
      renderWithProviders(<BonsaiEditScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '白梅');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
