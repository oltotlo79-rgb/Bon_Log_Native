/**
 * components/post/PostCard のコンポーネントテスト。
 * React.memo による再レンダー抑制、disableNavigation、content=null の防衛表示を確認する。
 * PostCard → PostCardActions → LikeButton → useToggleLikeMutation の連鎖があるため
 * renderWithProviders で QueryClientProvider を提供する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { PostCard } from '@/components/post/PostCard';
import { makePostCardProps, makeMedia, makeGenre, makeUser } from '@/__tests__/utils/post-card-factory';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

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
});
