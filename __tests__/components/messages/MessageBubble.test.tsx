/**
 * @module __tests__/components/messages/MessageBubble
 * MessageBubble コンポーネントのユニットテスト。
 * 自分 / 相手の吹き出し表示と長押し削除確認を検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { makeMessageItem } from '@/__tests__/utils/data-factories';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type Props = Parameters<typeof MessageBubble>[0];

function renderBubble(props?: Partial<Props>) {
  const defaultItem = makeMessageItem({ id: 'msg-1', content: 'テストメッセージ' });
  const defaultProps: Props = {
    item: defaultItem,
    isOwn: false,
    ...props,
  };
  return renderWithProviders(<MessageBubble {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('MessageBubble', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('本文と時刻', () => {
    it('メッセージ本文が表示される', () => {
      renderBubble({ item: makeMessageItem({ content: 'こんにちは' }) });
      expect(screen.getByText('こんにちは')).toBeTruthy();
    });

    it('時刻が HH:mm 形式で表示される', () => {
      renderBubble({
        item: makeMessageItem({ createdAt: '2025-06-01T10:30:00Z' }),
      });
      // UTC to local は環境依存だが時刻テキストが存在することを確認する
      expect(screen.getAllByText(/^\d{2}:\d{2}$/).length).toBeGreaterThan(0);
    });
  });

  describe('自分のメッセージ（isOwn: true）', () => {
    it('accessibilityLabel に「自分のメッセージ」が含まれる', () => {
      renderBubble({
        item: makeMessageItem({ content: '送信テスト' }),
        isOwn: true,
      });
      expect(
        screen.getByLabelText(/自分のメッセージ/)
      ).toBeTruthy();
    });

    it('accessibilityHint に「長押しで削除」が含まれる', () => {
      const { getByLabelText } = renderBubble({
        item: makeMessageItem({ content: '送信テスト' }),
        isOwn: true,
        onLongPress: jest.fn(),
      });
      const bubble = getByLabelText(/自分のメッセージ/);
      expect(bubble.props.accessibilityHint).toBe('長押しで削除');
    });

    it('長押しで onLongPress が messageId を引数に呼ばれる', () => {
      const onLongPress = jest.fn();
      renderBubble({
        item: makeMessageItem({ id: 'msg-xyz', content: 'テスト' }),
        isOwn: true,
        onLongPress,
      });
      const bubble = screen.getByLabelText(/自分のメッセージ/);
      fireEvent(bubble, 'longPress');
      expect(onLongPress).toHaveBeenCalledWith('msg-xyz');
    });
  });

  describe('相手のメッセージ（isOwn: false）', () => {
    it('accessibilityLabel に送信者のニックネームが含まれる', () => {
      renderBubble({
        item: makeMessageItem({
          content: '返信です',
          sender: { id: 'user-2', nickname: '盆栽花子', avatarUrl: null },
        }),
        isOwn: false,
      });
      expect(
        screen.getByLabelText(/盆栽花子のメッセージ/)
      ).toBeTruthy();
    });

    it('長押しをしても onLongPress は呼ばれない（相手のメッセージは削除できない）', () => {
      const onLongPress = jest.fn();
      renderBubble({
        item: makeMessageItem({ id: 'msg-1', content: 'テスト' }),
        isOwn: false,
        onLongPress,
      });
      const bubble = screen.getByLabelText(/盆栽太郎のメッセージ/);
      fireEvent(bubble, 'longPress');
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('accessibilityHint が undefined（相手のメッセージには削除ヒントなし）', () => {
      renderBubble({
        item: makeMessageItem({ content: 'テスト' }),
        isOwn: false,
      });
      const bubble = screen.getByLabelText(/盆栽太郎のメッセージ/);
      expect(bubble.props.accessibilityHint).toBeUndefined();
    });
  });
});
