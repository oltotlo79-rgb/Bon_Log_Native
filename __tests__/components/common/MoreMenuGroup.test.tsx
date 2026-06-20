/**
 * @module __tests__/components/common/MoreMenuGroup
 * components/common/MoreMenuGroup のコンポーネントテスト。
 * children のレンダリングと複数アイテムの格納を検証する。
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { MoreMenuGroup } from '@/components/common/MoreMenuGroup';

describe('MoreMenuGroup', () => {
  it('children をレンダリングする', () => {
    render(
      <MoreMenuGroup>
        <Text>項目A</Text>
      </MoreMenuGroup>
    );
    expect(screen.getByText('項目A')).toBeTruthy();
  });

  it('複数の children をすべてレンダリングする', () => {
    render(
      <MoreMenuGroup>
        <Text>項目A</Text>
        <Text>項目B</Text>
        <Text>項目C</Text>
      </MoreMenuGroup>
    );
    expect(screen.getByText('項目A')).toBeTruthy();
    expect(screen.getByText('項目B')).toBeTruthy();
    expect(screen.getByText('項目C')).toBeTruthy();
  });

  it('children が空でもクラッシュしない', () => {
    expect(() =>
      render(<MoreMenuGroup>{null}</MoreMenuGroup>)
    ).not.toThrow();
  });

  it('testID を持つ children を正しく取得できる', () => {
    render(
      <MoreMenuGroup>
        <Text testID="inner-item">グループ内アイテム</Text>
      </MoreMenuGroup>
    );
    expect(screen.getByTestId('inner-item')).toBeTruthy();
  });
});
