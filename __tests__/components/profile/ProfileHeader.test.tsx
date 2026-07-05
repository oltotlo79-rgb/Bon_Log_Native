/**
 * @module __tests__/components/profile/ProfileHeader
 * ProfileHeader コンポーネントの単体テスト。
 * 全要素の表示、自分/他人のボタン出し分け、プレミアム・非公開バッジ、
 * bio/location の null ケース、盆栽歴・参加日の整形、統計数、を網羅する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProfileHeader, type ProfileHeaderProps } from '@/components/profile/ProfileHeader';

// FollowButton は lib/queries/follows を使用するため一元モックが必要
jest.mock('@/lib/queries/follows', () => ({
  useToggleFollowMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

// useOnlineStatus はデフォルト true
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

// ---------------------------------------------------------------------------
// デフォルト props（「他人のプロフィール」ベース）
// ---------------------------------------------------------------------------

const BASE_PROPS: ProfileHeaderProps = {
  id: 'user-1',
  nickname: '盆栽太郎',
  avatarUrl: null,
  headerUrl: null,
  bio: '黒松専門の盆栽家です。',
  location: '東京都',
  bonsaiStartYear: 2020,
  bonsaiStartMonth: 6,
  createdAt: '2020-01-15T00:00:00Z',
  isPublic: true,
  isPremium: false,
  postsCount: 42,
  followersCount: 100,
  followingCount: 50,
  isSelf: false,
  following: false,
  requested: false,
  currentUserId: 'me-1',
  onOpenMenu: undefined,
};

function renderHeader(props: Partial<ProfileHeaderProps> = {}) {
  return render(<ProfileHeader {...BASE_PROPS} {...props} />);
}

// ---------------------------------------------------------------------------
// ニックネーム表示
// ---------------------------------------------------------------------------

describe('ProfileHeader: ニックネーム', () => {
  it('nickname が表示される', () => {
    renderHeader();
    expect(screen.getByText('盆栽太郎')).toBeTruthy();
  });

  it('nickname が変更されると新しい値が表示される', () => {
    renderHeader({ nickname: '五葉松名人' });
    expect(screen.getByText('五葉松名人')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// カバー画像 / アバター
// ---------------------------------------------------------------------------

describe('ProfileHeader: 画像', () => {
  it('headerUrl が null のとき coverFallback の View が描画される', () => {
    renderHeader({ headerUrl: null });
    // カバー画像のアクセシビリティラベルがないことを確認（fallback は accessibilityElementsHidden）
    expect(screen.queryByLabelText('盆栽太郎のカバー画像')).toBeNull();
  });

  it('headerUrl が設定されているときカバー画像が描画される', () => {
    renderHeader({ headerUrl: 'https://example.com/cover.jpg' });
    expect(screen.getByLabelText('盆栽太郎のカバー画像')).toBeTruthy();
  });

  it('アバターのアクセシビリティラベルが設定される', () => {
    renderHeader({ nickname: '松花' });
    expect(screen.getByLabelText('松花のプロフィール画像')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// プレミアムバッジ
// ---------------------------------------------------------------------------

describe('ProfileHeader: プレミアムバッジ', () => {
  it('isPremium=true のとき「Premium」テキストが表示される', () => {
    renderHeader({ isPremium: true });
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('isPremium=false のとき「Premium」テキストが表示されない', () => {
    renderHeader({ isPremium: false });
    expect(screen.queryByText('Premium')).toBeNull();
  });

  it('isPremium=true のときアバターにスターバッジが描画される', () => {
    renderHeader({ isPremium: true });
    // プレミアムバッジの View: accessibilityLabel="プレミアム会員"
    expect(screen.getByLabelText('プレミアム会員')).toBeTruthy();
  });

  it('isPremium=false のときアバタースターバッジが描画されない', () => {
    renderHeader({ isPremium: false });
    expect(screen.queryByLabelText('プレミアム会員')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 非公開バッジ
// ---------------------------------------------------------------------------

describe('ProfileHeader: 非公開バッジ', () => {
  it('isPublic=false のとき「非公開」テキストが表示される', () => {
    renderHeader({ isPublic: false });
    expect(screen.getByText('非公開')).toBeTruthy();
  });

  it('isPublic=true のとき「非公開」テキストが表示されない', () => {
    renderHeader({ isPublic: true });
    expect(screen.queryByText('非公開')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// bio
// ---------------------------------------------------------------------------

describe('ProfileHeader: bio', () => {
  it('bio が設定されているとき表示される', () => {
    renderHeader({ bio: '黒松専門の盆栽家です。' });
    expect(screen.getByText('黒松専門の盆栽家です。')).toBeTruthy();
  });

  it('bio が null のとき bio テキストは表示されない', () => {
    renderHeader({ bio: null });
    expect(screen.queryByText('黒松専門の盆栽家です。')).toBeNull();
  });

  it('bio が空文字のとき bio テキストは表示されない', () => {
    renderHeader({ bio: '' });
    expect(screen.queryByText('')).toBeNull();
  });

  it('長い bio も表示される', () => {
    const longBio = '盆栽を始めて20年以上。主に松柏類と雑木類を育てています。毎年春の展示会にも参加。';
    renderHeader({ bio: longBio });
    expect(screen.getByText(longBio)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// location
// ---------------------------------------------------------------------------

describe('ProfileHeader: location', () => {
  it('location が設定されているとき表示される', () => {
    renderHeader({ location: '東京都' });
    expect(screen.getByText('東京都')).toBeTruthy();
  });

  it('location が null のとき location テキストは表示されない', () => {
    renderHeader({ location: null });
    expect(screen.queryByText('東京都')).toBeNull();
  });

  it('location が空文字のとき location テキストは表示されない', () => {
    renderHeader({ location: '' });
    // 空文字は条件 location.length > 0 で弾かれる
    expect(screen.queryByText('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 盆栽歴の整形ロジック（calculateBonsaiExperience）
// ---------------------------------------------------------------------------

describe('ProfileHeader: 盆栽歴', () => {
  it('bonsaiStartYear=null のとき盆栽歴メタ情報が表示されない', () => {
    renderHeader({ bonsaiStartYear: null, bonsaiStartMonth: null });
    expect(screen.queryByText(/盆栽歴/)).toBeNull();
  });

  it('bonsaiStartYear が設定されているとき「盆栽歴」テキストが表示される', () => {
    renderHeader({ bonsaiStartYear: 2010, bonsaiStartMonth: 1 });
    const els = screen.queryAllByText(/盆栽歴/);
    expect(els.length).toBeGreaterThan(0);
  });

  it('bonsaiStartMonth=null（月なし）でも盆栽歴が表示される', () => {
    renderHeader({ bonsaiStartYear: 2018, bonsaiStartMonth: null });
    const els = screen.queryAllByText(/盆栽歴/);
    expect(els.length).toBeGreaterThan(0);
  });

  it('開始年月が現在と一致するとき「1ヶ月未満」が表示される', () => {
    const now = new Date();
    // 現在の年月と同じ値を設定して「1ヶ月未満」を確認
    renderHeader({
      bonsaiStartYear: now.getFullYear(),
      bonsaiStartMonth: now.getMonth() + 1,
    });
    expect(screen.getByText('盆栽歴 1ヶ月未満')).toBeTruthy();
  });

  it('翌月設定（未来）のとき盆栽歴は表示されない', () => {
    const now = new Date();
    const futureYear = now.getFullYear() + 1;
    renderHeader({ bonsaiStartYear: futureYear, bonsaiStartMonth: 1 });
    expect(screen.queryByText(/盆栽歴/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 参加日の整形ロジック（formatJoinDate）
// ---------------------------------------------------------------------------

describe('ProfileHeader: 参加日', () => {
  it('createdAt から「○年○月から利用」形式で表示される', () => {
    renderHeader({ createdAt: '2020-01-15T00:00:00Z' });
    expect(screen.getByText('2020年1月から利用')).toBeTruthy();
  });

  it('createdAt が 2025-06 のとき「2025年6月から利用」が表示される', () => {
    renderHeader({ createdAt: '2025-06-01T00:00:00Z' });
    expect(screen.getByText('2025年6月から利用')).toBeTruthy();
  });

  it('createdAt が 2019-12 のとき参加年月が表示される', () => {
    // new Date('2019-12-31T23:59:59Z') はローカルタイムゾーンにより
    // 2019年12月または2020年1月になる。年月テキストの存在のみ検証する。
    renderHeader({ createdAt: '2019-12-01T00:00:00Z' });
    const els = screen.queryAllByText(/から利用/);
    expect(els.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 統計数
// ---------------------------------------------------------------------------

describe('ProfileHeader: 統計数', () => {
  it('postsCount が表示される', () => {
    renderHeader({ postsCount: 42 });
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('followingCount が表示される', () => {
    renderHeader({ followingCount: 50 });
    expect(screen.getByText('50')).toBeTruthy();
  });

  it('followersCount が表示される', () => {
    renderHeader({ followersCount: 100 });
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('postsCount=0 でも「0」が表示される', () => {
    renderHeader({ postsCount: 0, followersCount: 0, followingCount: 0 });
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it('大きな数値も正しく表示される', () => {
    renderHeader({ postsCount: 9999, followersCount: 9999, followingCount: 9999 });
    const nines = screen.getAllByText('9999');
    expect(nines.length).toBeGreaterThanOrEqual(3);
  });

  it('ラベル「投稿」「フォロー中」「フォロワー」が表示される', () => {
    renderHeader();
    expect(screen.getByText('投稿')).toBeTruthy();
    expect(screen.getByText('フォロー中')).toBeTruthy();
    expect(screen.getByText('フォロワー')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 自分のプロフィール（isSelf=true）
// ---------------------------------------------------------------------------

describe('ProfileHeader: 自分のプロフィール（isSelf=true）', () => {
  it('編集ボタンが表示される', () => {
    renderHeader({ isSelf: true });
    expect(screen.getByRole('button', { name: 'プロフィールを編集' })).toBeTruthy();
  });

  it('編集ボタンには「編集」テキストが表示される', () => {
    renderHeader({ isSelf: true });
    expect(screen.getByText('編集')).toBeTruthy();
  });

  it('フォローボタンは表示されない', () => {
    renderHeader({ isSelf: true, following: false, requested: false });
    // isSelf=true の場合はフォローボタンが出ないこと
    expect(screen.queryByLabelText(/フォローする/)).toBeNull();
    expect(screen.queryByLabelText(/フォローを解除/)).toBeNull();
  });

  it('メニューボタンは表示されない（isSelf=true かつ onOpenMenu なし）', () => {
    renderHeader({ isSelf: true, onOpenMenu: undefined });
    expect(screen.queryByRole('button', { name: 'その他のメニューを開く' })).toBeNull();
  });

  it('メッセージボタンは表示されない（isSelf=true）', () => {
    renderHeader({ isSelf: true, onMessagePress: jest.fn() });
    expect(screen.queryByLabelText('盆栽太郎にメッセージを送る')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 他人のプロフィール（isSelf=false）
// ---------------------------------------------------------------------------

describe('ProfileHeader: 他人のプロフィール（isSelf=false）', () => {
  it('フォローボタンが表示される（未フォロー）', () => {
    renderHeader({ isSelf: false, following: false, requested: false, currentUserId: 'me-1' });
    // FollowButton の accessibilityLabel は「{nickname} をフォローする」
    expect(screen.getByLabelText('盆栽太郎 をフォローする')).toBeTruthy();
  });

  it('フォロー中のときフォロー解除ラベルが設定される', () => {
    renderHeader({ isSelf: false, following: true, requested: false, currentUserId: 'me-1' });
    expect(screen.getByLabelText('盆栽太郎 のフォローを解除する')).toBeTruthy();
  });

  it('申請中のとき申請取り消しラベルが設定される', () => {
    renderHeader({ isSelf: false, following: false, requested: true, currentUserId: 'me-1' });
    expect(screen.getByLabelText('盆栽太郎 へのフォローリクエストを取り消す')).toBeTruthy();
  });

  it('編集ボタンは表示されない', () => {
    renderHeader({ isSelf: false });
    expect(screen.queryByRole('button', { name: 'プロフィールを編集' })).toBeNull();
  });

  it('onOpenMenu が渡されたときメニューボタンが表示される', () => {
    const onOpenMenu = jest.fn();
    renderHeader({ isSelf: false, onOpenMenu });
    expect(screen.getByRole('button', { name: 'その他のメニューを開く' })).toBeTruthy();
  });

  it('onOpenMenu が undefined のときメニューボタンが表示されない', () => {
    renderHeader({ isSelf: false, onOpenMenu: undefined });
    expect(screen.queryByRole('button', { name: 'その他のメニューを開く' })).toBeNull();
  });

  it('currentUserId=undefined でも targetNickname があればニックネームでラベルが設定される', () => {
    // ProfileHeader は nickname を FollowButton の targetNickname に渡すため、
    // currentUserId が undefined でも「{nickname} をフォローする」ラベルになる
    renderHeader({ isSelf: false, following: false, requested: false, currentUserId: undefined, nickname: '盆栽太郎' });
    expect(screen.getByLabelText('盆栽太郎 をフォローする')).toBeTruthy();
  });

  it('onMessagePress が渡されたときメッセージボタンが表示される', () => {
    const onMessagePress = jest.fn();
    renderHeader({ isSelf: false, onMessagePress });
    expect(
      screen.getByLabelText('盆栽太郎にメッセージを送る')
    ).toBeTruthy();
  });

  it('onMessagePress が undefined のときメッセージボタンが表示されない', () => {
    renderHeader({ isSelf: false, onMessagePress: undefined });
    expect(
      screen.queryByLabelText('盆栽太郎にメッセージを送る')
    ).toBeNull();
  });

  it('onMessagePress タップで onMessagePress が呼ばれる', () => {
    const onMessagePress = jest.fn();
    renderHeader({ isSelf: false, onMessagePress });
    fireEvent.press(screen.getByLabelText('盆栽太郎にメッセージを送る'));
    expect(onMessagePress).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// プレミアム + 非公開の複合ケース
// ---------------------------------------------------------------------------

describe('ProfileHeader: プレミアム + 非公開の複合ケース', () => {
  it('isPremium=true かつ isPublic=false のとき両方のバッジが表示される', () => {
    renderHeader({ isPremium: true, isPublic: false });
    expect(screen.getByText('Premium')).toBeTruthy();
    expect(screen.getByText('非公開')).toBeTruthy();
  });

  it('isPremium=false かつ isPublic=true のとき両方のバッジが表示されない', () => {
    renderHeader({ isPremium: false, isPublic: true });
    expect(screen.queryByText('Premium')).toBeNull();
    expect(screen.queryByText('非公開')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 境界値テスト
// ---------------------------------------------------------------------------

describe('ProfileHeader: 境界値', () => {
  it('postsCount=0 のとき「0」「投稿」が表示される', () => {
    renderHeader({ postsCount: 0 });
    expect(screen.getByText('投稿')).toBeTruthy();
  });

  it('bonsaiStartYear が 1 年前だけのとき「1年」または「Xヶ月」で表示される', () => {
    const now = new Date();
    renderHeader({
      bonsaiStartYear: now.getFullYear() - 1,
      bonsaiStartMonth: now.getMonth() + 1,
    });
    const els = screen.queryAllByText(/盆栽歴/);
    expect(els.length).toBeGreaterThan(0);
  });

  it('bio が設定されていて location が null のとき bio のみ表示される', () => {
    renderHeader({ bio: '松の盆栽が好きです', location: null });
    expect(screen.getByText('松の盆栽が好きです')).toBeTruthy();
    expect(screen.queryByText('東京都')).toBeNull();
  });

  it('bio が null で location が設定されているとき location のみ表示される', () => {
    renderHeader({ bio: null, location: '大阪府' });
    expect(screen.getByText('大阪府')).toBeTruthy();
    expect(screen.queryByText('黒松専門の盆栽家です。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 統計リンク（フォロー中・フォロワー・いいね一覧への遷移）
// ---------------------------------------------------------------------------

describe('ProfileHeader: 統計リンクのタップ遷移', () => {
  const mockRouterPush = jest.requireMock('expo-router').router.push as jest.Mock;

  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it('「フォロー中」統計をタップすると routeUserFollowing へ遷移する', () => {
    renderHeader({ id: 'user-abc', followingCount: 50 });
    fireEvent.press(screen.getByLabelText('フォロー中 50人。一覧を見る'));
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/users/[id]/following',
      params: { id: 'user-abc' },
    });
  });

  it('「フォロワー」統計をタップすると routeUserFollowers へ遷移する', () => {
    renderHeader({ id: 'user-abc', followersCount: 100 });
    fireEvent.press(screen.getByLabelText('フォロワー 100人。一覧を見る'));
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/users/[id]/followers',
      params: { id: 'user-abc' },
    });
  });

  it('「いいね」統計をタップすると routeUserLikes へ遷移する', () => {
    renderHeader({ id: 'user-abc' });
    fireEvent.press(screen.getByLabelText('いいねした投稿一覧を見る'));
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/users/[id]/likes',
      params: { id: 'user-abc' },
    });
  });

  it('いいね統計は件数を表示しない（count なし）', () => {
    renderHeader({ id: 'user-abc' });
    const likesLink = screen.getByLabelText('いいねした投稿一覧を見る');
    expect(likesLink).toBeTruthy();
    expect(screen.getByText('いいね')).toBeTruthy();
  });
});
