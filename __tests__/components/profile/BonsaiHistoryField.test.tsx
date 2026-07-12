/**
 * @module __tests__/components/profile/BonsaiHistoryField
 * BonsaiHistoryField（開始年 + 開始月ピッカー）のコンポーネントテスト。
 * 表示・年/月モーダルでの選択・選択状態・年未選択時の月フィールド非表示・disabled を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { BonsaiHistoryField } from '@/components/profile/BonsaiHistoryField';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const CURRENT_YEAR = new Date().getFullYear();

describe('BonsaiHistoryField 表示', () => {
  it('固定ラベル「盆栽を始めた時期（任意）」が表示される', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    expect(screen.getByText('盆栽を始めた時期（任意）')).toBeTruthy();
  });

  it('yearValue が空のとき「年を選択」がプレースホルダー表示される', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: '開始年（任意）：年を選択' })).toBeTruthy();
  });

  it('yearValue が空のとき月フィールドは表示されない', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    expect(screen.queryByRole('button', { name: /^開始月（任意）/ })).toBeNull();
  });

  it('yearValue が設定されると年フィールドに反映され、月フィールドが表示される', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="2015" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: '開始年（任意）：2015年' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '開始月（任意）：月を選択' })).toBeTruthy();
  });

  it('monthValue が設定されると月フィールドに反映される', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="2015" monthValue="3" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: '開始月（任意）：3月' })).toBeTruthy();
  });
});

describe('BonsaiHistoryField 年モーダル', () => {
  it('年フィールドをタップすると「開始年を選択」モーダルが開く', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    fireEvent.press(screen.getByRole('button', { name: '開始年（任意）：年を選択' }));
    expect(screen.getByText('開始年を選択')).toBeTruthy();
  });

  it('今年の年が選択肢の先頭に表示される（降順）', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    fireEvent.press(screen.getByRole('button', { name: '開始年（任意）：年を選択' }));
    expect(screen.getByRole('radio', { name: `${CURRENT_YEAR}年` })).toBeTruthy();
  });

  it('yearValue に一致する選択肢が selected=true になる', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue={String(CURRENT_YEAR)} monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    fireEvent.press(screen.getByRole('button', { name: `開始年（任意）：${CURRENT_YEAR}年` }));
    expect(screen.getByRole('radio', { name: `${CURRENT_YEAR}年` }).props.accessibilityState?.selected).toBe(true);
  });

  it('年を選択すると onYearChange が文字列で呼ばれ、モーダルが閉じる', () => {
    const onYearChange = jest.fn();
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={onYearChange} onMonthChange={jest.fn()} />
    );
    fireEvent.press(screen.getByRole('button', { name: '開始年（任意）：年を選択' }));
    fireEvent.press(screen.getByRole('radio', { name: `${CURRENT_YEAR}年` }));
    expect(onYearChange).toHaveBeenCalledWith(String(CURRENT_YEAR));
    expect(screen.queryByRole('radio', { name: `${CURRENT_YEAR}年` })).toBeNull();
  });

  it('閉じるボタンを押すとモーダルが閉じ、onYearChange は呼ばれない', () => {
    const onYearChange = jest.fn();
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={onYearChange} onMonthChange={jest.fn()} />
    );
    fireEvent.press(screen.getByRole('button', { name: '開始年（任意）：年を選択' }));
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
    fireEvent.press(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole('radio', { name: `${CURRENT_YEAR}年` })).toBeNull();
    expect(onYearChange).not.toHaveBeenCalled();
  });
});

describe('BonsaiHistoryField 月モーダル', () => {
  it('月フィールドをタップすると「開始月を選択」モーダルが開く', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="2015" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    fireEvent.press(screen.getByRole('button', { name: '開始月（任意）：月を選択' }));
    expect(screen.getByText('開始月を選択')).toBeTruthy();
    expect(screen.getByRole('radio', { name: '1月' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '12月' })).toBeTruthy();
  });

  it('monthValue に一致する選択肢が selected=true になる', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="2015" monthValue="6" onYearChange={jest.fn()} onMonthChange={jest.fn()} />
    );
    fireEvent.press(screen.getByRole('button', { name: '開始月（任意）：6月' }));
    expect(screen.getByRole('radio', { name: '6月' }).props.accessibilityState?.selected).toBe(true);
    expect(screen.getByRole('radio', { name: '1月' }).props.accessibilityState?.selected).toBe(false);
  });

  it('月を選択すると onMonthChange が文字列で呼ばれる', () => {
    const onMonthChange = jest.fn();
    renderWithProviders(
      <BonsaiHistoryField yearValue="2015" monthValue="" onYearChange={jest.fn()} onMonthChange={onMonthChange} />
    );
    fireEvent.press(screen.getByRole('button', { name: '開始月（任意）：月を選択' }));
    fireEvent.press(screen.getByRole('radio', { name: '6月' }));
    expect(onMonthChange).toHaveBeenCalledWith('6');
  });
});

describe('BonsaiHistoryField disabled', () => {
  it('disabled=true のとき年フィールドの accessibilityState.disabled が true になる', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} disabled />
    );
    const field = screen.getByRole('button', { name: '開始年（任意）：年を選択' });
    expect(field.props.accessibilityState?.disabled).toBe(true);
  });

  it('disabled=true のとき年フィールドタップしてもモーダルが開かない', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} disabled />
    );
    fireEvent.press(screen.getByRole('button', { name: '開始年（任意）：年を選択' }));
    expect(screen.queryByText('開始年を選択')).toBeNull();
  });

  it('disabled=true のとき月フィールドの accessibilityState.disabled も true になる', () => {
    renderWithProviders(
      <BonsaiHistoryField yearValue="2015" monthValue="" onYearChange={jest.fn()} onMonthChange={jest.fn()} disabled />
    );
    const field = screen.getByRole('button', { name: '開始月（任意）：月を選択' });
    expect(field.props.accessibilityState?.disabled).toBe(true);
  });
});
