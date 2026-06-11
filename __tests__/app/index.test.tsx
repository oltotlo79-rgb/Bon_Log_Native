/**
 * app/index.tsx のテスト。
 * ルートインデックスが (tabs)/feed へリダイレクトすることを確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RootIndex from '@/app/index';
import { ROUTE_FEED } from '@/lib/constants/routes';

describe('RootIndex', () => {
  it('(tabs)/feed へのリダイレクトが描画される', () => {
    render(<RootIndex />);
    const redirect = screen.getByTestId('redirect');
    expect(redirect).toBeTruthy();
  });

  it('リダイレクト先が ROUTE_FEED（フィード）である', () => {
    render(<RootIndex />);
    const redirect = screen.getByTestId('redirect');
    expect(redirect.props.children).toBe(`Redirect:${ROUTE_FEED}`);
  });
});
