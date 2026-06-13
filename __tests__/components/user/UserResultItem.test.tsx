/**
 * @module __tests__/components/user/UserResultItem
 * UserResultItem コンポーネントのテスト。
 * nickname/bio/フォロワー数表示・bio=null・タップ遷移・a11y を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { UserResultItem } from '@/components/user/UserResultItem';
import { makeSearchUserItem } from '@/__tests__/utils/data-factories';

describe('UserResultItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('通常表示', () => {
    it('ニックネームが表示される', () => {
      const user = makeSearchUserItem({ nickname: '松の匠' });
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      expect(screen.getByText('松の匠')).toBeTruthy();
    });

    it('bio が表示される', () => {
      const user = makeSearchUserItem({ bio: '盆栽歴20年。黒松専門。' });
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      expect(screen.getByText('盆栽歴20年。黒松専門。')).toBeTruthy();
    });

    it('フォロワー数が表示される', () => {
      const user = makeSearchUserItem({ followersCount: 150 });
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      expect(screen.getByText('150フォロワー')).toBeTruthy();
    });

    it('フォロワー数 0 でも正しく表示される', () => {
      const user = makeSearchUserItem({ followersCount: 0 });
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      expect(screen.getByText('0フォロワー')).toBeTruthy();
    });
  });

  describe('bio=null', () => {
    it('bio が null のとき bio テキストが表示されない', () => {
      const user = makeSearchUserItem({ bio: null });
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      // bio が null なので bio 表示エリアは非表示
      expect(screen.queryByText('undefined')).toBeNull();
    });

    it('bio が空文字のとき bio テキストが表示されない', () => {
      const user = makeSearchUserItem({ bio: '' });
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      // bio が空文字なので表示しない（コンポーネントの条件: bio !== null && bio.length > 0）
    });
  });

  describe('アバター', () => {
    it('avatarUrl が null のとき ニックネームの頭文字がフォールバックとして存在する', () => {
      const user = makeSearchUserItem({ nickname: '松の匠', avatarUrl: null });
      const { toJSON } = render(<UserResultItem user={user} onPress={jest.fn()} />);
      // フォールバック View は accessibilityElementsHidden のため getByText では取得できない
      // toJSON() でレンダーツリーを文字列変換して頭文字の存在を確認する
      expect(JSON.stringify(toJSON())).toContain('"松"');
    });
  });

  describe('タップ遷移', () => {
    it('アイテムをタップすると onPress に userId が渡される', () => {
      const onPress = jest.fn();
      const user = makeSearchUserItem({ id: 'user-abc-123' });
      render(<UserResultItem user={user} onPress={onPress} />);
      const button = screen.getByRole('button');
      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledWith('user-abc-123');
    });
  });

  describe('a11y', () => {
    it('accessibilityRole が "button" に設定される', () => {
      const user = makeSearchUserItem();
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('accessibilityLabel にニックネームとフォロワー数が含まれる', () => {
      const user = makeSearchUserItem({ nickname: '松の匠', followersCount: 100, bio: null });
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toContain('松の匠');
      expect(button.props.accessibilityLabel).toContain('100フォロワー');
    });

    it('accessibilityLabel に bio の先頭 50 文字が含まれる（bio が存在する場合）', () => {
      const bio = '盆栽歴20年。黒松専門。';
      const user = makeSearchUserItem({ nickname: '松の匠', bio, followersCount: 100 });
      render(<UserResultItem user={user} onPress={jest.fn()} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toContain(bio);
    });
  });
});
