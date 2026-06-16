/**
 * @module __tests__/components/settings/BlockedUserListItem
 * BlockedUserListItem コンポーネントのテスト。
 * 表示 / ブロック解除ボタン / disabled 状態を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { BlockedUserListItem } from '@/components/settings/BlockedUserListItem';
import type { UserMinimalWithBio } from '@/lib/queries/moderation';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeUser(overrides?: Partial<UserMinimalWithBio>): UserMinimalWithBio {
  return {
    id: 'user-2',
    nickname: '盆栽花子',
    avatarUrl: null,
    bio: '盆栽愛好家',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('BlockedUserListItem', () => {
  const onUnblock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示', () => {
    it('ニックネームが表示される', () => {
      render(<BlockedUserListItem user={makeUser()} onUnblock={onUnblock} isUnblocking={false} />);
      expect(screen.getByText('盆栽花子')).toBeTruthy();
    });

    it('bio が表示される', () => {
      render(<BlockedUserListItem user={makeUser({ bio: '松柏類専門' })} onUnblock={onUnblock} isUnblocking={false} />);
      expect(screen.getByText('松柏類専門')).toBeTruthy();
    });

    it('bio が null のとき表示されない', () => {
      render(<BlockedUserListItem user={makeUser({ bio: null })} onUnblock={onUnblock} isUnblocking={false} />);
      expect(screen.queryByText('null')).toBeNull();
    });

    it('avatarUrl が null のときアバター画像が表示されない（フォールバック表示）', () => {
      const { queryByRole } = render(
        <BlockedUserListItem user={makeUser({ nickname: '盆栽太郎', avatarUrl: null })} onUnblock={onUnblock} isUnblocking={false} />
      );
      // avatarUrl が null のときは expo-image による image ではなくフォールバック View が描画される
      expect(queryByRole('image')).toBeNull();
    });

    it('「ブロックを解除」ボタンが表示される', () => {
      render(<BlockedUserListItem user={makeUser()} onUnblock={onUnblock} isUnblocking={false} />);
      expect(screen.getByRole('button', { name: '盆栽花子 のブロックを解除する' })).toBeTruthy();
    });
  });

  describe('解除ボタン操作', () => {
    it('ブロック解除ボタンを押すと onUnblock がユーザー ID で呼ばれる', () => {
      const user = makeUser({ id: 'user-abc' });
      render(<BlockedUserListItem user={user} onUnblock={onUnblock} isUnblocking={false} />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽花子 のブロックを解除する' }));
      expect(onUnblock).toHaveBeenCalledWith('user-abc');
    });

    it('isUnblocking=true のとき解除ボタンが disabled になる', () => {
      render(<BlockedUserListItem user={makeUser()} onUnblock={onUnblock} isUnblocking />);
      const btn = screen.getByRole('button', { name: '盆栽花子 のブロックを解除する' });
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('isUnblocking=true のとき解除ボタンを押しても onUnblock は呼ばれない', () => {
      render(<BlockedUserListItem user={makeUser()} onUnblock={onUnblock} isUnblocking />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽花子 のブロックを解除する' }));
      expect(onUnblock).not.toHaveBeenCalled();
    });
  });
});
