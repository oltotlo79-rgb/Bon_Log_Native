/**
 * components/post/QuotedPostCard のコンポーネントテスト。
 * 引用カードの内容表示・アバターフォールバック・画像表示・タップ遷移を網羅する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { QuotedPostCard } from '@/components/post/QuotedPostCard';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

function makeQuotedPost(overrides?: {
  id?: string;
  content?: string | null;
  user?: { id?: string; nickname?: string; avatarUrl?: string | null };
  media?: { id: string; url: string; type: string; sortOrder: number }[];
}) {
  return {
    id: overrides?.id ?? 'quoted-post-1',
    content: overrides?.content !== undefined ? overrides.content : '引用元の投稿本文です。',
    user: {
      id: overrides?.user?.id ?? 'user-quoted-1',
      nickname: overrides?.user?.nickname ?? '引用先ユーザー',
      avatarUrl:
        overrides?.user?.avatarUrl !== undefined ? overrides.user.avatarUrl : null,
    },
    media: overrides?.media,
  };
}

describe('QuotedPostCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ユーザー行', () => {
    it('ニックネームが表示される', () => {
      renderWithProviders(<QuotedPostCard post={makeQuotedPost()} />);
      expect(screen.getByText('引用先ユーザー')).toBeTruthy();
    });

    it('avatarUrl が null のときイニシャルフォールバックが表示される', () => {
      renderWithProviders(
        <QuotedPostCard post={makeQuotedPost({ user: { avatarUrl: null, nickname: '松の匠' } })} />
      );
      // フォールバックのイニシャルは accessibilityElementsHidden=true の Text 内にある
      expect(screen.getByText('松', { includeHiddenElements: true })).toBeTruthy();
    });

    it('avatarUrl がある場合は expo-image が表示される', () => {
      renderWithProviders(
        <QuotedPostCard
          post={makeQuotedPost({
            user: { avatarUrl: 'https://example.com/avatar.jpg', nickname: '松の匠' },
          })}
        />
      );
      expect(
        screen.getByLabelText('松の匠のプロフィール画像')
      ).toBeTruthy();
    });

    it('アバター image に accessibilityLabel が設定される', () => {
      renderWithProviders(
        <QuotedPostCard
          post={makeQuotedPost({
            user: { avatarUrl: 'https://example.com/avatar.jpg', nickname: '盆栽花子' },
          })}
        />
      );
      // expo-image モックは RN の Image に変換される。accessibilityLabel で存在確認する
      expect(screen.getByLabelText('盆栽花子のプロフィール画像')).toBeTruthy();
    });
  });

  describe('引用本文', () => {
    it('content が表示される', () => {
      renderWithProviders(
        <QuotedPostCard post={makeQuotedPost({ content: '引用元の内容' })} />
      );
      expect(screen.getByText('引用元の内容')).toBeTruthy();
    });

    it('content が null のとき本文要素が表示されない', () => {
      renderWithProviders(<QuotedPostCard post={makeQuotedPost({ content: null })} />);
      expect(screen.queryByText('引用元の投稿本文です。')).toBeNull();
    });

    it('content が空文字のとき本文要素が表示されない', () => {
      renderWithProviders(<QuotedPostCard post={makeQuotedPost({ content: '' })} />);
      expect(screen.queryByText('')).toBeNull();
    });
  });

  describe('画像サムネイル', () => {
    it('media がないとき画像サムネイルが表示されない', () => {
      renderWithProviders(
        <QuotedPostCard
          post={makeQuotedPost({ user: { nickname: '松の匠', avatarUrl: null }, media: [] })}
        />
      );
      expect(screen.queryByLabelText('松の匠の引用元画像')).toBeNull();
    });

    it('image タイプの media がある場合はサムネイルが表示される', () => {
      renderWithProviders(
        <QuotedPostCard
          post={makeQuotedPost({
            user: { nickname: '松の匠', avatarUrl: null },
            media: [
              { id: 'media-1', url: 'https://example.com/img.jpg', type: 'image', sortOrder: 0 },
            ],
          })}
        />
      );
      expect(screen.getByLabelText('松の匠の引用元画像')).toBeTruthy();
    });

    it('video タイプのみの場合は画像サムネイルが表示されない', () => {
      renderWithProviders(
        <QuotedPostCard
          post={makeQuotedPost({
            user: { nickname: '松の匠', avatarUrl: null },
            media: [
              { id: 'media-1', url: 'https://example.com/vid.mp4', type: 'video', sortOrder: 0 },
            ],
          })}
        />
      );
      expect(screen.queryByLabelText('松の匠の引用元画像')).toBeNull();
    });

    it('複数の画像がある場合は sortOrder が最小のものを表示する', () => {
      renderWithProviders(
        <QuotedPostCard
          post={makeQuotedPost({
            user: { nickname: '松の匠', avatarUrl: null },
            media: [
              { id: 'media-2', url: 'https://example.com/img2.jpg', type: 'image', sortOrder: 1 },
              { id: 'media-1', url: 'https://example.com/img1.jpg', type: 'image', sortOrder: 0 },
            ],
          })}
        />
      );
      const thumbnails = screen.getAllByLabelText('松の匠の引用元画像');
      expect(thumbnails).toHaveLength(1);
    });
  });

  describe('タップ遷移', () => {
    it('カードをタップすると投稿詳細画面に遷移する', () => {
      renderWithProviders(
        <QuotedPostCard post={makeQuotedPost({ id: 'quoted-abc', user: { nickname: '引用先ユーザー' } })} />
      );
      fireEvent.press(
        screen.getByRole('button', { name: '引用先ユーザーの引用元投稿を表示' })
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/posts/quoted-abc');
    });

    it('異なる投稿 ID のとき正しいルートに遷移する', () => {
      renderWithProviders(
        <QuotedPostCard
          post={makeQuotedPost({ id: 'post-xyz', user: { nickname: '盆栽花子' } })}
        />
      );
      fireEvent.press(
        screen.getByRole('button', { name: '盆栽花子の引用元投稿を表示' })
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/posts/post-xyz');
    });

    it('タップで router.push が1回だけ呼ばれる', () => {
      renderWithProviders(
        <QuotedPostCard post={makeQuotedPost({ user: { nickname: '引用先ユーザー' } })} />
      );
      fireEvent.press(
        screen.getByRole('button', { name: '引用先ユーザーの引用元投稿を表示' })
      );
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
    });
  });

  describe('アクセシビリティ', () => {
    it('カードに accessibilityRole="button" が設定される', () => {
      renderWithProviders(
        <QuotedPostCard post={makeQuotedPost({ user: { nickname: '引用先ユーザー' } })} />
      );
      expect(
        screen.getByRole('button', { name: '引用先ユーザーの引用元投稿を表示' })
      ).toBeTruthy();
    });

    it('カードに accessibilityLabel が設定される', () => {
      renderWithProviders(
        <QuotedPostCard post={makeQuotedPost({ user: { nickname: '松の匠' } })} />
      );
      expect(screen.getByLabelText('松の匠の引用元投稿を表示')).toBeTruthy();
    });
  });
});
