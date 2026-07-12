/**
 * @module __tests__/components/common/DateTimeField
 * DateTimeField（日付+時刻ピッカー）のコンポーネントテスト。
 * 表示・iOS インラインスピナーでの選択・Android の日付→時刻ダイアログ連鎖・
 * クリア・disabled を検証する。
 */

import React from 'react';
import { Platform } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { DateTimeField } from '@/components/common/DateTimeField';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
});

describe('DateTimeField 表示', () => {
  it('ラベルテキストが表示される', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    expect(screen.getByText('開始日時 ＊')).toBeTruthy();
  });

  it('value=null のとき既定プレースホルダー「日時を選択」が表示される', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    expect(screen.getByText('日時を選択')).toBeTruthy();
    expect(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' })).toBeTruthy();
  });

  it('カスタム placeholder を指定できる', () => {
    renderWithProviders(
      <DateTimeField label="公開予定日時 ＊" value={null} onChange={jest.fn()} placeholder="日時未設定" />
    );
    expect(screen.getByText('日時未設定')).toBeTruthy();
  });

  it('value が設定されているとき日付と時刻（24時間表記）が表示される', () => {
    renderWithProviders(
      <DateTimeField label="開始日時 ＊" value="2025-09-01T01:30:00.000Z" onChange={jest.fn()} />
    );
    // ja-JP ロケール・hour12=false での表示。実行環境の TZ (Asia/Tokyo) では 01:30Z = 10:30 JST
    expect(screen.getByRole('button', { name: /^開始日時 ＊：2025年9月1日 \d{2}:\d{2}/ })).toBeTruthy();
  });
});

describe('DateTimeField クリアボタン', () => {
  it('value が null のときクリアボタンは表示されない', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    expect(screen.queryByRole('button', { name: '日時を削除' })).toBeNull();
  });

  it('value が設定されているときクリアボタンが表示される', () => {
    renderWithProviders(
      <DateTimeField label="開始日時 ＊" value="2025-09-01T10:00:00.000Z" onChange={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: '日時を削除' })).toBeTruthy();
  });

  it('クリアボタンを押すと onChange(null) が呼ばれる', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <DateTimeField label="開始日時 ＊" value="2025-09-01T10:00:00.000Z" onChange={onChange} />
    );
    fireEvent.press(screen.getByRole('button', { name: '日時を削除' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clearAccessibilityLabel でクリアボタンのラベルをカスタマイズできる', () => {
    renderWithProviders(
      <DateTimeField
        label="公開予定日時 ＊"
        value="2025-09-01T10:00:00.000Z"
        onChange={jest.fn()}
        clearAccessibilityLabel="公開予定日時を削除"
      />
    );
    expect(screen.getByRole('button', { name: '公開予定日時を削除' })).toBeTruthy();
  });
});

describe('DateTimeField iOS インラインスピナー', () => {
  it('フィールドをタップするとスピナーが開く', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
  });

  it('スピナーの mode は datetime になる', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    const picker = screen.UNSAFE_getByType(RNDateTimePicker);
    expect(picker.props.mode).toBe('datetime');
  });

  it('日時を選択すると onChange が ISO 8601 文字列で呼ばれる', () => {
    const onChange = jest.fn();
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    const picker = screen.getByTestId('mock-datetimepicker');
    const selected = new Date(2026, 8, 1, 10, 30);
    fireEvent(picker, 'change', {}, selected);
    expect(onChange).toHaveBeenCalledWith(selected.toISOString());
  });

  it('「完了」を押すとスピナーが閉じる', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    fireEvent.press(screen.getByLabelText('開始日時 ＊の選択を完了'));
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
  });

  it('minimumDate / maximumDate がそのままネイティブピッカーに渡される', () => {
    const minimumDate = new Date(2026, 0, 1);
    const maximumDate = new Date(2026, 11, 31);
    renderWithProviders(
      <DateTimeField
        label="公開予定日時 ＊"
        value={null}
        onChange={jest.fn()}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: '公開予定日時 ＊：日時を選択' }));
    const picker = screen.UNSAFE_getByType(RNDateTimePicker);
    expect(picker.props.minimumDate).toBe(minimumDate);
    expect(picker.props.maximumDate).toBe(maximumDate);
  });
});

describe('DateTimeField Android 日付→時刻ダイアログ連鎖', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  });

  it('フィールドをタップすると DateTimePickerAndroid.open が date モードで呼ばれる', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'date' })
    );
  });

  it('日付を確定すると続けて time モードのダイアログが開く', () => {
    const openSpy = jest.mocked(DateTimePickerAndroid.open);
    openSpy.mockImplementationOnce((params) => {
      params.onChange?.({ type: 'set' } as never, new Date(2026, 8, 1));
    });
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    expect(openSpy).toHaveBeenCalledTimes(2);
    expect(openSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ mode: 'time', is24Hour: true }));
  });

  it('日付キャンセル（type!=="set"）のときは time ダイアログを開かない', () => {
    const openSpy = jest.mocked(DateTimePickerAndroid.open);
    openSpy.mockImplementationOnce((params) => {
      params.onChange?.({ type: 'dismissed' } as never, undefined);
    });
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('日付→時刻の両方を確定すると onChange が時刻確定値の ISO 文字列で呼ばれる', () => {
    const onChange = jest.fn();
    const finalDateTime = new Date(2026, 8, 1, 14, 45);
    const openSpy = jest.mocked(DateTimePickerAndroid.open);
    // 日付確定の onChange 実行中に time モード用の open() が再入呼び出しされるため、
    // 2 回目の mockImplementationOnce は 1 回目の onChange 呼び出しより前に積んでおく必要がある。
    openSpy.mockImplementationOnce((dateParams) => {
      openSpy.mockImplementationOnce((timeParams) => {
        timeParams.onChange?.({ type: 'set' } as never, finalDateTime);
      });
      dateParams.onChange?.({ type: 'set' } as never, new Date(2026, 8, 1));
    });
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    expect(onChange).toHaveBeenCalledWith(finalDateTime.toISOString());
  });

  it('Android では iOS 用インラインスピナーが描画されない', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
  });
});

describe('DateTimeField disabled', () => {
  it('disabled=true のときフィールドの accessibilityState.disabled が true になる', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} disabled />);
    const field = screen.getByRole('button', { name: '開始日時 ＊：日時を選択' });
    expect(field.props.accessibilityState?.disabled).toBe(true);
  });

  it('disabled=true のときタップしてもスピナーが開かない', () => {
    renderWithProviders(<DateTimeField label="開始日時 ＊" value={null} onChange={jest.fn()} disabled />);
    fireEvent.press(screen.getByRole('button', { name: '開始日時 ＊：日時を選択' }));
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
  });

  it('disabled=true のときクリアボタンも disabled になる', () => {
    renderWithProviders(
      <DateTimeField label="開始日時 ＊" value="2025-09-01T10:00:00.000Z" onChange={jest.fn()} disabled />
    );
    const clearButton = screen.getByRole('button', { name: '日時を削除' });
    expect(clearButton.props.accessibilityState?.disabled).toBe(true);
  });
});
