/**
 * components/post/PostCard のコンポーネントテスト。
 * React.memo による再レンダー抑制、disableNavigation、content=null の防衛表示、
 * repostPost・quotePost・poll 新フィールドを確認する。
 * PostCard → PostCardActions → LikeButton → useToggleLikeMutation の連鎖があるため
 * renderWithProviders で QueryClientProvider を提供する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { PostCard } from '@/components/post/PostCard';
import { makePostCardProps, makeMedia, makeGenre, makeUser } from '@/__tests__/utils/post-card-factory';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import type { QuotedPostData } from '@/components/post/PostCard';

const mockRouter = jest.requireMock('expo-router').router;

// リポスト mutation のモック（ネットワークに出ない）
jest.mock('@/lib/queries/posts', () => ({
  useToggleRepostMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useVotePollMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

describe('PostCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本表示', () => {
    it('ユーザーのニックネームが表示される', () => {
      renderWithProviders(<PostCard {...makePostCardProps()} />);
      expect(screen.getByText('松の匠')).toBeTruthy();
    });

    it('投稿本文が表示される', () => {
      renderWithProviders(<PostCard {...makePostCardProps({ content: '黒松の春管理' })} />);
      expect(screen.getByText('黒松の春管理')).toBeTruthy();
    });

    it('testID="post-card" が設定されている', () => {
      renderWithProviders(<PostCard {...makePostCardProps()} />);
      expect(screen.getByTestId('post-card')).toBeTruthy();
    });
  });

  describe('墨筆枠（post-frame）', () => {
    it('post-frame 画像が描画される', () => {
      const { toJSON } = renderWithProviders(<PostCard {...makePostCardProps()} />);
      expect(JSON.stringify(toJSON())).toContain('post-frame.svg');
    });

    it('post-frame 画像は装飾として accessibilityElementsHidden が設定される', () => {
      const { toJSON } = renderWithProviders(<PostCard {...makePostCardProps()} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('"accessibilityElementsHidden":true');
    });

    it('post-frame 画像は accessible={false} で読み上げ対象外になっている', () => {
      const { toJSON } = renderWithProviders(<PostCard {...makePostCardProps()} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('"accessible":false');
    });

    it('post-frame 画像は importantForAccessibility="no-hide-descendants" が設定される', () => {
      const { toJSON } = renderWithProviders(<PostCard {...makePostCardProps()} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('"importantForAccessibility":"no-hide-descendants"');
    });
  });

  describe('content=null の防衛表示', () => {
    it('content=null のとき「(内容がありません)」が表示される', () => {
      renderWithProviders(<PostCard {...makePostCardProps({ content: null })} />);
      expect(screen.getByText('(内容がありません)')).toBeTruthy();
    });

    it('content=undefined のとき「(内容がありません)」が表示される', () => {
      renderWithProviders(<PostCard {...makePostCardProps({ content: undefined })} />);
      expect(screen.getByText('(内容がありません)')).toBeTruthy();
    });
  });

  describe('disableNavigation=false（デフォルト）', () => {
    it('カードをタップすると投稿詳細画面へ遷移する', () => {
      renderWithProviders(<PostCard {...makePostCardProps({ id: 'post-xyz' })} />);
      fireEvent.press(screen.getByTestId('post-card'));
      expect(mockRouter.push).toHaveBeenCalledWith('/posts/post-xyz');
    });

    it('accessibilityRole="button" を持つ要素が存在する', () => {
      renderWithProviders(<PostCard {...makePostCardProps()} />);
      // カード自体・アクションボタン複数のいずれかが button ロールを持つ
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });
  });

  describe('disableNavigation=true（投稿詳細画面）', () => {
    it('カードをタップしても遷移しない', () => {
      renderWithProviders(<PostCard {...makePostCardProps({ disableNavigation: true })} />);
      fireEvent.press(screen.getByTestId('post-card'));
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('画像・ジャンル', () => {
    it('media が空のとき画像エリアが表示されない', () => {
      renderWithProviders(<PostCard {...makePostCardProps({ media: [] })} />);
      // 画像 accessibilityLabel がないことで確認
      expect(screen.queryByLabelText('松の匠の投稿画像 1枚中 1枚目')).toBeNull();
    });

    it('media がある場合は画像が表示される', () => {
      const media = [makeMedia({ id: 'img-1', sortOrder: 0 })];
      renderWithProviders(<PostCard {...makePostCardProps({ media })} />);
      expect(screen.getByLabelText('松の匠の投稿画像 1枚中 1枚目')).toBeTruthy();
    });

    it('genres が空のとき genre タグが表示されない', () => {
      renderWithProviders(<PostCard {...makePostCardProps({ genres: [] })} />);
      expect(screen.queryByRole('button', { name: '松柏類で検索' })).toBeNull();
    });

    it('genres がある場合はタグが表示される', () => {
      const genres = [makeGenre({ name: '松柏類' })];
      renderWithProviders(<PostCard {...makePostCardProps({ genres })} />);
      // PostGenreTags 内の Pressable が「松柏類で検索」ラベルを持つ
      const tagButtons = screen.getAllByRole('button', { name: '松柏類で検索' });
      expect(tagButtons.length).toBeGreaterThan(0);
    });
  });

  describe('メニューボタン（onMenuPress / isOwnPost）', () => {
    it('他人の投稿でログイン済み（currentUserId あり）のとき 3点メニューボタンが表示される', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: makeUser({ id: 'other-user' }),
            currentUserId: 'viewer-user',
          })}
        />
      );
      // 同一ラベルの要素が複数ある場合も存在確認は getAllByRole で行う
      const menuButtons = screen.getAllByRole('button', { name: '投稿のオプションを開く' });
      expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('未認証（currentUserId=undefined）のとき 3点メニューボタンが表示されない', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: makeUser({ id: 'other-user' }),
            currentUserId: undefined,
          })}
        />
      );
      expect(screen.queryByRole('button', { name: '投稿のオプションを開く' })).toBeNull();
    });

    it('自分の投稿（isOwnPost=true）で onMenuPress なしのとき 3点メニューボタンが表示されない', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: makeUser({ id: 'viewer-user' }),
            currentUserId: 'viewer-user',
          })}
        />
      );
      expect(screen.queryByRole('button', { name: '投稿のオプションを開く' })).toBeNull();
    });

    it('自分の投稿（isOwnPost=true）で onMenuPress が渡されると 3点メニューボタンが表示される', () => {
      const onMenuPress = jest.fn();
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: makeUser({ id: 'viewer-user' }),
            currentUserId: 'viewer-user',
            onMenuPress,
          })}
        />
      );
      const menuButtons = screen.getAllByRole('button', { name: '投稿のオプションを開く' });
      expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('自分の投稿で onMenuPress が渡されたとき 3点ボタンを押すと onMenuPress が呼ばれる', () => {
      const onMenuPress = jest.fn();
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: makeUser({ id: 'viewer-user' }),
            currentUserId: 'viewer-user',
            onMenuPress,
          })}
        />
      );
      // RNTL は親 Pressable も同ラベルでヒットするため末尾が実際のメニューボタン
      const menuButtons = screen.getAllByRole('button', { name: '投稿のオプションを開く' });
      fireEvent.press(menuButtons[menuButtons.length - 1]);
      expect(onMenuPress).toHaveBeenCalledTimes(1);
    });

    it('他人の投稿で onMenuPress が渡されたとき 3点ボタンを押すと onMenuPress が呼ばれる', () => {
      const onMenuPress = jest.fn();
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: makeUser({ id: 'other-user' }),
            currentUserId: 'viewer-user',
            onMenuPress,
          })}
        />
      );
      const menuButtons = screen.getAllByRole('button', { name: '投稿のオプションを開く' });
      fireEvent.press(menuButtons[menuButtons.length - 1]);
      expect(onMenuPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('React.memo による再レンダー抑制', () => {
    it('props が参照等値のとき再レンダーが抑制される', () => {
      const props = makePostCardProps();
      const { rerender } = renderWithProviders(<PostCard {...props} />);
      // 同一 props オブジェクトで再レンダーしても DOM は変わらない
      rerender(<PostCard {...props} />);
      expect(screen.getByTestId('post-card')).toBeTruthy();
    });

    it('props が変更されたとき再レンダーされる', () => {
      const props = makePostCardProps({ content: '初期コンテンツ' });
      const { rerender } = renderWithProviders(<PostCard {...props} />);
      expect(screen.getByText('初期コンテンツ')).toBeTruthy();

      rerender(<PostCard {...makePostCardProps({ content: '更新コンテンツ' })} />);
      expect(screen.getByText('更新コンテンツ')).toBeTruthy();
    });
  });

  describe('repostPost（リポスト）', () => {
    function makeQuotedPostData(overrides?: Partial<QuotedPostData>): QuotedPostData {
      return {
        id: 'original-post-1',
        content: '元投稿の本文',
        user: {
          id: 'original-user-1',
          nickname: '元投稿の著者',
          avatarUrl: null,
        },
        ...overrides,
      };
    }

    it('repostPost がある場合、リポストインジケーターが表示される', () => {
      const reposterUser = makeUser({ id: 'reposter-1', nickname: 'リポストした人' });
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: reposterUser,
            repostPost: makeQuotedPostData(),
          })}
        />
      );
      expect(screen.getByText('がリポスト')).toBeTruthy();
    });

    it('repostPost がある場合、リポストユーザーのニックネームがインジケーターに表示される', () => {
      const reposterUser = makeUser({ id: 'reposter-1', nickname: 'リポストした人' });
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: reposterUser,
            repostPost: makeQuotedPostData(),
          })}
        />
      );
      expect(screen.getByText('リポストした人')).toBeTruthy();
    });

    it('repostPost がある場合、元投稿の本文が表示される', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            content: 'リポスト投稿の本文（非表示になるべき）',
            repostPost: makeQuotedPostData({ content: '元投稿の本文' }),
          })}
        />
      );
      expect(screen.getByText('元投稿の本文')).toBeTruthy();
    });

    it('repostPost がある場合、元投稿の著者ニックネームがヘッダーに表示される', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: makeUser({ nickname: 'リポストした人' }),
            repostPost: makeQuotedPostData({ user: { id: 'orig-user', nickname: '元著者', avatarUrl: null } }),
          })}
        />
      );
      expect(screen.getByText('元著者')).toBeTruthy();
    });

    it('repostPost がある場合、カードタップで元投稿の詳細画面に遷移する', () => {
      const mockRouter = jest.requireMock('expo-router').router;
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            id: 'repost-id',
            repostPost: makeQuotedPostData({ id: 'original-post-99' }),
          })}
        />
      );
      fireEvent.press(screen.getByTestId('post-card'));
      expect(mockRouter.push).toHaveBeenCalledWith('/posts/original-post-99');
    });

    it('repostPost が null のとき（通常投稿）リポストインジケーターが表示されない', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ repostPost: null })} />
      );
      expect(screen.queryByText('がリポスト')).toBeNull();
    });

    it('repostPost がない（undefined）のとき（通常投稿）リポストインジケーターが表示されない', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps()} />
      );
      expect(screen.queryByText('がリポスト')).toBeNull();
    });

    it('repostPost がある場合、元投稿に画像があれば画像が表示される', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            user: makeUser({ nickname: 'リポストした人' }),
            repostPost: makeQuotedPostData({
              user: { id: 'orig-user', nickname: '元著者', avatarUrl: null },
              media: [{ id: 'img-1', url: 'https://example.com/img.jpg', type: 'image', sortOrder: 0 }],
            }),
          })}
        />
      );
      expect(screen.getByLabelText('元著者の投稿画像 1枚中 1枚目')).toBeTruthy();
    });
  });

  describe('quotePost（引用投稿）', () => {
    function makeQuotedPostData(overrides?: Partial<QuotedPostData>): QuotedPostData {
      return {
        id: 'quoted-post-1',
        content: '引用元の本文',
        user: {
          id: 'quoted-user-1',
          nickname: '引用元著者',
          avatarUrl: null,
        },
        ...overrides,
      };
    }

    it('quotePost があるとき引用カードが表示される', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            quotePost: makeQuotedPostData(),
          })}
        />
      );
      expect(screen.getByText('引用元の本文')).toBeTruthy();
    });

    it('quotePost がある場合、引用元のニックネームが表示される', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            quotePost: makeQuotedPostData({ user: { id: 'q-user', nickname: '引用元著者', avatarUrl: null } }),
          })}
        />
      );
      expect(screen.getByText('引用元著者')).toBeTruthy();
    });

    it('quotePost が null のとき引用カードが表示されない', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ quotePost: null })} />
      );
      expect(screen.queryByLabelText(/の引用元投稿を表示/)).toBeNull();
    });

    it('quotePost タップで引用元投稿詳細に遷移する', () => {
      const mockRouter = jest.requireMock('expo-router').router;
      renderWithProviders(
        <PostCard
          {...makePostCardProps({
            quotePost: makeQuotedPostData({
              id: 'quoted-post-xyz',
              user: { id: 'q-user', nickname: '引用元著者', avatarUrl: null },
            }),
          })}
        />
      );
      // PostCard 全体も button ロールを持つため getAllByRole で末尾の引用カード要素を選択する
      const buttons = screen.getAllByRole('button', { name: '引用元著者の引用元投稿を表示' });
      fireEvent.press(buttons[buttons.length - 1]);
      expect(mockRouter.push).toHaveBeenCalledWith('/posts/quoted-post-xyz');
    });
  });

  describe('poll（アンケート）', () => {
    function makePollData() {
      return {
        id: 'poll-1',
        postId: 'post-1',
        duration: 86400,
        createdAt: '2025-06-01T10:00:00Z',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        options: [
          { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 6 } },
          { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 4 } },
        ],
        votes: [],
        _count: { votes: 10 },
      };
    }

    it('poll があるとき選択肢が表示される', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ poll: makePollData() })} />
      );
      expect(screen.getByText('松柏類')).toBeTruthy();
      expect(screen.getByText('雑木類')).toBeTruthy();
    });

    it('poll があるとき票数が表示される', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ poll: makePollData() })} />
      );
      expect(screen.getByText('10票')).toBeTruthy();
    });

    it('poll が undefined のとき PollDisplay は表示されない', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ poll: undefined })} />
      );
      expect(screen.queryByText('10票')).toBeNull();
      expect(screen.queryByText('投票機能は近日対応予定')).toBeNull();
    });

    it('poll が null のとき PollDisplay は何も表示しない', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ poll: null })} />
      );
      expect(screen.queryByText('松柏類')).toBeNull();
    });

    it('poll が undefined のとき PollDisplay は何も表示しない', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ poll: undefined })} />
      );
      expect(screen.queryByText('0票')).toBeNull();
    });
  });

  describe('repostCount と isReposted の表示', () => {
    it('repostCount が 0 のとき数値テキストが表示されない', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ repostCount: 0 })} />
      );
      // repostCount=0 のときカウント「0」テキストは表示されない
      expect(screen.queryByText('0')).toBeNull();
    });

    it('repostCount が 5 のとき「5」が表示される', () => {
      renderWithProviders(
        <PostCard {...makePostCardProps({ repostCount: 5 })} />
      );
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('isReposted=true かつ currentUserId ありのとき accessibilityLabel に「リポスト済み」が含まれる', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({ repostCount: 3, isReposted: true, currentUserId: 'user-1' })}
        />
      );
      expect(
        screen.getByLabelText('リポスト済み。現在 3 件。メニューを開く')
      ).toBeTruthy();
    });

    it('isReposted=false かつ currentUserId ありのとき accessibilityLabel に「リポスト済み」が含まれない', () => {
      renderWithProviders(
        <PostCard
          {...makePostCardProps({ repostCount: 2, isReposted: false, currentUserId: 'user-1' })}
        />
      );
      expect(screen.getByLabelText('リポストする。現在 2 件。メニューを開く')).toBeTruthy();
      expect(screen.queryByLabelText('リポスト済み。現在 2 件。メニューを開く')).toBeNull();
    });
  });
});
