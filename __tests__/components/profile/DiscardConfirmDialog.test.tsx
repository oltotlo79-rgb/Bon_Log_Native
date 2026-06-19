/**
 * @module __tests__/components/profile/DiscardConfirmDialog
 * DiscardConfirmDialog コンポーネントのテスト。
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DiscardConfirmDialog } from '@/components/profile/DiscardConfirmDialog';

describe('DiscardConfirmDialog', () => {
  it('isVisible=true のときダイアログが表示される', () => {
    const { getByText } = render(
      <DiscardConfirmDialog
        isVisible
        onContinue={jest.fn()}
        onDiscard={jest.fn()}
      />
    );

    expect(getByText('変更を破棄しますか？')).toBeTruthy();
    expect(getByText('保存されていない変更は失われます。')).toBeTruthy();
  });

  it('isVisible=false のときダイアログが非表示になる', () => {
    const { queryByText } = render(
      <DiscardConfirmDialog
        isVisible={false}
        onContinue={jest.fn()}
        onDiscard={jest.fn()}
      />
    );

    expect(queryByText('変更を破棄しますか？')).toBeNull();
  });

  it('「編集を続ける」ボタンを押すと onContinue が呼ばれる', () => {
    const onContinue = jest.fn();
    const { getByLabelText } = render(
      <DiscardConfirmDialog
        isVisible
        onContinue={onContinue}
        onDiscard={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText('編集を続ける'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('「変更を破棄する」ボタンを押すと onDiscard が呼ばれる', () => {
    const onDiscard = jest.fn();
    const { getByLabelText } = render(
      <DiscardConfirmDialog
        isVisible
        onContinue={jest.fn()}
        onDiscard={onDiscard}
      />
    );

    fireEvent.press(getByLabelText('変更を破棄する'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
