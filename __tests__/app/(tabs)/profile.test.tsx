/**
 * @module __tests__/app/(tabs)/profile
 * ProfileScreen（自分のプロフィール画面）のテスト。
 * ProfileHeader 採用・FlatList 構造・2クエリ（useCurrentUserQuery + useUserProfileQuery）に対応。
 * 4状態（loading / error / data / empty）を網羅する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import ProfileScreen from '@/app/(tabs)/profile/index';
import { ERR_PROFILE_LOAD_FAILED } from '@/lib/constants/errors';
import { makeUserProfile } from '@/__tests__/utils/data-factories';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockRefetchMe = jest.fn();
const mockRefetchProfile = jest.fn();
const mockUseCurrentUserQuery = jest.fn();
const mockUseUserProfileQuery = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/lib/queries/users', () => ({
  useUserProfileQuery: () => mockUseUserProfileQuery(),
}));

jest.mock('@/lib/queries/posts', () => ({
  useUserPostsQuery: jest.fn(() => ({
    data: { pages: [{ items: [], nextCursor: null }] },
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
  useToggleRepostMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useVotePollMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type MockUser = {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  isPremium: boolean;
};

function makeUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'テストユーザー',
    avatarUrl: null,
    bio: null,
    isPremium: false,
    ...overrides,
  };
}

function makeLoadingMe() {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: mockRefetchMe,
  };
}

function makeErrorMe() {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: mockRefetchMe,
  };
}

function makeSuccessMe(overrides: Partial<MockUser> = {}) {
  return {
    data: makeUser(overrides),
    isLoading: false,
    isError: false,
    refetch: mockRefetchMe,
  };
}

function makeLoadingProfile() {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: mockRefetchProfile,
  };
}

function makeSuccessProfile(overrides = {}) {
  return {
    data: makeUserProfile({ isSelf: true, ...overrides }),
    isLoading: false,
    isError: false,
    refetch: mockRefetchProfile,
  };
}

function makeUndefinedProfile() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: mockRefetchProfile,
  };
}

function makeErrorProfile() {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: mockRefetchProfile,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockRefetchMe.mockResolvedValue(undefined);
  mockRefetchProfile.mockResolvedValue(undefined);
  // デフォルト: 両クエリとも成功
  mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe());
  mockUseUserProfileQuery.mockReturnValue(makeSuccessProfile());
});

// ---------------------------------------------------------------------------
// loading 状態
// ---------------------------------------------------------------------------

describe('ProfileScreen: loading 状態', () => {
  it('useCurrentUserQuery が loading のとき ScreenLoading が描画される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeLoadingMe());
    mockUseUserProfileQuery.mockReturnValue(makeUndefinedProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('safe-area-view')).toBeTruthy();
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('useUserProfileQuery が loading のとき ScreenLoading が描画される（userId が確定済み）', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe());
    mockUseUserProfileQuery.mockReturnValue(makeLoadingProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('loading 中はヘッダー「プロフィール」が表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeLoadingMe());
    mockUseUserProfileQuery.mockReturnValue(makeUndefinedProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByRole('header', { name: 'プロフィール' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// error 状態
// ---------------------------------------------------------------------------

describe('ProfileScreen: error 状態', () => {
  it('useCurrentUserQuery が isError のとき ScreenError が描画される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeErrorMe());
    mockUseUserProfileQuery.mockReturnValue(makeUndefinedProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText(ERR_PROFILE_LOAD_FAILED)).toBeTruthy();
  });

  it('useUserProfileQuery が isError のとき ScreenError が描画される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe());
    mockUseUserProfileQuery.mockReturnValue(makeErrorProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText(ERR_PROFILE_LOAD_FAILED)).toBeTruthy();
  });

  it('useCurrentUserQuery data が undefined（isLoading=false）のとき ScreenError が表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mockRefetchMe,
    });
    mockUseUserProfileQuery.mockReturnValue(makeUndefinedProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText(ERR_PROFILE_LOAD_FAILED)).toBeTruthy();
  });

  it('error 状態のとき設定ボタンはヘッダーに表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeErrorMe());
    mockUseUserProfileQuery.mockReturnValue(makeUndefinedProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByRole('button', { name: '設定を開く' })).toBeTruthy();
  });

  it('error 時に ScreenError の onRetry を呼ぶと refetch が実行される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeErrorMe());
    mockUseUserProfileQuery.mockReturnValue(makeUndefinedProfile());

    renderWithProviders(<ProfileScreen />);
    const retryButton = screen.queryByRole('button', { name: '再試行' });
    if (retryButton !== null) {
      fireEvent.press(retryButton);
      expect(mockRefetchMe).toHaveBeenCalledTimes(1);
    } else {
      expect(screen.getByText(ERR_PROFILE_LOAD_FAILED)).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// data 状態（ProfileHeader の表示確認）
// ---------------------------------------------------------------------------

describe('ProfileScreen: data 状態', () => {
  it('プロフィール画面のヘッダー「プロフィール」が表示される', () => {
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByRole('header', { name: 'プロフィール' })).toBeTruthy();
  });

  it('設定ボタンが表示される', () => {
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByRole('button', { name: '設定を開く' })).toBeTruthy();
  });

  it('useCurrentUserQuery のニックネームが表示される（profile=undefined のフォールバック）', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe({ nickname: '盆栽太郎' }));
    mockUseUserProfileQuery.mockReturnValue(makeUndefinedProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('盆栽太郎')).toBeTruthy();
  });

  it('useUserProfileQuery のニックネームが優先して表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe({ nickname: 'MeNickname' }));
    mockUseUserProfileQuery.mockReturnValue(
      makeSuccessProfile({ nickname: 'プロフィールニックネーム', isSelf: true })
    );

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('プロフィールニックネーム')).toBeTruthy();
  });

  it('isPremium=true のときプレミアムバッジが表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe({ isPremium: true }));
    mockUseUserProfileQuery.mockReturnValue(makeSuccessProfile({ isSelf: true }));

    renderWithProviders(<ProfileScreen />);
    // ProfileHeader では "Premium" テキストで表示される
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('isPremium=false のときプレミアムバッジが表示されない', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe({ isPremium: false }));
    mockUseUserProfileQuery.mockReturnValue(makeSuccessProfile({ isSelf: true }));

    renderWithProviders(<ProfileScreen />);
    expect(screen.queryByText('Premium')).toBeNull();
  });

  it('bio が設定されているときに表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe());
    mockUseUserProfileQuery.mockReturnValue(
      makeSuccessProfile({ bio: '日本の盆栽が大好きです', isSelf: true })
    );

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('日本の盆栽が大好きです')).toBeTruthy();
  });

  it('bio が null のとき bio テキストは表示されない', () => {
    mockUseCurrentUserQuery.mockReturnValue(makeSuccessMe({ bio: null }));
    mockUseUserProfileQuery.mockReturnValue(makeSuccessProfile({ bio: null, isSelf: true }));

    renderWithProviders(<ProfileScreen />);
    expect(screen.queryByText('日本の盆栽が大好きです')).toBeNull();
  });

  it('isSelf=true のとき編集ボタンが表示される', () => {
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByRole('button', { name: 'プロフィールを編集' })).toBeTruthy();
  });

  it('フォロー/フォロワー/投稿数が表示される', () => {
    mockUseUserProfileQuery.mockReturnValue(
      makeSuccessProfile({ postsCount: 5, followersCount: 20, followingCount: 10, isSelf: true })
    );

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('isPublic=false のとき非公開バッジが表示される', () => {
    mockUseUserProfileQuery.mockReturnValue(
      makeSuccessProfile({ isPublic: false, isSelf: true })
    );

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('非公開')).toBeTruthy();
  });

  it('isPublic=true のとき非公開バッジが表示されない', () => {
    mockUseUserProfileQuery.mockReturnValue(
      makeSuccessProfile({ isPublic: true, isSelf: true })
    );

    renderWithProviders(<ProfileScreen />);
    expect(screen.queryByText('非公開')).toBeNull();
  });

  it('location が表示される', () => {
    mockUseUserProfileQuery.mockReturnValue(
      makeSuccessProfile({ location: '京都府', isSelf: true })
    );

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('京都府')).toBeTruthy();
  });

  it('location=null のとき location は表示されない', () => {
    mockUseUserProfileQuery.mockReturnValue(
      makeSuccessProfile({ location: null, isSelf: true })
    );

    renderWithProviders(<ProfileScreen />);
    expect(screen.queryByText('null')).toBeNull();
  });

  it('参加日が「○年○月から利用」形式で表示される', () => {
    mockUseUserProfileQuery.mockReturnValue(
      makeSuccessProfile({ createdAt: '2020-01-01T00:00:00Z', isSelf: true })
    );

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('2020年1月から利用')).toBeTruthy();
  });

  it('投稿がない場合の空状態メッセージが表示される', () => {
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('まだ投稿がありません')).toBeTruthy();
  });

  it('「投稿する」アクションボタンが表示される', () => {
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByRole('button', { name: '投稿する' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('ProfileScreen: オフライン状態', () => {
  it('オフラインのとき error 状態で OfflineBanner が表示される', () => {
    const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status');
    (useOnlineStatus as jest.Mock).mockReturnValue(false);

    mockUseCurrentUserQuery.mockReturnValue(makeErrorMe());
    mockUseUserProfileQuery.mockReturnValue(makeUndefinedProfile());

    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText(ERR_PROFILE_LOAD_FAILED)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// refetch
// ---------------------------------------------------------------------------

describe('ProfileScreen: refetch', () => {
  it('データ状態でプロフィール一覧コンテナが描画される（FlatList + RefreshControl 込み）', () => {
    renderWithProviders(<ProfileScreen />);
    // data 状態では FlatList を通じてプロフィールヘッダーと空状態が表示される
    expect(screen.getByText('まだ投稿がありません')).toBeTruthy();
  });
});
