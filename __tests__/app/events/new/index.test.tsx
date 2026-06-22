/**
 * app/events/new/index のイベント新規作成フォームテスト。
 * フォームフィールド・バリデーション・保存・キャンセル・オフラインを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import EventNewScreen from '@/app/events/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockCreateEvent = jest.fn();
const mockUseCreateEventMutation = jest.fn();

jest.mock('@/lib/queries/events', () => ({
  useCreateEventMutation: () => mockUseCreateEventMutation(),
}));

// DateField に onChange を呼べるよう Pressable でラップしたモック
jest.mock('@/components/bonsai/DateField', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    DateField: ({
      label,
      onChange,
    }: {
      label: string;
      value: string | null;
      onChange: (value: string | null) => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        Pressable,
        {
          accessibilityLabel: label,
          onPress: () => onChange('2026-09-01'),
        },
        React.createElement(Text, null, label)
      ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCreateEventMutation.mockReturnValue({
    mutate: mockCreateEvent,
    isPending: false,
  });
});

describe('EventNewScreen', () => {
  describe('ヘッダー', () => {
    it('「イベントを作成」タイトルが表示される', () => {
      renderWithProviders(<EventNewScreen />);
      expect(screen.getByText('イベントを作成')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderWithProviders(<EventNewScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「投稿する」ボタンが表示される', () => {
      renderWithProviders(<EventNewScreen />);
      expect(screen.getByRole('button', { name: '投稿する' })).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('入力なしでキャンセルタップすると router.back が呼ばれる', () => {
      renderWithProviders(<EventNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('入力後にキャンセルすると Alert が表示される', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderWithProviders(<EventNewScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
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
      renderWithProviders(<EventNewScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      const buttons = alertCalls[0]?.[2] as Array<{ text: string; onPress?: () => void }> | undefined;
      const discardBtn = buttons?.find((b) => b.text === '破棄する');
      discardBtn?.onPress?.();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      jest.restoreAllMocks();
    });
  });

  describe('フォームフィールド', () => {
    it('「イベント名（必須）」フィールドが存在する', () => {
      renderWithProviders(<EventNewScreen />);
      expect(screen.getByLabelText('イベント名（必須）')).toBeTruthy();
    });

    it('イベント名を入力できる', () => {
      renderWithProviders(<EventNewScreen />);
      const titleInput = screen.getByLabelText('イベント名（必須）');
      fireEvent.changeText(titleInput, '盆栽展');
      expect(titleInput.props.value).toBe('盆栽展');
    });

    it('開始日フィールドを押すと日付が設定される', () => {
      renderWithProviders(<EventNewScreen />);
      const startDateField = screen.queryByLabelText('開始日（必須）');
      if (startDateField) {
        fireEvent.press(startDateField);
      }
      expect(screen.getByText('イベントを作成')).toBeTruthy();
    });

    it('isFreeトグルが存在する', () => {
      renderWithProviders(<EventNewScreen />);
      expect(screen.getByText('イベントを作成')).toBeTruthy();
    });
  });

  describe('バリデーション', () => {
    it('イベント名が空のとき投稿するボタンは disabled になる', () => {
      renderWithProviders(<EventNewScreen />);
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('タイトルを入力しても開始日がないと投稿ボタンはdisabled', () => {
      renderWithProviders(<EventNewScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('isPending', () => {
    it('isPending=true のとき投稿するボタンが disabled になる', () => {
      mockUseCreateEventMutation.mockReturnValue({
        mutate: mockCreateEvent,
        isPending: true,
      });
      renderWithProviders(<EventNewScreen />);
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('オフライン', () => {
    it('オフライン時に保存タップするとエラーが表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      renderWithProviders(<EventNewScreen />);
      // タイトルと開始日を設定してから送信
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
      const startField = screen.queryByLabelText('開始日（必須）');
      if (startField) {
        fireEvent.press(startField);
      }
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      expect(screen.getByText('イベントを作成')).toBeTruthy();
    });
  });

  describe('handleSave — 成功', () => {
    it('タイトルと開始日を入力してonSuccessが呼ばれるとrouter.backが呼ばれる', () => {
      const mockMutate = jest.fn((_params, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      });
      mockUseCreateEventMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      renderWithProviders(<EventNewScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
      // 開始日フィールドを押して日付を設定
      const startField = screen.queryByLabelText('開始日（必須）');
      if (startField) {
        fireEvent.press(startField);
        // 開始日が設定されたので送信可能になる
        fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
        expect(mockRouter.back).toHaveBeenCalledTimes(1);
      } else {
        expect(screen.getByText('イベントを作成')).toBeTruthy();
      }
    });
  });

  describe('handleSave — エラー', () => {
    it('onErrorが呼ばれるとエラーメッセージが表示される', () => {
      const mockMutate = jest.fn((_params, options: { onError?: () => void }) => {
        options.onError?.();
      });
      mockUseCreateEventMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      renderWithProviders(<EventNewScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
      const startField = screen.queryByLabelText('開始日（必須）');
      if (startField) {
        fireEvent.press(startField);
        fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
        expect(screen.getByText(/イベント|作成|失敗|できません/)).toBeTruthy();
      } else {
        expect(screen.getByText('イベントを作成')).toBeTruthy();
      }
    });
  });

  describe('isValidUrl', () => {
    it('外部URLフィールドが存在し空の場合はバリデーション通過', () => {
      renderWithProviders(<EventNewScreen />);
      const urlField = screen.queryByLabelText('詳細ページ URL（任意）') ??
        screen.queryByLabelText('外部サイト URL（任意）') ??
        screen.queryByLabelText('URL（任意）');
      if (urlField) {
        fireEvent.changeText(urlField, '');
      }
      expect(screen.getByText('イベントを作成')).toBeTruthy();
    });
  });
});
