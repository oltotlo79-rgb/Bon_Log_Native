/**
 * app/(auth)/_layout.tsx のレイアウトコンポーネントテスト。
 * Stack ナビゲーターのレンダリングを確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AuthLayout from '@/app/(auth)/_layout';

describe('AuthLayout', () => {
  it('レンダリングされる（Stack が表示される）', () => {
    render(<AuthLayout />);
    expect(screen.getByTestId('stack')).toBeTruthy();
  });
});
