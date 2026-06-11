/**
 * app/(tabs)/feed の画面テスト。
 * ヘッダー・FAB（新規投稿）の基本表示を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FeedScreen from '@/app/(tabs)/feed/index';
import { ROUTE_POST_NEW } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ヘッダーに「ホーム」と表示される', () => {
    render(<FeedScreen />);
    expect(screen.getByRole('header', { name: 'ホーム' })).toBeTruthy();
  });

  it('フィードプレースホルダーが表示される', () => {
    render(<FeedScreen />);
    expect(screen.getByText('フィード（実装予定）')).toBeTruthy();
  });

  it('新規投稿 FAB が表示される', () => {
    render(<FeedScreen />);
    expect(screen.getByRole('button', { name: '新規投稿' })).toBeTruthy();
  });

  it('FAB タップで posts/new へ遷移する', () => {
    render(<FeedScreen />);
    const fab = screen.getByRole('button', { name: '新規投稿' });
    fireEvent.press(fab);
    expect(mockRouter.push).toHaveBeenCalledWith(ROUTE_POST_NEW);
  });
});
