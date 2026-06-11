/**
 * components/post/PostCardContent のコンポーネントテスト。
 * テキスト/メンション(mentionUsers Map 解決)/ハッシュタグの色分け、
 * 150 字切り詰め + 「続きを読む」展開、content=null の防衛表示を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PostCardContent } from '@/components/post/PostCardContent';

const mockRouter = jest.requireMock('expo-router').router;

function renderContent(
  content: string | null | undefined,
  options: { disableNavigation?: boolean; mentionUsers?: ReadonlyMap<string, string> } = {}
) {
  return render(
    <PostCardContent
      content={content}
      disableNavigation={options.disableNavigation ?? false}
      mentionUsers={options.mentionUsers ?? new Map()}
    />
  );
}

describe('PostCardContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('content=null/undefined の防衛表示', () => {
    it('content=null のとき「(内容がありません)」を表示する', () => {
      renderContent(null);
      expect(screen.getByText('(内容がありません)')).toBeTruthy();
    });

    it('content=undefined のとき「(内容がありません)」を表示する', () => {
      renderContent(undefined);
      expect(screen.getByText('(内容がありません)')).toBeTruthy();
    });

    it('content="" のとき「(内容がありません)」を表示する', () => {
      renderContent('');
      expect(screen.getByText('(内容がありません)')).toBeTruthy();
    });
  });

  describe('プレーンテキスト', () => {
    it('通常テキストが表示される', () => {
      renderContent('黒松の春管理。新芽が伸びてきました。');
      expect(screen.getByText('黒松の春管理。新芽が伸びてきました。')).toBeTruthy();
    });
  });

  describe('メンション', () => {
    it('mentionUsers に userId が存在するとき表示名で表示される', () => {
      const mentionUsers = new Map([['user-abc', '松の師匠']]);
      renderContent('こんにちは<@user-abc>さん', { mentionUsers });
      // 表示名が解決される
      expect(screen.getByText('松の師匠')).toBeTruthy();
    });

    it('mentionUsers に userId が存在しないとき @userId でフォールバック表示される', () => {
      renderContent('こんにちは<@unknown-user>さん', { mentionUsers: new Map() });
      expect(screen.getByText('@unknown-user')).toBeTruthy();
    });

    it('メンションは accessibilityRole="link" を持つ', () => {
      const mentionUsers = new Map([['user-xyz', 'テストユーザー']]);
      renderContent('<@user-xyz>', { mentionUsers });
      expect(screen.getByRole('link', { name: 'テストユーザーのプロフィールを表示' })).toBeTruthy();
    });

    it('メンションをタップするとユーザー詳細画面へ遷移する', () => {
      const mentionUsers = new Map([['user-123', '盆栽家']]);
      renderContent('こんにちは<@user-123>', { mentionUsers });
      fireEvent.press(screen.getByRole('link', { name: '盆栽家のプロフィールを表示' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/user-123');
    });
  });

  describe('ハッシュタグ', () => {
    it('ハッシュタグが表示される', () => {
      // ハッシュタグの後にスペースを置くことで「#盆栽」だけがタグとして解析される
      renderContent('これが #盆栽 です');
      expect(screen.getByText('#盆栽')).toBeTruthy();
    });

    it('ハッシュタグは accessibilityRole="link" を持つ', () => {
      renderContent('これが #盆栽 です');
      expect(screen.getByRole('link', { name: '#盆栽を検索' })).toBeTruthy();
    });

    it('ハッシュタグをタップすると検索画面へ遷移する', () => {
      renderContent('#黒松');
      fireEvent.press(screen.getByRole('link', { name: '#黒松を検索' }));
      expect(mockRouter.push).toHaveBeenCalledWith(
        { pathname: '/(tabs)/search', params: { q: '#黒松' } }
      );
    });
  });

  describe('150 字切り詰め（disableNavigation=false）', () => {
    const longText = 'あ'.repeat(200);

    it('151 字以上のテキストで「続きを読む」ボタンが表示される', () => {
      renderContent(longText, { disableNavigation: false });
      expect(screen.getByRole('button', { name: '続きを読む' })).toBeTruthy();
    });

    it('150 字以内のテキストでは「続きを読む」ボタンが表示されない', () => {
      renderContent('あ'.repeat(150), { disableNavigation: false });
      expect(screen.queryByRole('button', { name: '続きを読む' })).toBeNull();
    });

    it('「続きを読む」をタップすると全文が展開されボタンが消える', () => {
      renderContent(longText, { disableNavigation: false });
      fireEvent.press(screen.getByRole('button', { name: '続きを読む' }));
      expect(screen.queryByRole('button', { name: '続きを読む' })).toBeNull();
    });
  });

  describe('disableNavigation=true（投稿詳細画面）', () => {
    it('長文でも「続きを読む」ボタンが表示されない', () => {
      renderContent('あ'.repeat(200), { disableNavigation: true });
      expect(screen.queryByRole('button', { name: '続きを読む' })).toBeNull();
    });
  });
});
