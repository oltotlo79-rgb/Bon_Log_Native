/**
 * @module __tests__/components/profile/LocationField
 * LocationField（居住地選択トリガー + モーダル）のコンポーネントテスト。
 * 表示・モーダルでの選択・選択状態・クリア・クローズ操作・disabled を検証する。
 * 「北海道」は LOCATION_GROUPS 内で「日本の地方」と「都道府県」の両方に同名で
 * 存在するため、選択系のテストでは一意な値（青森県・東北）を使う。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { LocationField } from '@/components/profile/LocationField';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

describe('LocationField 表示', () => {
  it('value が空文字のとき「居住地を選択」がプレースホルダー表示される', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} />);
    expect(screen.getByText('居住地を選択')).toBeTruthy();
    expect(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' })).toBeTruthy();
  });

  it('value が設定されているときその値が表示される', () => {
    renderWithProviders(<LocationField value="青森県" onChange={jest.fn()} />);
    expect(screen.getByText('青森県')).toBeTruthy();
    expect(screen.getByRole('button', { name: '居住地（任意）：青森県' })).toBeTruthy();
  });

  it('固定ラベル「居住地（任意）」が表示される', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} />);
    expect(screen.getByText('居住地（任意）')).toBeTruthy();
  });
});

describe('LocationField クリアボタン', () => {
  it('value が空文字のときクリアボタンは表示されない', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} />);
    expect(screen.queryByLabelText('居住地を削除')).toBeNull();
  });

  it('value が設定されているときクリアボタンが表示される', () => {
    renderWithProviders(<LocationField value="青森県" onChange={jest.fn()} />);
    expect(screen.getByLabelText('居住地を削除')).toBeTruthy();
  });

  it('クリアボタンを押すと onChange("") が呼ばれる', () => {
    const onChange = jest.fn();
    renderWithProviders(<LocationField value="青森県" onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('居住地を削除'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('LocationField モーダル', () => {
  it('タップすると「居住地を選択」モーダルが開く', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' }));
    expect(screen.getByText('居住地を選択')).toBeTruthy();
  });

  it('グループ見出し（日本の地方・都道府県）が表示される', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' }));
    expect(screen.getByText('日本の地方')).toBeTruthy();
    expect(screen.getByText('都道府県')).toBeTruthy();
  });

  it('地方の選択肢（東北）と都道府県の選択肢（青森県）が radio ロールで表示される', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' }));
    expect(screen.getByRole('radio', { name: '東北' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '青森県' })).toBeTruthy();
  });

  it('value に一致する行が selected=true になる', () => {
    renderWithProviders(<LocationField value="青森県" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：青森県' }));
    expect(screen.getByRole('radio', { name: '青森県' }).props.accessibilityState?.selected).toBe(true);
    expect(screen.getByRole('radio', { name: '東北' }).props.accessibilityState?.selected).toBe(false);
  });

  it('選択肢をタップすると onChange が呼ばれ、モーダルが閉じる', () => {
    const onChange = jest.fn();
    renderWithProviders(<LocationField value="" onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' }));
    fireEvent.press(screen.getByRole('radio', { name: '青森県' }));
    expect(onChange).toHaveBeenCalledWith('青森県');
    expect(screen.queryByRole('radio', { name: '青森県' })).toBeNull();
  });

  it('地方（東北）をタップすると onChange に "東北" が渡される', () => {
    const onChange = jest.fn();
    renderWithProviders(<LocationField value="" onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' }));
    fireEvent.press(screen.getByRole('radio', { name: '東北' }));
    expect(onChange).toHaveBeenCalledWith('東北');
  });

  it('閉じるボタンを押すとモーダルが閉じ、onChange は呼ばれない', () => {
    const onChange = jest.fn();
    renderWithProviders(<LocationField value="" onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' }));
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
    fireEvent.press(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole('radio', { name: '青森県' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('backdrop をタップするとモーダルが閉じる', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' }));
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
    fireEvent.press(closeButtons[0]);
    expect(screen.queryByRole('radio', { name: '青森県' })).toBeNull();
  });
});

describe('LocationField disabled', () => {
  it('disabled=true のときフィールドの accessibilityState.disabled が true になる', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} disabled />);
    const field = screen.getByRole('button', { name: '居住地（任意）：居住地を選択' });
    expect(field.props.accessibilityState?.disabled).toBe(true);
  });

  it('disabled=true のときタップしてもモーダルが開かない', () => {
    renderWithProviders(<LocationField value="" onChange={jest.fn()} disabled />);
    fireEvent.press(screen.getByRole('button', { name: '居住地（任意）：居住地を選択' }));
    expect(screen.queryByRole('radio', { name: '青森県' })).toBeNull();
  });

  it('disabled=true のときクリアボタンも disabled になる', () => {
    renderWithProviders(<LocationField value="青森県" onChange={jest.fn()} disabled />);
    const clearButton = screen.getByLabelText('居住地を削除');
    expect(clearButton.props.accessibilityState?.disabled).toBe(true);
  });
});
