/**
 * components/auth/FormErrorMessage のユニットテスト。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';

describe('FormErrorMessage', () => {
  it('message=null のとき何も描画しない', () => {
    const { toJSON } = render(<FormErrorMessage message={null} />);
    expect(toJSON()).toBeNull();
  });

  it('message=undefined のとき何も描画しない', () => {
    const { toJSON } = render(<FormErrorMessage message={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('message が空文字のとき何も描画しない', () => {
    const { toJSON } = render(<FormErrorMessage message="" />);
    expect(toJSON()).toBeNull();
  });

  it('message があるときコンテナが描画される', () => {
    const { toJSON } = render(<FormErrorMessage message="ログインに失敗しました" />);
    expect(toJSON()).not.toBeNull();
  });

  it('accessibilityRole="alert" が設定される', () => {
    const { toJSON } = render(<FormErrorMessage message="ログインに失敗しました" />);
    const root = toJSON() as { props: Record<string, unknown> };
    expect(root.props.accessibilityRole).toBe('alert');
  });

  it('message テキストが表示される', () => {
    render(<FormErrorMessage message="ログインに失敗しました" />);
    expect(screen.getByText('ログインに失敗しました')).toBeTruthy();
  });

  it('accessibilityLiveRegion が assertive に設定される', () => {
    const { toJSON } = render(<FormErrorMessage message="エラーが発生しました" />);
    const root = toJSON() as { props: Record<string, unknown> };
    expect(root.props.accessibilityLiveRegion).toBe('assertive');
  });
});
