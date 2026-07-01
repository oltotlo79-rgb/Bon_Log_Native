/**
 * @module __tests__/components/messages/ConversationRow
 * ConversationRow コンポーネントのユニットテスト。
 * モック境界は lib/queries/messages（ネットワークに出ない）。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { makeConversationItem } from '@/__tests__/utils/data-factories';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function renderRow(
  overrides?: Parameters<typeof makeConversationItem>[0],
  onPress?: jest.Mock
) {
  const item = makeConversationItem(overrides);
  const handlePress = onPress ?? jest.fn();
  return {
    ...renderWithProviders(<ConversationRow item={item} onPress={handlePress} />),
    item,
    handlePress,
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('ConversationRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示', () => {
    it('相手のニックネームが表示される', () => {
      renderRow({ otherUser: { id: 'user-2', nickname: '盆栽花子', avatarUrl: null } });
      expect(screen.getByText('盆栽花子')).toBeTruthy();
    });

    it('最後のメッセージプレビューが表示される', () => {
      renderRow({
        lastMessage: {
          id: 'msg-1',
          content: 'こんにちは',
          senderId: 'user-2',
          createdAt: '2025-06-01T10:00:00Z',
        },
      });
      expect(screen.getByText('こんにちは')).toBeTruthy();
    });

    it('lastMessage が null のとき「メッセージなし」が表示される', () => {
      renderRow({ lastMessage: null });
      expect(screen.getByText('メッセージなし')).toBeTruthy();
    });

    it('otherUser が null のとき「削除されたユーザー」が表示される', () => {
      renderRow({ otherUser: null });
      expect(screen.getByText('削除されたユーザー')).toBeTruthy();
    });

    it('時刻ラベルが表示される（「たった今」または相対時刻）', () => {
      const now = new Date().toISOString();
      renderRow({ updatedAt: now });
      expect(screen.getByText('たった今')).toBeTruthy();
    });
  });

  describe('未読バッジ', () => {
    it('hasUnread が true のとき未読バッジが表示される', () => {
      renderRow({ hasUnread: true });
      expect(screen.getByLabelText('未読')).toBeTruthy();
    });

    it('hasUnread が false のとき未読バッジが表示されない', () => {
      renderRow({ hasUnread: false });
      expect(screen.queryByLabelText('未読')).toBeNull();
    });
  });

  describe('タップ操作', () => {
    it('行タップで onPress が conversationId を引数に呼ばれる', () => {
      const handlePress = jest.fn();
      renderRow({ id: 'conv-abc' }, handlePress);
      fireEvent.press(screen.getByRole('button'));
      expect(handlePress).toHaveBeenCalledWith('conv-abc');
    });

    it('onPress は 1 回だけ呼ばれる', () => {
      const handlePress = jest.fn();
      renderRow({}, handlePress);
      fireEvent.press(screen.getByRole('button'));
      expect(handlePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('アクセシビリティ', () => {
    it('未読あり時の accessibilityLabel に「未読あり」が含まれる', () => {
      renderRow({
        hasUnread: true,
        otherUser: { id: 'user-2', nickname: '盆栽花子', avatarUrl: null },
      });
      expect(
        screen.getByLabelText('盆栽花子との会話（未読あり）')
      ).toBeTruthy();
    });

    it('未読なし時の accessibilityLabel に「未読あり」が含まれない', () => {
      renderRow({
        hasUnread: false,
        otherUser: { id: 'user-2', nickname: '盆栽花子', avatarUrl: null },
      });
      expect(screen.getByLabelText('盆栽花子との会話')).toBeTruthy();
    });
  });
});
