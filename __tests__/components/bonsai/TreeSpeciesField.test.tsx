/**
 * @module __tests__/components/bonsai/TreeSpeciesField
 * TreeSpeciesField（樹種選択トリガー + モーダル）のコンポーネントテスト。
 * 表示・モーダルでの選択・選択状態・クローズ操作・disabled を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { TreeSpeciesField } from '@/components/bonsai/TreeSpeciesField';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

describe('TreeSpeciesField 表示', () => {
  it('value が空文字のとき「樹種を選択」がプレースホルダー表示される', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} />);
    expect(screen.getByText('樹種を選択')).toBeTruthy();
    expect(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' })).toBeTruthy();
  });

  it('value が設定されているときその値が表示される', () => {
    renderWithProviders(<TreeSpeciesField value="黒松" onChange={jest.fn()} />);
    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.getByRole('button', { name: '樹種（任意）：黒松' })).toBeTruthy();
  });

  it('固定ラベル「樹種（任意）」が表示される', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} />);
    expect(screen.getByText('樹種（任意）')).toBeTruthy();
  });
});

describe('TreeSpeciesField モーダル', () => {
  it('タップすると「樹種を選択」モーダルが開く', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
    expect(screen.getByText('樹種を選択')).toBeTruthy();
  });

  it('グループ見出し（松柏類・雑木類）が表示される', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
    expect(screen.getByText('松柏類')).toBeTruthy();
    expect(screen.getByText('雑木類')).toBeTruthy();
  });

  it('樹種の選択肢が radio ロールで表示される', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
    expect(screen.getByRole('radio', { name: '黒松' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '赤松' })).toBeTruthy();
  });

  it('未選択時はどの行も selected=false', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
    expect(screen.getByRole('radio', { name: '黒松' }).props.accessibilityState?.selected).toBe(false);
  });

  it('value に一致する行が selected=true になる', () => {
    renderWithProviders(<TreeSpeciesField value="黒松" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：黒松' }));
    expect(screen.getByRole('radio', { name: '黒松' }).props.accessibilityState?.selected).toBe(true);
    expect(screen.getByRole('radio', { name: '赤松' }).props.accessibilityState?.selected).toBe(false);
  });

  it('樹種をタップすると onChange が呼ばれ、モーダルが閉じる', () => {
    const onChange = jest.fn();
    renderWithProviders(<TreeSpeciesField value="" onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
    fireEvent.press(screen.getByRole('radio', { name: '黒松' }));
    expect(onChange).toHaveBeenCalledWith('黒松');
    // モーダル本文（選択肢一覧）が閉じて消えることを確認する
    // （トリガーの placeholder テキストは value 未更新のテストハーネスでは残り続けるため、
    // モーダル内固有の要素で判定する）
    expect(screen.queryByRole('radio', { name: '黒松' })).toBeNull();
  });

  it('閉じるボタン（ヘッダー）を押すとモーダルが閉じ、onChange は呼ばれない', () => {
    const onChange = jest.fn();
    renderWithProviders(<TreeSpeciesField value="" onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
    fireEvent.press(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole('radio', { name: '黒松' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('backdrop をタップするとモーダルが閉じる', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
    fireEvent.press(closeButtons[0]);
    expect(screen.queryByRole('radio', { name: '黒松' })).toBeNull();
  });
});

describe('TreeSpeciesField disabled', () => {
  it('disabled=true のときフィールドの accessibilityState.disabled が true になる', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} disabled />);
    const field = screen.getByRole('button', { name: '樹種（任意）：樹種を選択' });
    expect(field.props.accessibilityState?.disabled).toBe(true);
  });

  it('disabled=true のときタップしてもモーダルが開かない', () => {
    renderWithProviders(<TreeSpeciesField value="" onChange={jest.fn()} disabled />);
    fireEvent.press(screen.getByRole('button', { name: '樹種（任意）：樹種を選択' }));
    expect(screen.queryByRole('radio', { name: '黒松' })).toBeNull();
  });
});
