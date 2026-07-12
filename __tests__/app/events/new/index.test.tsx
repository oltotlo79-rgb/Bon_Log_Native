/**
 * app/events/new/index のイベント新規作成フォームテスト。
 * フォームフィールド・バリデーション・保存・キャンセル・オフラインを検証する。
 * 都道府県は EventPrefecturePickerModal（必須選択）、開始/終了日時は DateTimeField
 * （iOS インラインスピナー）で設定する Web 準拠 UI に合わせている。
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

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/**
 * 日時フィールドを開き、iOS スピナーモックへ date を渡して確定する。
 * 「完了」まで押してスピナーを閉じるため、他の DateTimeField を続けて開いても
 * mock-datetimepicker の testID が重複しない。
 */
function pickDateTime(fieldLabel: RegExp, doneLabel: string, date: Date) {
  fireEvent.press(screen.getByLabelText(fieldLabel));
  const picker = screen.getByTestId('mock-datetimepicker');
  fireEvent(picker, 'change', {}, date);
  fireEvent.press(screen.getByLabelText(doneLabel));
}

function selectStartDate(date: Date) {
  pickDateTime(/^開始日時 ＊/, '開始日時 ＊の選択を完了', date);
}

function selectEndDate(date: Date) {
  pickDateTime(/^終了日時（任意）/, '終了日時（任意）の選択を完了', date);
}

/** 都道府県ピッカーを開いて選択する（PREFECTURES 先頭寄りの値なら仮想化の影響を受けない）。 */
function selectPrefecture(name: string) {
  fireEvent.press(screen.getByRole('button', { name: /^都道府県（必須）/ }));
  fireEvent.press(screen.getByRole('radio', { name }));
}

/** バリデーションを満たす最小構成（タイトル + 開始日時 + 都道府県）まで入力する。 */
function fillMinimumValidForm() {
  fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
  selectStartDate(new Date(2026, 8, 1, 10, 0));
  selectPrefecture('東京都');
}

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
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
      const buttons = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
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

    it('開始日時フィールドをタップすると日時ピッカーが開く', () => {
      renderWithProviders(<EventNewScreen />);
      fireEvent.press(screen.getByLabelText(/^開始日時 ＊/));
      expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
    });

    it('開始日時を選択するとフィールドの表示が更新される', () => {
      renderWithProviders(<EventNewScreen />);
      selectStartDate(new Date(2026, 8, 1, 10, 0));
      expect(screen.getByLabelText(/^開始日時 ＊：2026年9月1日/)).toBeTruthy();
    });

    it('都道府県フィールドは初期状態で未選択表示', () => {
      renderWithProviders(<EventNewScreen />);
      expect(screen.getByRole('button', { name: '都道府県（必須）' })).toBeTruthy();
    });

    it('都道府県を選択するとフィールドの表示が更新される', () => {
      renderWithProviders(<EventNewScreen />);
      selectPrefecture('東京都');
      expect(screen.getByRole('button', { name: '都道府県（必須）：東京都' })).toBeTruthy();
    });

    it('isFreeトグルが存在する', () => {
      renderWithProviders(<EventNewScreen />);
      expect(screen.getByLabelText('無料イベント')).toBeTruthy();
    });

    it('即売ありトグルが存在する', () => {
      renderWithProviders(<EventNewScreen />);
      expect(screen.getByLabelText('即売あり')).toBeTruthy();
    });

    it('主催者フィールドが存在し入力できる', () => {
      renderWithProviders(<EventNewScreen />);
      const organizerInput = screen.getByLabelText('主催者（任意）');
      fireEvent.changeText(organizerInput, '全日本盆栽協会');
      expect(organizerInput.props.value).toBe('全日本盆栽協会');
    });

    it('市区町村フィールドが存在し入力できる', () => {
      renderWithProviders(<EventNewScreen />);
      const cityInput = screen.getByLabelText('市区町村（任意）');
      fireEvent.changeText(cityInput, 'さいたま市大宮区');
      expect(cityInput.props.value).toBe('さいたま市大宮区');
    });
  });

  describe('バリデーション', () => {
    it('イベント名が空のとき投稿するボタンは disabled になる', () => {
      renderWithProviders(<EventNewScreen />);
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('タイトルを入力しても開始日時がないと投稿ボタンはdisabled', () => {
      renderWithProviders(<EventNewScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('タイトルと開始日時があっても都道府県がないと投稿ボタンはdisabled', () => {
      renderWithProviders(<EventNewScreen />);
      fireEvent.changeText(screen.getByLabelText('イベント名（必須）'), '盆栽展');
      selectStartDate(new Date(2026, 8, 1, 10, 0));
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('タイトル・開始日時・都道府県が揃うと投稿ボタンが有効になる', () => {
      renderWithProviders(<EventNewScreen />);
      fillMinimumValidForm();
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('無効な外部URLを入力すると投稿ボタンが disabled になる', () => {
      renderWithProviders(<EventNewScreen />);
      fillMinimumValidForm();
      fireEvent.changeText(screen.getByLabelText('詳細ページ URL（任意）'), 'invalid-url');
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
      fillMinimumValidForm();
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      expect(mockCreateEvent).not.toHaveBeenCalled();
      expect(screen.getByText(/オフライン|接続/)).toBeTruthy();
    });
  });

  describe('handleSave — 成功', () => {
    it('必須項目を入力して保存すると createEvent が渡され、onSuccessでrouter.backが呼ばれる', () => {
      const mockMutate = jest.fn((_params, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      });
      mockUseCreateEventMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      renderWithProviders(<EventNewScreen />);
      fillMinimumValidForm();
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ title: '盆栽展', prefecture: '東京都' }),
        expect.anything()
      );
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('即売ありをオンにして保存すると hasSales=true が渡される', () => {
      renderWithProviders(<EventNewScreen />);
      fillMinimumValidForm();
      fireEvent(screen.getByLabelText('即売あり'), 'valueChange', true);
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ hasSales: true }),
        expect.anything()
      );
    });

    it('主催者を入力して保存すると organizer が渡される', () => {
      renderWithProviders(<EventNewScreen />);
      fillMinimumValidForm();
      fireEvent.changeText(screen.getByLabelText('主催者（任意）'), '全日本盆栽協会');
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ organizer: '全日本盆栽協会' }),
        expect.anything()
      );
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
      fillMinimumValidForm();
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      const { ERR_EVENT_CREATE_FAILED } = jest.requireActual('@/lib/constants/errors');
      expect(screen.getByText(ERR_EVENT_CREATE_FAILED)).toBeTruthy();
    });
  });

  describe('終了日時', () => {
    it('終了日時が開始日時より前だとエラーメッセージが表示される', () => {
      renderWithProviders(<EventNewScreen />);
      selectStartDate(new Date(2026, 8, 10, 10, 0));
      selectEndDate(new Date(2026, 8, 1, 10, 0));
      expect(screen.getByText('終了日時は開始日時以降にしてください。')).toBeTruthy();
    });

    it('終了日時が開始日時以降なら投稿ボタンが有効になる', () => {
      renderWithProviders(<EventNewScreen />);
      fillMinimumValidForm();
      selectEndDate(new Date(2026, 8, 2, 10, 0));
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('外部URLフィールドが存在し空の場合はバリデーション通過', () => {
      renderWithProviders(<EventNewScreen />);
      const urlField = screen.getByLabelText('詳細ページ URL（任意）');
      fireEvent.changeText(urlField, '');
      expect(urlField.props.value).toBe('');
    });

    it('https:// から始まる URL は有効', () => {
      renderWithProviders(<EventNewScreen />);
      fillMinimumValidForm();
      fireEvent.changeText(screen.getByLabelText('詳細ページ URL（任意）'), 'https://example.com');
      const saveButton = screen.getByRole('button', { name: '投稿する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });
  });
});
