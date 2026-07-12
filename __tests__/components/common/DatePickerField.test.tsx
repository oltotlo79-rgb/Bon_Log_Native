/**
 * @module __tests__/components/common/DatePickerField
 * DatePickerField（日付のみピッカー）のコンポーネントテスト。
 * 表示・iOS インラインスピナーでの選択・Android ダイアログでの選択・クリア・disabled・
 * カスタム placeholder / clearAccessibilityLabel を検証する。
 */

import React from 'react';
import { Platform } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { DatePickerField } from '@/components/common/DatePickerField';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
});

describe('DatePickerField 表示', () => {
  it('label が非空のときラベルテキストが表示される', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} />);
    expect(screen.getByText('取得日')).toBeTruthy();
  });

  it('label が空文字のときラベルテキストは描画されない', () => {
    renderWithProviders(<DatePickerField label="" value={null} onChange={jest.fn()} />);
    expect(screen.queryByText('取得日')).toBeNull();
  });

  it('value=null のとき既定プレースホルダー「日付を選択」が表示される', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} />);
    expect(screen.getByText('日付を選択')).toBeTruthy();
    expect(screen.getByRole('button', { name: '取得日：日付を選択' })).toBeTruthy();
  });

  it('カスタム placeholder を指定できる', () => {
    renderWithProviders(
      <DatePickerField label="" value={null} onChange={jest.fn()} placeholder="開始日" />
    );
    expect(screen.getByText('開始日')).toBeTruthy();
    expect(screen.getByRole('button', { name: '開始日：開始日' })).toBeTruthy();
  });

  it('value が設定されているとき日本語形式の日付が表示される', () => {
    renderWithProviders(<DatePickerField label="取得日" value="2023-06-15" onChange={jest.fn()} />);
    expect(screen.getByText('2023年6月15日')).toBeTruthy();
    expect(screen.getByRole('button', { name: '取得日：2023年6月15日' })).toBeTruthy();
  });

  it('不正な日付文字列（2/30 等の繰り上がり）は現在日時にフォールバックしクラッシュしない', () => {
    renderWithProviders(<DatePickerField label="取得日" value="2023-02-30" onChange={jest.fn()} />);
    // parseDateOnly が 2/30 を無効値(null)として扱い new Date() にフォールバック表示するため、
    // value 自体は非 null のまま（hasValue=true）でクリアボタンは表示され続ける
    expect(screen.getByRole('button', { name: '日付を削除' })).toBeTruthy();
  });
});

describe('DatePickerField クリアボタン', () => {
  it('value が null のときクリアボタンは表示されない', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} />);
    expect(screen.queryByRole('button', { name: '日付を削除' })).toBeNull();
  });

  it('value が設定されているときクリアボタンが表示される', () => {
    renderWithProviders(<DatePickerField label="取得日" value="2025-06-15" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '日付を削除' })).toBeTruthy();
  });

  it('クリアボタンを押すと onChange(null) が呼ばれる', () => {
    const onChange = jest.fn();
    renderWithProviders(<DatePickerField label="取得日" value="2025-06-15" onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '日付を削除' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clearAccessibilityLabel でクリアボタンのラベルをカスタマイズできる', () => {
    renderWithProviders(
      <DatePickerField
        label="記録日"
        value="2025-06-15"
        onChange={jest.fn()}
        clearAccessibilityLabel="記録日を削除"
      />
    );
    expect(screen.getByRole('button', { name: '記録日を削除' })).toBeTruthy();
  });
});

describe('DatePickerField iOS インラインスピナー', () => {
  it('フィールドをタップするとスピナーが開く', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
  });

  it('再度タップするとスピナーが閉じる', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} />);
    const field = screen.getByRole('button', { name: '取得日：日付を選択' });
    fireEvent.press(field);
    expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
    fireEvent.press(field);
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
  });

  it('日付を選択すると onChange が "YYYY-MM-DD" 形式で呼ばれる', () => {
    const onChange = jest.fn();
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    const picker = screen.getByTestId('mock-datetimepicker');
    fireEvent(picker, 'change', {}, new Date(2025, 5, 8));
    expect(onChange).toHaveBeenCalledWith('2025-06-08');
  });

  it('「完了」を押すとスピナーが閉じる', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    fireEvent.press(screen.getByLabelText('取得日の選択を完了'));
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
  });

  it('minimumDate / maximumDate がそのままネイティブピッカーに渡される', () => {
    const minimumDate = new Date(2020, 0, 1);
    const maximumDate = new Date(2030, 11, 31);
    renderWithProviders(
      <DatePickerField
        label="取得日"
        value={null}
        onChange={jest.fn()}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    const picker = screen.UNSAFE_getByType(RNDateTimePicker);
    expect(picker.props.minimumDate).toBe(minimumDate);
    expect(picker.props.maximumDate).toBe(maximumDate);
    expect(picker.props.mode).toBe('date');
  });
});

describe('DatePickerField Android ダイアログ', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  });

  it('フィールドをタップすると DateTimePickerAndroid.open が date モードで呼ばれる', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'date' })
    );
  });

  it('ダイアログで日付を確定すると onChange が呼ばれる', () => {
    const onChange = jest.fn();
    jest.mocked(DateTimePickerAndroid.open).mockImplementation((params) => {
      params.onChange?.({ type: 'set' } as never, new Date(2025, 8, 20));
    });
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    expect(onChange).toHaveBeenCalledWith('2025-09-20');
  });

  it('ダイアログをキャンセル（type!=="set"）すると onChange は呼ばれない', () => {
    const onChange = jest.fn();
    jest.mocked(DateTimePickerAndroid.open).mockImplementation((params) => {
      params.onChange?.({ type: 'dismissed' } as never, undefined);
    });
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Android では iOS 用インラインスピナーが描画されない', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
  });
});

describe('DatePickerField disabled', () => {
  it('disabled=true のときフィールドの accessibilityState.disabled が true になる', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} disabled />);
    const field = screen.getByRole('button', { name: '取得日：日付を選択' });
    expect(field.props.accessibilityState?.disabled).toBe(true);
  });

  it('disabled=true のときタップしてもスピナーが開かない', () => {
    renderWithProviders(<DatePickerField label="取得日" value={null} onChange={jest.fn()} disabled />);
    fireEvent.press(screen.getByRole('button', { name: '取得日：日付を選択' }));
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
  });

  it('disabled=true のときクリアボタンも disabled になる', () => {
    renderWithProviders(
      <DatePickerField label="取得日" value="2025-06-15" onChange={jest.fn()} disabled />
    );
    const clearButton = screen.getByRole('button', { name: '日付を削除' });
    expect(clearButton.props.accessibilityState?.disabled).toBe(true);
  });
});
