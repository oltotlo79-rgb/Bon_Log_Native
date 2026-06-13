/**
 * app/users/[id] の画面テスト。
 * id パラメータの型ガードと、不正/空 id でのエラーメッセージ表示を検証する。
 * 有効 id の場合は QueryClientProvider が必要（useUserProfileQuery を使用）。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import UserDetailScreen from '@/app/users/[id]/index';
import { ERR_USER_NOT_FOUND } from '@/lib/constants/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

describe('UserDetailScreen', () => {
  describe('正常系（有効な id）', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'user-xyz-456' });
    });

    it('ヘッダーに「プロフィール」またはニックネームが表示される', () => {
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByRole('header')).toBeTruthy();
    });

    it('戻るボタンが表示される', () => {
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('ブロック・通報へのメニューボタンが表示される（UGC 審査要件）', () => {
      renderWithProviders(<UserDetailScreen />);
      expect(
        screen.getByRole('button', { name: 'メニューを開く（ブロック・通報）' })
      ).toBeTruthy();
    });
  });

  describe('異常系（不正な id）', () => {
    it('id が空文字の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });

    it('id が配列の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['x', 'y'] });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });

    it('id が undefined の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });

    it('エラー時にヘッダーの戻るボタンが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<UserDetailScreen />);
      // エラー表示時に「← 戻る」と「戻る」の2つのボタンがある
      const buttons = screen.getAllByRole('button', { name: '戻る' });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
