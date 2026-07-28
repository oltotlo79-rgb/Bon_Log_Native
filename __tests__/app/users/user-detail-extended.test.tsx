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

jest.mock('@/lib/queries/posts', () => ({
  useUserPostsQuery: jest.fn(() => ({
    data: { pages: [{ items: [], nextCursor: null }] },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
  useToggleRepostMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useVotePollMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock('@/lib/queries/likes', () => ({
  useToggleLikeMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock('@/lib/queries/bookmarks', () => ({
  useToggleBookmarkMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const mockUseUserProfileQuery = jest.fn();
const mockUseCurrentUserQuery = jest.fn();

jest.mock('@/lib/queries/users', () => ({
  ...jest.requireActual('@/lib/queries/users'),
  useUserProfileQuery: () => mockUseUserProfileQuery(),
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
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
    mockUseCurrentUserQuery.mockReturnValue({
      data: { id: 'me-1', nickname: '自分', avatarUrl: null, bio: null, isPremium: false },
    });
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
      // NavBar タイトルと ProfileHeader の nickname どちらも header ロールを持つ
      const headers = screen.getAllByRole('header', { name: '松の名人' });
      expect(headers.length).toBeGreaterThanOrEqual(1);
      // テキストとしても複数箇所に表示される（NavBar + ProfileHeader）
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
      // ProfileHeader は「盆栽歴 X年Yヶ月」形式で表示する
      // 年数は現在日時に依存するため、「盆栽歴」という接頭辞の存在で検証する
      const bonsaiTexts = screen.queryAllByText(/盆栽歴/);
      expect(bonsaiTexts.length).toBeGreaterThan(0);
    });

    it('bonsaiStartYear のみ（monthなし）が表示される', () => {
      const profile = makeUserProfile({ bonsaiStartYear: 2018, bonsaiStartMonth: null });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      // ProfileHeader は「盆栽歴 X年」または「盆栽歴 Xヶ月」形式で表示する
      const bonsaiTexts = screen.queryAllByText(/盆栽歴/);
      expect(bonsaiTexts.length).toBeGreaterThan(0);
    });

    it('postsCount / followersCount / followingCount が表示される', () => {
      const profile = makeUserProfile({ postsCount: 42, followersCount: 100, followingCount: 50 });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('50')).toBeTruthy();
    });

    it('フォローボタンが未フォロー状態のラベルで表示される', () => {
      const profile = makeUserProfile({ nickname: '盆栽太郎', following: false, requested: false });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      // FollowButton の accessibilityLabel は「{nickname} をフォローする」。
      // getByRole('button', { name: 'フォロー中' }) は統計リンク（フォロー中 N人。一覧を見る）内の
      // 子 Text と部分一致してしまうため、完全一致の getByLabelText でフォローボタン領域に限定する。
      expect(screen.getByLabelText('盆栽太郎 をフォローする')).toBeTruthy();
      expect(screen.queryByLabelText('盆栽太郎 のフォローを解除する')).toBeNull();
      expect(screen.queryByLabelText('盆栽太郎 へのフォローリクエストを取り消す')).toBeNull();
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

  describe('相手からブロックされている場合の表示（isBlockedByUser）', () => {
    it('isBlockedByUser=true のとき専用の通知文言が表示される', () => {
      const profile = makeUserProfile({ isBlockedByUser: true });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('このページは表示できません')).toBeTruthy();
      expect(screen.getByText('このユーザーからブロックされています')).toBeTruthy();
    });

    it('isBlockedByUser=true のときプロフィール本体（bio・統計）が表示されない', () => {
      const profile = makeUserProfile({
        isBlockedByUser: true,
        bio: '盆栽歴10年。松柏類専門。',
        postsCount: 42,
        followersCount: 100,
        followingCount: 50,
      });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.queryByText('盆栽歴10年。松柏類専門。')).toBeNull();
      expect(screen.queryByText('42')).toBeNull();
      expect(screen.queryByText('100')).toBeNull();
      expect(screen.queryByText('50')).toBeNull();
    });

    it('isBlockedByUser=true のとき投稿一覧が表示されない', () => {
      const profile = makeUserProfile({ isBlockedByUser: true });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.queryByText('まだ投稿がありません')).toBeNull();
    });

    it('isBlockedByUser=true のときメニューボタンが表示されない', () => {
      const profile = makeUserProfile({ isBlockedByUser: true, isSelf: false });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.queryByRole('button', { name: 'メニューを開く' })).toBeNull();
    });

    it('isBlockedByUser=true のときヘッダータイトルは「プロフィール」のまま（ニックネーム非表示）', () => {
      const profile = makeUserProfile({ isBlockedByUser: true, nickname: '松の名人' });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByRole('header', { name: 'プロフィール' })).toBeTruthy();
      expect(screen.queryByText('松の名人')).toBeNull();
    });

    it('isBlockedByUser=false のとき通常表示になる（ブロック通知は出ない）', () => {
      const profile = makeUserProfile({ isBlockedByUser: false, nickname: '松の名人' });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.queryByText('このページは表示できません')).toBeNull();
      expect(screen.getAllByText('松の名人').length).toBeGreaterThanOrEqual(1);
    });

    it('isBlockedByUser=undefined（サーバー未配備時）のとき安全側に倒れて通常表示になる', () => {
      const profile = makeUserProfile({ nickname: '松の名人' });
      // @ts-expect-error -- サーバー未配備時のレスポンス欠落を再現するため意図的に undefined を渡す
      profile.isBlockedByUser = undefined;
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.queryByText('このページは表示できません')).toBeNull();
      expect(screen.getAllByText('松の名人').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('自分が相手をブロックしている場合の表示（isBlocked） — Web 準拠の新規挙動', () => {
    it('isBlocked=true のとき専用の通知文言（自分がブロックしている側）が表示される', () => {
      const profile = makeUserProfile({ isBlocked: true, isBlockedByUser: false });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('このページは表示できません')).toBeTruthy();
      expect(screen.getByText('このユーザーをブロックしています')).toBeTruthy();
      expect(screen.queryByText('このユーザーからブロックされています')).toBeNull();
    });

    it('isBlocked=true のときプロフィール本体（bio・統計）が表示されない', () => {
      const profile = makeUserProfile({
        isBlocked: true,
        isBlockedByUser: false,
        bio: '盆栽歴10年。松柏類専門。',
        postsCount: 42,
        followersCount: 100,
        followingCount: 50,
      });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.queryByText('盆栽歴10年。松柏類専門。')).toBeNull();
      expect(screen.queryByText('42')).toBeNull();
      expect(screen.queryByText('100')).toBeNull();
      expect(screen.queryByText('50')).toBeNull();
    });

    it('isBlocked=true のとき投稿一覧・メニューボタンが表示されない', () => {
      const profile = makeUserProfile({ isBlocked: true, isBlockedByUser: false, isSelf: false });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.queryByText('まだ投稿がありません')).toBeNull();
      expect(screen.queryByRole('button', { name: 'メニューを開く' })).toBeNull();
    });

    it('isBlocked=true かつ isBlockedByUser=undefined（サーバー未配備時）でも isBlocked のみでプロフィールが隠れる', () => {
      const profile = makeUserProfile({ isBlocked: true, nickname: '松の名人' });
      // @ts-expect-error -- サーバー未配備時のレスポンス欠落を再現するため意図的に undefined を渡す
      profile.isBlockedByUser = undefined;
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('このページは表示できません')).toBeTruthy();
      expect(screen.getByText('このユーザーをブロックしています')).toBeTruthy();
      expect(screen.queryByText('松の名人')).toBeNull();
    });

    it('isBlocked=false かつ isBlockedByUser=false のとき通常表示になる（両方 false）', () => {
      const profile = makeUserProfile({ isBlocked: false, isBlockedByUser: false, nickname: '松の名人' });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.queryByText('このページは表示できません')).toBeNull();
      expect(screen.getAllByText('松の名人').length).toBeGreaterThanOrEqual(1);
    });

    it('isBlocked=true かつ isBlockedByUser=true（相互ブロック相当）のときブロック通知が表示される', () => {
      const profile = makeUserProfile({ isBlocked: true, isBlockedByUser: true });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('このページは表示できません')).toBeTruthy();
      // isBlockedByUser=true を優先し「相手からブロックされている」文言になる
      expect(screen.getByText('このユーザーからブロックされています')).toBeTruthy();
    });

    it('ブロック通知にアイコンが含まれない（Web 準拠: 見出し＋本文のみ）', () => {
      const profile = makeUserProfile({ isBlocked: true, isBlockedByUser: false });
      mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, data: profile });
      renderWithProviders(<UserDetailScreen />);
      expect(screen.getByText('このページは表示できません')).toBeTruthy();
      expect(screen.queryByTestId('icon-ban-outline')).toBeNull();
    });
  });
});
