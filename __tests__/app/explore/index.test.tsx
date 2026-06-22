/**
 * app/explore/index のコンポーネントテスト。
 * トレンドタグ・ジャンル・おすすめユーザー表示・エラー・空状態・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ExploreScreen from '@/app/explore/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const defaultHashtagsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
};
const defaultGenresQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
};
const defaultUsersQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
};

const mockHashtagsQuery = { ...defaultHashtagsQuery };
const mockGenresQuery = { ...defaultGenresQuery };
const mockUsersQuery = { ...defaultUsersQuery };

jest.mock('@/lib/queries/explore', () => ({
  useTrendingHashtagsQuery: () => mockHashtagsQuery,
  useTrendingGenresQuery: () => mockGenresQuery,
  useRecommendedUsersQuery: () => mockUsersQuery,
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => ({ data: { id: 'u-me' } }),
}));

jest.mock('@/components/user/FollowButton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FollowButton: ({ targetNickname }: { targetNickname: string }) =>
      React.createElement(Text, { testID: `follow-btn-${targetNickname}` }, 'フォロー'),
  };
});

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeHashtagsData() {
  return {
    items: [
      { id: 'h1', name: '黒松', count: 100 },
      { id: 'h2', name: '五葉松', count: 80 },
    ],
  };
}

function makeGenresData() {
  return {
    items: [
      { id: 'g1', name: '松柏類', postCount: 200 },
      { id: 'g2', name: '雑木類', postCount: 150 },
    ],
  };
}

function makeUsersData() {
  return {
    items: [
      {
        id: 'u1',
        nickname: '松の匠',
        avatarUrl: null,
        bio: '黒松専門',
        followersCount: 100,
        following: false,
        requested: false,
        isPublic: true,
      },
      {
        id: 'u2',
        nickname: '盆栽花子',
        avatarUrl: null,
        bio: null,
        followersCount: 50,
        following: false,
        requested: false,
        isPublic: true,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  Object.assign(mockHashtagsQuery, defaultHashtagsQuery);
  Object.assign(mockGenresQuery, defaultGenresQuery);
  Object.assign(mockUsersQuery, defaultUsersQuery);
});

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

describe('ExploreScreen ヘッダー', () => {
  it('「発見」ヘッダーが表示される', () => {
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByRole('header', { name: '発見' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });

  it('戻るボタンタップで router.back() が呼ばれる', () => {
    renderWithProviders(<ExploreScreen />);
    fireEvent.press(screen.getByLabelText('戻る'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// セクション見出し
// ---------------------------------------------------------------------------

describe('ExploreScreen セクション見出し', () => {
  beforeEach(() => {
    mockHashtagsQuery.data = makeHashtagsData();
    mockGenresQuery.data = makeGenresData();
    mockUsersQuery.data = makeUsersData();
  });

  it('「トレンド」セクション見出しが表示される', () => {
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByRole('header', { name: 'トレンド' })).toBeTruthy();
  });

  it('「ジャンル」セクション見出しが表示される', () => {
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByRole('header', { name: 'ジャンル' })).toBeTruthy();
  });

  it('「おすすめユーザー」セクション見出しが表示される', () => {
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByRole('header', { name: 'おすすめユーザー' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// トレンドハッシュタグ
// ---------------------------------------------------------------------------

describe('ExploreScreen トレンドハッシュタグ', () => {
  it('ハッシュタグのアクセシビリティラベルが表示される', () => {
    mockHashtagsQuery.data = makeHashtagsData();
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByLabelText('#黒松の投稿を見る（100件）')).toBeTruthy();
    expect(screen.getByLabelText('#五葉松の投稿を見る（80件）')).toBeTruthy();
  });

  it('ハッシュタグタップで routeExplorePostsByHashtag へ遷移する', () => {
    mockHashtagsQuery.data = makeHashtagsData();
    renderWithProviders(<ExploreScreen />);
    fireEvent.press(screen.getByLabelText('#黒松の投稿を見る（100件）'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ hashtag: '黒松' }) })
    );
  });

  it('ハッシュタグのカウントが表示される', () => {
    mockHashtagsQuery.data = makeHashtagsData();
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('（100件）')).toBeTruthy();
  });

  it('トレンドセクションにエラーが表示される', () => {
    mockHashtagsQuery.isError = true;
    mockHashtagsQuery.data = undefined;
    renderWithProviders(<ExploreScreen />);
    expect(screen.getAllByText('発見コンテンツを読み込めませんでした。')[0]).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ジャンル
// ---------------------------------------------------------------------------

describe('ExploreScreen ジャンル', () => {
  it('ジャンルのアクセシビリティラベルが表示される', () => {
    mockGenresQuery.data = makeGenresData();
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByLabelText('松柏類の投稿を見る（200件）')).toBeTruthy();
    expect(screen.getByLabelText('雑木類の投稿を見る（150件）')).toBeTruthy();
  });

  it('ジャンルタップで routeExplorePostsByGenre へ遷移する', () => {
    mockGenresQuery.data = makeGenresData();
    renderWithProviders(<ExploreScreen />);
    fireEvent.press(screen.getByLabelText('松柏類の投稿を見る（200件）'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ genreId: 'g1' }) })
    );
  });

  it('ジャンルのカウントが表示される', () => {
    mockGenresQuery.data = makeGenresData();
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('（200件）')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// おすすめユーザー
// ---------------------------------------------------------------------------

describe('ExploreScreen おすすめユーザー', () => {
  it('ユーザー名が表示される', () => {
    mockUsersQuery.data = makeUsersData();
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('松の匠')).toBeTruthy();
    expect(screen.getByText('盆栽花子')).toBeTruthy();
  });

  it('フォロワー数が表示される', () => {
    mockUsersQuery.data = makeUsersData();
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('100人がフォロー中')).toBeTruthy();
  });

  it('bio がある場合は表示される', () => {
    mockUsersQuery.data = makeUsersData();
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('黒松専門')).toBeTruthy();
  });

  it('ユーザー行タップで プロフィール画面へ遷移する', () => {
    mockUsersQuery.data = makeUsersData();
    renderWithProviders(<ExploreScreen />);
    fireEvent.press(screen.getByLabelText('松の匠のプロフィールを見る'));
    expect(mockRouter.push).toHaveBeenCalledWith('/users/u1');
  });

  it('ユーザーが空のとき「おすすめユーザーはいません」が表示される', () => {
    mockUsersQuery.data = { items: [] };
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('おすすめユーザーはいません')).toBeTruthy();
  });

  it('おすすめユーザーのエラー時に ScreenError が表示される', () => {
    mockUsersQuery.isError = true;
    renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('発見コンテンツを読み込めませんでした。')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('ExploreScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<ExploreScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
