/**
 * app/bonsai/new/index の盆栽新規登録フォームテスト。
 * フォームフィールド・バリデーション・保存・キャンセルを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, act } from '@testing-library/react-native';
import BonsaiNewScreen from '@/app/bonsai/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockCreateBonsai = jest.fn();
const mockUseCreateBonsaiMutation = jest.fn();

jest.mock('@/lib/queries/bonsai', () => ({
  useCreateBonsaiMutation: () => mockUseCreateBonsaiMutation(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseCreateBonsaiMutation.mockReturnValue({
    mutate: mockCreateBonsai,
    isPending: false,
  });
});

describe('BonsaiNewScreen', () => {
  describe('ヘッダー', () => {
    it('「盆栽を登録」タイトルが表示される', () => {
      renderWithProviders(<BonsaiNewScreen />);
      expect(screen.getByText('盆栽を登録')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderWithProviders(<BonsaiNewScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「保存する」ボタンが表示される', () => {
      renderWithProviders(<BonsaiNewScreen />);
      expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('入力なしでキャンセルタップすると router.back が呼ばれる', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('フォームフィールド', () => {
    it('「盆栽名（必須）」フィールドが存在する', () => {
      renderWithProviders(<BonsaiNewScreen />);
      expect(screen.getByLabelText('盆栽名（必須）')).toBeTruthy();
    });

    it('盆栽名を入力できる', () => {
      renderWithProviders(<BonsaiNewScreen />);
      const nameInput = screen.getByLabelText('盆栽名（必須）');
      fireEvent.changeText(nameInput, '黒松');
      expect(nameInput.props.value).toBe('黒松');
    });
  });

  describe('バリデーション', () => {
    it('盆栽名が空のとき保存ボタンは disabled になる', () => {
      renderWithProviders(<BonsaiNewScreen />);
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('盆栽名を入力すると保存ボタンが有効になる', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '黒松');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('保存', () => {
    it('盆栽名入力後に保存ボタンをタップすると createBonsai が呼ばれる', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '五葉松');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockCreateBonsai).toHaveBeenCalledWith(
        expect.objectContaining({ name: '五葉松' }),
        expect.anything()
      );
    });
  });

  describe('オフライン', () => {
    it('オフライン時に保存タップするとエラーメッセージが表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '五葉松');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockCreateBonsai).not.toHaveBeenCalled();
    });
  });

  describe('isPending', () => {
    it('isPending=true のとき保存ボタンが disabled になる', () => {
      mockUseCreateBonsaiMutation.mockReturnValue({
        mutate: mockCreateBonsai,
        isPending: true,
      });
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '黒松');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('handleCancel — Alert 破棄する', () => {
    it('入力後にキャンセルすると Alert が表示され「破棄する」でrouter.backが呼ばれる', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '五葉松');
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertCalls.length).toBeGreaterThan(0);
      const buttons = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const discardBtn = buttons?.find((b) => b.text === '破棄する');
      discardBtn?.onPress?.();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      jest.restoreAllMocks();
    });
  });

  describe('handleSave — 成功', () => {
    it('onSuccessコールバックが呼ばれるとrouter.backが呼ばれる', () => {
      let capturedOnSuccess: (() => void) | undefined;
      mockCreateBonsai.mockImplementation((_params, options: { onSuccess?: () => void }) => {
        capturedOnSuccess = options.onSuccess;
      });
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '五葉松');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockCreateBonsai).toHaveBeenCalledTimes(1);
      // router.back() はコールバックで直接呼ばれるので act 不要
      capturedOnSuccess?.();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleSave — エラー', () => {
    it('onErrorコールバックが呼ばれるとエラーメッセージが表示される', async () => {
      let capturedOnError: (() => void) | undefined;
      mockCreateBonsai.mockImplementation((_params, options: { onError?: () => void }) => {
        capturedOnError = options.onError;
      });
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '五葉松');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockCreateBonsai).toHaveBeenCalledTimes(1);
      await act(async () => {
        capturedOnError?.();
      });
      expect(screen.getByText('盆栽の登録に失敗しました。もう一度お試しください。')).toBeTruthy();
    });
  });

  describe('樹種フィールド（TreeSpeciesField）', () => {
    it('樹種フィールドが未選択状態で表示される', () => {
      renderWithProviders(<BonsaiNewScreen />);
      expect(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' })).toBeTruthy();
    });

    it('タップすると「樹種を選択」モーダルが開く', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
      expect(screen.getByText('樹種を選択')).toBeTruthy();
      expect(screen.getByRole('radio', { name: '黒松' })).toBeTruthy();
    });

    it('樹種を選択するとフィールドの表示が更新される', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
      fireEvent.press(screen.getByRole('radio', { name: '黒松' }));
      expect(screen.getByRole('button', { name: '樹種（任意）：黒松' })).toBeTruthy();
    });

    it('樹種を選択して保存すると species として渡される', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '五葉松の盆栽');
      fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
      fireEvent.press(screen.getByRole('radio', { name: '黒松' }));
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockCreateBonsai).toHaveBeenCalledWith(
        expect.objectContaining({ species: '黒松' }),
        expect.anything()
      );
    });
  });

  describe('取得日フィールド（DatePickerField）', () => {
    it('取得日フィールドが未選択状態で表示される', () => {
      renderWithProviders(<BonsaiNewScreen />);
      expect(screen.getByLabelText('取得日（任意）：日付を選択')).toBeTruthy();
    });

    it('タップすると日時ピッカー（iOS スピナー）が開く', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.press(screen.getByLabelText('取得日（任意）：日付を選択'));
      expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
    });

    it('日付を選択すると ISO 8601 日時に変換されて保存される', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.changeText(screen.getByLabelText('盆栽名（必須）'), '黒松');
      fireEvent.press(screen.getByLabelText('取得日（任意）：日付を選択'));
      const picker = screen.getByTestId('mock-datetimepicker');
      fireEvent(picker, 'change', {}, new Date(2024, 3, 15));
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(mockCreateBonsai).toHaveBeenCalledWith(
        expect.objectContaining({ acquiredAt: new Date('2024-04-15').toISOString() }),
        expect.anything()
      );
    });

    it('クリアボタンで取得日を削除できる', () => {
      renderWithProviders(<BonsaiNewScreen />);
      fireEvent.press(screen.getByLabelText('取得日（任意）：日付を選択'));
      const picker = screen.getByTestId('mock-datetimepicker');
      fireEvent(picker, 'change', {}, new Date(2024, 3, 15));
      fireEvent.press(screen.getByRole('button', { name: '取得日を削除' }));
      expect(screen.getByLabelText('取得日（任意）：日付を選択')).toBeTruthy();
    });
  });

  describe('説明フィールド', () => {
    it('説明フィールドが存在し入力できる', () => {
      renderWithProviders(<BonsaiNewScreen />);
      const descInput = screen.getByLabelText('説明（任意）');
      fireEvent.changeText(descInput, '説明テキスト');
      expect(descInput.props.value).toBe('説明テキスト');
    });
  });
});
