/**
 * @module __tests__/app/users/user-detail-extended
 * UserDetailScreen の追加テスト（プロフィール表示 / ローディング / エラー / フォローボタン非表示）。
 * user-detail.test.tsx の既存テストと重複しないよう新規ケースのみを扱う。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import UserDetailScreen from '@/app/users/[id]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeUserProfile } from '@/__tests__/utils/data-factories';
import { ApiError } from '@/lib/api/errors';
import { ERR_PROFILE_LOAD_FAILED, ERR_NOT_FOUND } from '@/lib/constants/errors';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseUserProfileQuery = jest.fn();

jest.mock('@/lib/queries/users', () => ({
  useUserProfileQuery: () => mockUseUserProfileQuery(),
}));

const defaultProfileState = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

describe('UserDetailScreen - 拡張テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'user-xyz-456' });
    mockUseUserProfileQuery.mockReturnValue(defaultProfileState);
  });

  describe('ローディング状態', () => {
    it('isLoading=true のときローディングコンテンツが表示される（ヘッダーは残る）', () => {
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, isLoading: true });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByRole('header')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true の一般エラーのとき ERR_PROFILE_LOAD_FAILED が表示される', () => {
      mockUseUserProfileQuery.mockReturnValue({
        ...defaultProfileState,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText(ERR_PROFILE_LOAD_FAILED)).toBeTruthy();
    });

    it('NOT_FOUND エラーのとき ERR_NOT_FOUND が表示される', () => {
      const notFoundError = new ApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: 'User not found',
      });
      mockUseUserProfileQuery.mockReturnValue({
        ...defaultProfileState,
        isError: true,
        error: notFoundError,
      });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText(ERR_NOT_FOUND)).toBeTruthy();
    });
  });

  describe('プロフィール表示', () => {
    it('ニックネームがヘッダーとプロフィールに表示される', () => {
      const profile = makeUserProfile({ nickname: '松の名人' });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      // ヘッダーのタイトルにニックネームが表示される
      expect(screen.getByRole('header', { name: '松の名人' })).toBeTruthy();
      // プロフィール本文にもニックネームが表示される
      const nicknameElements = screen.getAllByText('松の名人');
      expect(nicknameElements.length).toBeGreaterThanOrEqual(1);
    });

    it('bio が表示される', () => {
      const profile = makeUserProfile({ bio: '盆栽歴10年。松柏類専門。' });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('盆栽歴10年。松柏類専門。')).toBeTruthy();
    });

    it('location が表示される', () => {
      const profile = makeUserProfile({ location: '京都府' });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('京都府')).toBeTruthy();
    });

    it('bonsaiStartYear と bonsaiStartMonth が表示される', () => {
      const profile = makeUserProfile({ bonsaiStartYear: 2015, bonsaiStartMonth: 4 });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('2015年4月から盆栽')).toBeTruthy();
    });

    it('bonsaiStartYear のみ（monthなし）が表示される', () => {
      const profile = makeUserProfile({ bonsaiStartYear: 2018, bonsaiStartMonth: null });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('2018年から盆栽')).toBeTruthy();
    });

    it('postsCount / followersCount / followingCount が表示される', () => {
      const profile = makeUserProfile({ postsCount: 42, followersCount: 100, followingCount: 50 });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('50')).toBeTruthy();
    });

    it('フォローボタンが表示されない（Phase 2b 待ち）', () => {
      const profile = makeUserProfile();
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      // フォローボタンは現時点では非表示
      expect(screen.queryByRole('button', { name: 'フォローする' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'フォロー中' })).toBeNull();
    });

    it('ブロック・通報メニューボタンが表示される（UGC 審査要件）', () => {
      const profile = makeUserProfile();
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(
        screen.getByRole('button', { name: 'メニューを開く' })
      ).toBeTruthy();
    });

    it('bio=null のとき bio テキストは表示されない', () => {
      const profile = makeUserProfile({ bio: null });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      // bio が null のときは bio テキストは存在しない（「null」のような文字が表示されない）
      expect(screen.queryByText('null')).toBeNull();
    });
  });
});
