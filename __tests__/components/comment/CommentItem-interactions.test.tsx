/**
 * @module __tests__/components/comment/CommentItem-interactions
 * CommentItem のインタラクションテスト。
 * メニューオープン / 返信 / 削除シート / メンションタップを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor, render } from '@testing-library/react-native';
import { CommentItem } from '@/components/comment/CommentItem';
import { makeCommentItem } from '@/__tests__/utils/data-factories';

// UserActionMenu は別コンポーネントのテストで扱うのでここではモック
jest.mock('@/components/user/UserActionMenu', () => ({
  UserActionMenu: ({
    targetUserNickname,
    onClose,
  }: {
    targetUserNickname: string;
    onClose: () => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock ファクトリ内では ESM import が使えないため require を使用する（Jest 制約）
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="user-action-menu">
        <Text>{targetUserNickname}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="メニューを閉じる">
          <Text>閉じる</Text>
        </Pressable>
      </View>
    );
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CommentItem - 「⋮」ボタン（自分のコメント: iOS 動作）', () => {
  it('「⋮」ボタンを押しても例外なく handleMenuOpen が実行される', () => {
    const item = makeCommentItem({
      userId: 'me',
      user: { id: 'me', nickname: '私', avatarUrl: null, isBlocked: false, isMuted: false },
    });
    render(<CommentItem item={item} currentUserId="me" onDelete={jest.fn()} />);

    // iOS では deleteSheetVisible=true になるが Modal は描画されない
    // handleMenuOpen が例外なく実行されることを確認
    expect(() => {
      fireEvent.press(screen.getByRole('button', { name: 'コメントのオプションを開く' }));
    }).not.toThrow();

    expect(screen.getByTestId('comment-item')).toBeTruthy();
  });
});

describe('CommentItem - 他人コメントのメニュー', () => {
  it('他人のコメントの「⋮」ボタンを押すと UserActionMenu が開く', async () => {
    const item = makeCommentItem({
      userId: 'other',
      user: { id: 'other', nickname: '他の人', avatarUrl: null, isBlocked: false, isMuted: false },
    });
    // モックした UserActionMenu を使うため render で OK
    render(<CommentItem item={item} currentUserId="me" />);

    fireEvent.press(screen.getByRole('button', { name: 'コメントのオプションを開く' }));

    // モックされた UserActionMenu が描画される（user-action-menu の testID で確認）
    await waitFor(() => {
      expect(screen.getByTestId('user-action-menu')).toBeTruthy();
    });
  });

  it('UserActionMenu の閉じるボタンを押すとメニューが閉じる', async () => {
    const item = makeCommentItem({
      userId: 'other',
      user: { id: 'other', nickname: '閉じる先', avatarUrl: null, isBlocked: false, isMuted: false },
    });
    render(<CommentItem item={item} currentUserId="me" />);

    fireEvent.press(screen.getByRole('button', { name: 'コメントのオプションを開く' }));

    await waitFor(() => {
      expect(screen.getByTestId('user-action-menu')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'メニューを閉じる' }));

    await waitFor(() => {
      expect(screen.queryByTestId('user-action-menu')).toBeNull();
    });
  });
});

describe('CommentItem - 返信ボタン', () => {
  it('onReply が渡されているとき返信ボタンが表示される', () => {
    const item = makeCommentItem({
      user: { id: 'other', nickname: '返信先', avatarUrl: null, isBlocked: false, isMuted: false },
    });
    render(<CommentItem item={item} currentUserId="me" onReply={jest.fn()} />);
    expect(screen.getByRole('button', { name: '返信先のコメントに返信する' })).toBeTruthy();
  });

  it('返信ボタンを押すと onReply が parentId と nickname で呼ばれる', () => {
    const mockOnReply = jest.fn();
    const item = makeCommentItem({
      id: 'c-123',
      user: { id: 'other', nickname: '返信先ユーザー', avatarUrl: null, isBlocked: false, isMuted: false },
    });
    render(<CommentItem item={item} currentUserId="me" onReply={mockOnReply} />);

    fireEvent.press(screen.getByRole('button', { name: '返信先ユーザーのコメントに返信する' }));

    expect(mockOnReply).toHaveBeenCalledWith({
      parentId: 'c-123',
      nickname: '返信先ユーザー',
    });
  });

  it('onReply が undefined のとき返信ボタンは表示されない', () => {
    const item = makeCommentItem();
    render(<CommentItem item={item} currentUserId="me" />);
    expect(screen.queryByText('返信する')).toBeNull();
  });

  it('isDeleted=true のとき返信ボタンは表示されない', () => {
    const item = makeCommentItem({ isDeleted: true });
    render(<CommentItem item={item} currentUserId="me" onReply={jest.fn()} />);
    expect(screen.queryByText('返信する')).toBeNull();
  });
});

describe('CommentItem - avatarUrl あり', () => {
  it('avatarUrl がある場合もアバターボタンが表示される', () => {
    const item = makeCommentItem({
      user: {
        id: 'u-1',
        nickname: '松の匠',
        avatarUrl: 'https://cdn.bon-log.com/avatar.jpg',
        isBlocked: false,
        isMuted: false,
      },
    });
    render(<CommentItem item={item} currentUserId={undefined} />);
    expect(screen.getByRole('imagebutton', { name: '松の匠のプロフィールを表示' })).toBeTruthy();
  });
});

describe('CommentItem - 削除中状態', () => {
  it('deletingId が一致する場合はコンテナが表示される（削除中グレーアウト）', () => {
    const item = makeCommentItem({ id: 'deleting-comment' });
    render(
      <CommentItem
        item={item}
        currentUserId="other"
        deletingId="deleting-comment"
      />
    );
    expect(screen.getByTestId('comment-item')).toBeTruthy();
  });
});
