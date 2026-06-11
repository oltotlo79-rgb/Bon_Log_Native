/**
 * components/auth/AuthDivider のユニットテスト。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AuthDivider } from '@/components/auth/AuthDivider';

describe('AuthDivider', () => {
  it('「または」テキストが表示される', () => {
    render(<AuthDivider />);
    expect(screen.getByText('または')).toBeTruthy();
  });

  it('正常にレンダリングされる', () => {
    const { toJSON } = render(<AuthDivider />);
    expect(toJSON()).not.toBeNull();
  });
});
