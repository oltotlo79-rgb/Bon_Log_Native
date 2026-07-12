/**
 * @module __tests__/components/profile/BirthdayField
 * BirthdayField コンポーネントのテスト。
 * components/common/DatePickerField の薄いラッパーとして、
 * ラベル・表示・日時ピッカーでの選択・クリア・disabled・上限日（今日）を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { BirthdayField } from '@/components/profile/BirthdayField';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

describe('BirthdayField', () => {
  describe('表示', () => {
    it('value が null のとき「誕生日を選択」がプレースホルダー表示される', () => {
      renderWithProviders(<BirthdayField value={null} onChange={jest.fn()} />);
      expect(screen.getByRole('button', { name: '誕生日（任意）：誕生日を選択' })).toBeTruthy();
      expect(screen.getByText('誕生日を選択')).toBeTruthy();
    });

    it('ISO 日付文字列が渡されると日本語の日付表示になる', () => {
      renderWithProviders(<BirthdayField value="2000-03-15" onChange={jest.fn()} />);
      expect(screen.getByRole('button', { name: '誕生日（任意）：2000年3月15日' })).toBeTruthy();
      expect(screen.getByText('2000年3月15日')).toBeTruthy();
    });

    it('value が null のとき「誕生日を削除」ボタンは表示されない', () => {
      renderWithProviders(<BirthdayField value={null} onChange={jest.fn()} />);
      expect(screen.queryByLabelText('誕生日を削除')).toBeNull();
    });

    it('value があるとき「誕生日を削除」ボタンが表示される', () => {
      renderWithProviders(<BirthdayField value="2000-01-01" onChange={jest.fn()} />);
      expect(screen.getByLabelText('誕生日を削除')).toBeTruthy();
    });
  });

  describe('日時ピッカーでの選択', () => {
    it('フィールドをタップすると日時ピッカー（iOS スピナー）が開く', () => {
      renderWithProviders(<BirthdayField value={null} onChange={jest.fn()} />);
      fireEvent.press(screen.getByRole('button', { name: '誕生日（任意）：誕生日を選択' }));
      expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
    });

    it('日付を選択すると onChange が "YYYY-MM-DD" 形式で呼ばれる', () => {
      const onChange = jest.fn();
      renderWithProviders(<BirthdayField value={null} onChange={onChange} />);
      fireEvent.press(screen.getByRole('button', { name: '誕生日（任意）：誕生日を選択' }));
      const picker = screen.getByTestId('mock-datetimepicker');
      fireEvent(picker, 'change', {}, new Date(2000, 2, 15));
      expect(onChange).toHaveBeenCalledWith('2000-03-15');
    });

    it('disabled=true のときタップしてもピッカーが開かない', () => {
      renderWithProviders(<BirthdayField value={null} onChange={jest.fn()} disabled />);
      fireEvent.press(screen.getByRole('button', { name: '誕生日（任意）：誕生日を選択' }));
      expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
    });
  });

  describe('クリア', () => {
    it('「誕生日を削除」を押すと onChange(null) が呼ばれる', () => {
      const onChange = jest.fn();
      renderWithProviders(<BirthdayField value="2000-01-01" onChange={onChange} />);
      fireEvent.press(screen.getByLabelText('誕生日を削除'));
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('disabled', () => {
    it('disabled=true のときフィールドの accessibilityState.disabled が true になる', () => {
      renderWithProviders(<BirthdayField value="2000-06-15" onChange={jest.fn()} disabled />);
      const field = screen.getByRole('button', { name: '誕生日（任意）：2000年6月15日' });
      expect(field.props.accessibilityState?.disabled).toBe(true);
    });

    it('disabled=true のとき「誕生日を削除」ボタンも disabled になる', () => {
      renderWithProviders(<BirthdayField value="2000-06-15" onChange={jest.fn()} disabled />);
      const clearButton = screen.getByLabelText('誕生日を削除');
      expect(clearButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('上限日（今日）', () => {
    it('maximumDate として今日の日付が DatePickerField に渡される（未来日を選べない）', () => {
      renderWithProviders(<BirthdayField value={null} onChange={jest.fn()} />);
      fireEvent.press(screen.getByRole('button', { name: '誕生日（任意）：誕生日を選択' }));
      const picker = screen.UNSAFE_getByType(RNDateTimePicker);
      const maximumDate = picker.props.maximumDate as Date;
      expect(maximumDate).toBeInstanceOf(Date);
      const now = new Date();
      expect(maximumDate.getFullYear()).toBe(now.getFullYear());
      expect(maximumDate.getMonth()).toBe(now.getMonth());
      expect(maximumDate.getDate()).toBe(now.getDate());
    });
  });
});
