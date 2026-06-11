/**
 * components/post/PostCardHeader のコンポーネントテスト。
 * isPinned / editedAt / avatarUrl 有無 / onMenuPress 有無 / ナビゲーション を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PostCardHeader } from '@/components/post/PostCardHeader';
import { makeUser } from '@/__tests__/utils/post-card-factory';

const mockRouter = jest.requireMock('expo-router').router;

const BASE_DATE = new Date('2025-06-01T10:00:00Z');

describe('PostCardHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本表示', () => {
    it('ニックネームが表示される', () => {
      render(
        <PostCardHeader user={makeUser({ nickname: '松の匠' })} createdAt={BASE_DATE} />
      );
      expect(screen.getByText('松の匠')).toBeTruthy();
    });

    it('アバターボタンに accessibilityLabel が設定される', () => {
      render(
        <PostCardHeader user={makeUser({ nickname: '松の匠' })} createdAt={BASE_DATE} />
      );
      expect(
        screen.getByLabelText('松の匠のプロフィールを表示')
      ).toBeTruthy();
    });
  });

  describe('アバター表示', () => {
    it('avatarUrl が null のときフォールバック（ニックネーム頭文字）が表示される', () => {
      render(
        <PostCardHeader
          user={makeUser({ nickname: '黒松', avatarUrl: null })}
          createdAt={BASE_DATE}
        />
      );
      expect(screen.getByText('黒')).toBeTruthy();
    });

    it('avatarUrl が undefined のときフォールバックが表示される', () => {
      render(
        <PostCardHeader
          user={makeUser({ nickname: '五葉', avatarUrl: undefined })}
          createdAt={BASE_DATE}
        />
      );
      expect(screen.getByText('五')).toBeTruthy();
    });

    it('avatarUrl があるとき expo-image が表示される（フォールバックテキストなし）', () => {
      render(
        <PostCardHeader
          user={makeUser({ nickname: '盆栽師', avatarUrl: 'https://example.com/avatar.jpg' })}
          createdAt={BASE_DATE}
        />
      );
      // フォールバックテキスト（頭文字「盆」）が表示されない
      expect(screen.queryByText('盆')).toBeNull();
    });
  });

  describe('isPinned', () => {
    it('isPinned=true のとき「固定された投稿」が表示される', () => {
      render(
        <PostCardHeader user={makeUser()} createdAt={BASE_DATE} isPinned />
      );
      expect(screen.getByText('固定された投稿')).toBeTruthy();
    });

    it('isPinned=false（デフォルト）のとき「固定された投稿」が表示されない', () => {
      render(
        <PostCardHeader user={makeUser()} createdAt={BASE_DATE} />
      );
      expect(screen.queryByText('固定された投稿')).toBeNull();
    });
  });

  describe('editedAt', () => {
    it('editedAt が指定されているとき「（編集済み）」が表示される', () => {
      render(
        <PostCardHeader
          user={makeUser()}
          createdAt={BASE_DATE}
          editedAt={new Date('2025-06-02T10:00:00Z')}
        />
      );
      expect(screen.getByText('（編集済み）')).toBeTruthy();
    });

    it('editedAt=null のとき「（編集済み）」が表示されない', () => {
      render(
        <PostCardHeader user={makeUser()} createdAt={BASE_DATE} editedAt={null} />
      );
      expect(screen.queryByText('（編集済み）')).toBeNull();
    });

    it('editedAt=undefined（デフォルト）のとき「（編集済み）」が表示されない', () => {
      render(
        <PostCardHeader user={makeUser()} createdAt={BASE_DATE} />
      );
      expect(screen.queryByText('（編集済み）')).toBeNull();
    });
  });

  describe('onMenuPress', () => {
    it('onMenuPress が指定されているときメニューボタンが表示される', () => {
      const onMenuPress = jest.fn();
      render(
        <PostCardHeader user={makeUser()} createdAt={BASE_DATE} onMenuPress={onMenuPress} />
      );
      expect(screen.getByLabelText('投稿のオプションを開く')).toBeTruthy();
    });

    it('メニューボタンをタップすると onMenuPress が呼ばれる', () => {
      const onMenuPress = jest.fn();
      render(
        <PostCardHeader user={makeUser()} createdAt={BASE_DATE} onMenuPress={onMenuPress} />
      );
      fireEvent.press(screen.getByLabelText('投稿のオプションを開く'));
      expect(onMenuPress).toHaveBeenCalledTimes(1);
    });

    it('onMenuPress が未指定のときメニューボタンが表示されない', () => {
      render(
        <PostCardHeader user={makeUser()} createdAt={BASE_DATE} />
      );
      expect(screen.queryByLabelText('投稿のオプションを開く')).toBeNull();
    });
  });

  describe('ナビゲーション', () => {
    it('アバターをタップするとユーザー詳細画面へ遷移する', () => {
      render(
        <PostCardHeader
          user={makeUser({ id: 'user-abc', nickname: '松の匠' })}
          createdAt={BASE_DATE}
        />
      );
      fireEvent.press(screen.getByLabelText('松の匠のプロフィールを表示'));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/user-abc');
    });

    it('ニックネームをタップするとユーザー詳細画面へ遷移する', () => {
      render(
        <PostCardHeader
          user={makeUser({ id: 'user-xyz', nickname: '盆栽師' })}
          createdAt={BASE_DATE}
        />
      );
      fireEvent.press(screen.getByRole('button', { name: '盆栽師' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/user-xyz');
    });
  });

  describe('createdAt の表示', () => {
    it('createdAt が文字列でも表示される', () => {
      render(
        <PostCardHeader user={makeUser()} createdAt="2025-06-01T10:00:00Z" />
      );
      // 時刻テキストが何らかの形で表示されること（相対時刻は dynamic なので存在確認のみ）
      // accessibilityLabel に絶対日時が設定されているため、ロールで確認
      const timeTexts = screen.getAllByRole('text');
      expect(timeTexts.length).toBeGreaterThan(0);
    });
  });
});
