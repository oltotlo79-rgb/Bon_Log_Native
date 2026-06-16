/**
 * @module __tests__/components/settings/MutedUserListItem
 * MutedUserListItem コンポーネントのテスト。
 * 表示 / ミュート解除ボタン / disabled 状態を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { MutedUserListItem } from '@/components/settings/MutedUserListItem';
import type { UserMinimalWithBio } from '@/lib/queries/moderation';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeUser(overrides?: Partial<UserMinimalWithBio>): UserMinimalWithBio {
  return {
    id: 'user-2',
    nickname: 'ミュートユーザー',
    avatarUrl: null,
    bio: 'ミュート中の説明',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('MutedUserListItem', () => {
  const onUnmute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示', () => {
    it('ニックネームが表示される', () => {
      render(<MutedUserListItem user={makeUser()} onUnmute={onUnmute} isUnmuting={false} />);
      expect(screen.getByText('ミュートユーザー')).toBeTruthy();
    });

    it('bio が表示される', () => {
      render(<MutedUserListItem user={makeUser({ bio: '松柏類専門' })} onUnmute={onUnmute} isUnmuting={false} />);
      expect(screen.getByText('松柏類専門')).toBeTruthy();
    });

    it('bio が null のとき表示されない', () => {
      render(<MutedUserListItem user={makeUser({ bio: null })} onUnmute={onUnmute} isUnmuting={false} />);
      expect(screen.queryByText('null')).toBeNull();
    });

    it('avatarUrl が null のときアバター画像が表示されない（フォールバック表示）', () => {
      const { queryByRole } = render(
        <MutedUserListItem user={makeUser({ nickname: '松の匠', avatarUrl: null })} onUnmute={onUnmute} isUnmuting={false} />
      );
      // avatarUrl が null のときは expo-image による image ではなくフォールバック View が描画される
      expect(queryByRole('image')).toBeNull();
    });

    it('「ミュートを解除」ボタンが表示される', () => {
      render(<MutedUserListItem user={makeUser()} onUnmute={onUnmute} isUnmuting={false} />);
      expect(screen.getByRole('button', { name: 'ミュートユーザー のミュートを解除する' })).toBeTruthy();
    });
  });

  describe('解除ボタン操作', () => {
    it('ミュート解除ボタンを押すと onUnmute がユーザー ID で呼ばれる', () => {
      const user = makeUser({ id: 'user-xyz' });
      render(<MutedUserListItem user={user} onUnmute={onUnmute} isUnmuting={false} />);
      fireEvent.press(screen.getByRole('button', { name: 'ミュートユーザー のミュートを解除する' }));
      expect(onUnmute).toHaveBeenCalledWith('user-xyz');
    });

    it('isUnmuting=true のとき解除ボタンが disabled になる', () => {
      render(<MutedUserListItem user={makeUser()} onUnmute={onUnmute} isUnmuting />);
      const btn = screen.getByRole('button', { name: 'ミュートユーザー のミュートを解除する' });
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('isUnmuting=true のとき解除ボタンを押しても onUnmute は呼ばれない', () => {
      render(<MutedUserListItem user={makeUser()} onUnmute={onUnmute} isUnmuting />);
      fireEvent.press(screen.getByRole('button', { name: 'ミュートユーザー のミュートを解除する' }));
      expect(onUnmute).not.toHaveBeenCalled();
    });
  });
});
