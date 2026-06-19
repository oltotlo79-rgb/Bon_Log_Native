/**
 * @module __tests__/components/profile/PublicToggleField
 * PublicToggleField コンポーネントのテスト。
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PublicToggleField } from '@/components/profile/PublicToggleField';

describe('PublicToggleField', () => {
  it('value=true のとき Switch が ON 状態になる', () => {
    const { getByLabelText } = render(
      <PublicToggleField value onChange={jest.fn()} />
    );

    const sw = getByLabelText('プロフィールを公開する');
    expect(sw.props.value).toBe(true);
  });

  it('value=false のとき Switch が OFF 状態になる', () => {
    const { getByLabelText } = render(
      <PublicToggleField value={false} onChange={jest.fn()} />
    );

    const sw = getByLabelText('プロフィールを公開する');
    expect(sw.props.value).toBe(false);
  });

  it('Switch を操作すると onChange が呼ばれる', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <PublicToggleField value={false} onChange={onChange} />
    );

    fireEvent(getByLabelText('プロフィールを公開する'), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disabled=true のとき Switch が無効化される', () => {
    const { getByLabelText } = render(
      <PublicToggleField value onChange={jest.fn()} disabled />
    );

    expect(getByLabelText('プロフィールを公開する').props.disabled).toBe(true);
  });

  it('ヒントテキストが表示される', () => {
    const { getByText } = render(
      <PublicToggleField value onChange={jest.fn()} />
    );

    expect(getByText(/非公開にすると/)).toBeTruthy();
  });
});
