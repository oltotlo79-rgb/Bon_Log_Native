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
import { makeUserProfile } from '@/__tests__/utils/data-factories';

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseUserProfileQuery = jest.fn();
jest.mock('@/lib/queries/users', () => ({
  useUserProfileQuery: () => mockUseUserProfileQuery(),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

const defaultProfileState = {
  data: makeUserProfile({ isSelf: false }),
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

describe('UserDetailScreen', () => {
  describe('正常系（有効な id）', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'user-xyz-456' });
      mockUseUserProfileQuery.mockReturnValue(defaultProfileState);
      mockUseCurrentUserQuery.mockReturnValue({
        data: { id: 'me-1', nickname: '自分', avatarUrl: null, bio: null, isPremium: false },
      });
    });

    it('ヘッダーに「プロフィール」またはニックネームが表示される', () => {
      renderWithProviders(<UserDetailScreen />);
      // ProfileHeader の nickname も header ロールを持つため getAllByRole を使う
      const headers = screen.getAllByRole('header');
      expect(headers.length).toBeGreaterThanOrEqual(1);
    });

    it('戻るボタンが表示される', () => {
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('ブロック・通報へのメニューボタンが表示される（UGC 審査要件）', () => {
      renderWithProviders(<UserDetailScreen />);
      expect(
        screen.getByRole('button', { name: 'メニューを開く' })
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
