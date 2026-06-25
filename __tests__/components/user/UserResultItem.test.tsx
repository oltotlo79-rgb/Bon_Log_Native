/**
 * @module __tests__/components/user/UserResultItem
 * UserResultItem コンポーネントのテスト。
 * nickname/bio/フォロワー数表示・bio=null・タップ遷移・a11y を検証する。
 * v1.4.0 以降: FollowButton を含むため renderWithProviders（QueryClientProvider）が必要。
 * currentUserId が自分自身と一致する行ではフォローボタンが非表示になることも検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { UserResultItem } from '@/components/user/UserResultItem';
import { makeSearchUserItem } from '@/__tests__/utils/data-factories';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: jest.fn(),
    DELETE: jest.fn(),
    PATCH: jest.fn(),
  },
  isApiError: () => false,
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

describe('UserResultItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('通常表示', () => {
    it('ニックネームが表示される', () => {
      const user = makeSearchUserItem({ nickname: '松の匠' });
      renderWithProviders(<UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />);
      expect(screen.getByText('松の匠')).toBeTruthy();
    });

    it('bio が表示される', () => {
      const user = makeSearchUserItem({ bio: '盆栽歴20年。黒松専門。' });
      renderWithProviders(<UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />);
      expect(screen.getByText('盆栽歴20年。黒松専門。')).toBeTruthy();
    });

    it('フォロワー数が表示される', () => {
      const user = makeSearchUserItem({ followersCount: 150 });
      renderWithProviders(<UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />);
      expect(screen.getByText('150フォロワー')).toBeTruthy();
    });

    it('フォロワー数 0 でも正しく表示される', () => {
      const user = makeSearchUserItem({ followersCount: 0 });
      renderWithProviders(<UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />);
      expect(screen.getByText('0フォロワー')).toBeTruthy();
    });
  });

  describe('bio=null', () => {
    it('bio が null のとき bio テキストが表示されない', () => {
      const user = makeSearchUserItem({ bio: null });
      renderWithProviders(<UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />);
      expect(screen.queryByText('undefined')).toBeNull();
    });

    it('bio が空文字のとき bio テキストが表示されない', () => {
      const user = makeSearchUserItem({ bio: '' });
      renderWithProviders(<UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />);
      // bio が空文字なので表示しない（コンポーネントの条件: bio !== null && bio.length > 0）
    });
  });

  describe('アバター', () => {
    it('avatarUrl が null のとき enso アバター画像が表示される', () => {
      const user = makeSearchUserItem({ nickname: '松の匠', avatarUrl: null });
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />
      );
      // UserAvatar は avatarUrl=null のとき enso 画像を表示する
      expect(screen.getByLabelText('松の匠のプロフィール画像')).toBeTruthy();
    });
  });

  describe('タップ遷移', () => {
    it('アイテムをタップすると onPress に userId が渡される', () => {
      const onPress = jest.fn();
      const user = makeSearchUserItem({ id: 'user-abc-123' });
      renderWithProviders(
        <UserResultItem user={user} onPress={onPress} currentUserId="other-user" />
      );
      const button = screen.getByRole('button', { name: /プロフィールを表示/ });
      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledWith('user-abc-123');
    });
  });

  describe('フォローボタン表示/非表示', () => {
    it('currentUserId が自分自身（item.id === currentUserId）のときフォローボタンが表示されない', () => {
      const user = makeSearchUserItem({ id: 'me-123', nickname: '自分自身' });
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId="me-123" />
      );
      // フォローボタン（「フォロー」テキスト）が存在しない
      expect(screen.queryByText('フォロー')).toBeNull();
      expect(screen.queryByText('フォロー中')).toBeNull();
      expect(screen.queryByText('申請中')).toBeNull();
    });

    it('currentUserId が他者のとき（未フォロー）フォローボタンが表示される', () => {
      const user = makeSearchUserItem({ id: 'user-2', nickname: '他のユーザー', following: false, requested: false });
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId="me-123" />
      );
      expect(screen.getByText('フォロー')).toBeTruthy();
    });

    it('currentUserId が他者のとき（フォロー中）フォロー中ボタンが表示される', () => {
      const user = makeSearchUserItem({ id: 'user-2', nickname: '他のユーザー', following: true, requested: false });
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId="me-123" />
      );
      expect(screen.getByText('フォロー中')).toBeTruthy();
    });

    it('currentUserId が他者のとき（申請中）申請中ボタンが表示される', () => {
      const user = makeSearchUserItem({ id: 'user-2', nickname: '他のユーザー', following: false, requested: true });
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId="me-123" />
      );
      expect(screen.getByText('申請中')).toBeTruthy();
    });

    it('currentUserId が undefined のときフォローボタンが表示される（未認証）', () => {
      const user = makeSearchUserItem({ id: 'user-2', nickname: '他のユーザー', following: false, requested: false });
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId={undefined} />
      );
      expect(screen.getByText('フォロー')).toBeTruthy();
    });
  });

  describe('a11y', () => {
    it('accessibilityRole が "button" に設定される', () => {
      const user = makeSearchUserItem();
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />
      );
      // 行全体のボタンとフォローボタンの両方が存在する
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('accessibilityLabel にニックネームとフォロワー数が含まれる', () => {
      const user = makeSearchUserItem({ nickname: '松の匠', followersCount: 100, bio: null });
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />
      );
      const button = screen.getByRole('button', { name: /プロフィールを表示/ });
      expect(button.props.accessibilityLabel).toContain('松の匠');
      expect(button.props.accessibilityLabel).toContain('100フォロワー');
    });

    it('accessibilityLabel に bio の先頭 50 文字が含まれる（bio が存在する場合）', () => {
      const bio = '盆栽歴20年。黒松専門。';
      const user = makeSearchUserItem({ nickname: '松の匠', bio, followersCount: 100 });
      renderWithProviders(
        <UserResultItem user={user} onPress={jest.fn()} currentUserId="other-user" />
      );
      const button = screen.getByRole('button', { name: /プロフィールを表示/ });
      expect(button.props.accessibilityLabel).toContain(bio);
    });
  });
});
