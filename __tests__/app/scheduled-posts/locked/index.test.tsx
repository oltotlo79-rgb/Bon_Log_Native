/**
 * app/scheduled-posts/locked のロック画面テスト。
 * プレミアム案内・「プレミアムプランに登録する」ボタン・戻るボタンを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ScheduledPostsLockedScreen from '@/app/scheduled-posts/locked/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

describe('ScheduledPostsLockedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('「予約投稿」ヘッダーが表示される', () => {
    renderWithProviders(<ScheduledPostsLockedScreen />);
    expect(screen.getByText('予約投稿')).toBeTruthy();
  });

  it('「戻る」ボタンが表示される', () => {
    renderWithProviders(<ScheduledPostsLockedScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('「戻る」ボタンタップで router.back が呼ばれる', () => {
    renderWithProviders(<ScheduledPostsLockedScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('プレミアム案内テキストが表示される', () => {
    renderWithProviders(<ScheduledPostsLockedScreen />);
    expect(screen.getByText('予約投稿はプレミアム機能です')).toBeTruthy();
  });

  it('説明文が表示される', () => {
    renderWithProviders(<ScheduledPostsLockedScreen />);
    expect(
      screen.getByText(/プレミアムプランに加入すると/)
    ).toBeTruthy();
  });

  it('「プレミアムプランに登録する」ボタンが表示される', () => {
    renderWithProviders(<ScheduledPostsLockedScreen />);
    expect(screen.getByRole('button', { name: 'プレミアムプランに登録する' })).toBeTruthy();
  });

  it('「プレミアムプランに登録する」ボタンタップでサブスクリプション画面へ遷移する', () => {
    renderWithProviders(<ScheduledPostsLockedScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'プレミアムプランに登録する' }));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('subscription')
    );
  });
});
