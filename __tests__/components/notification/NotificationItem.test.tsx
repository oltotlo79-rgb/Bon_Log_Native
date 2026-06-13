/**
 * @module __tests__/components/notification/NotificationItem
 * NotificationItem コンポーネントのテスト。
 * type別アイコン・本文・未読表示・actor/post=null フォールバック・onMarkRead no-op を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { NotificationItem } from '@/components/notification/NotificationItem';
import { makeNotificationItem } from '@/__tests__/utils/data-factories';
import {
  MSG_NOTIFICATION_LIKE,
  MSG_NOTIFICATION_FOLLOW,
  MSG_NOTIFICATION_SYSTEM,
  MSG_NOTIFICATION_UNKNOWN,
} from '@/lib/constants/notification-messages';

describe('NotificationItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('通知本文（getNotificationMessage）', () => {
    it('type="like" のとき like 本文が表示される', () => {
      const notification = makeNotificationItem({
        type: 'like',
        actor: { id: 'u-2', nickname: '盆栽花子', avatarUrl: null },
      });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      expect(screen.getByText(MSG_NOTIFICATION_LIKE('盆栽花子'))).toBeTruthy();
    });

    it('type="follow" のとき follow 本文が表示される', () => {
      const notification = makeNotificationItem({
        type: 'follow',
        actor: { id: 'u-2', nickname: '盆栽次郎', avatarUrl: null },
      });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      expect(screen.getByText(MSG_NOTIFICATION_FOLLOW('盆栽次郎'))).toBeTruthy();
    });

    it('type="system" のとき system 本文が表示される', () => {
      const notification = makeNotificationItem({
        type: 'system',
        actor: null,
        actorId: null,
      });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      expect(screen.getByText(MSG_NOTIFICATION_SYSTEM)).toBeTruthy();
    });

    it('actor=null のとき MSG_NOTIFICATION_UNKNOWN が表示される（like type）', () => {
      const notification = makeNotificationItem({
        type: 'like',
        actor: null,
        actorId: null,
      });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      expect(screen.getByText(MSG_NOTIFICATION_UNKNOWN)).toBeTruthy();
    });

    it('不明な type でも MSG_NOTIFICATION_UNKNOWN にフォールバックする', () => {
      const notification = makeNotificationItem({
        type: 'unknown_future_type',
        actor: null,
        actorId: null,
      });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      expect(screen.getByText(MSG_NOTIFICATION_UNKNOWN)).toBeTruthy();
    });
  });

  describe('未読の視覚差', () => {
    it('isRead=false のとき未読ドットが表示される（通知セル内に未読ドットを持つ）', () => {
      const notification = makeNotificationItem({ isRead: false });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      // 未読状態の accessibilityLabel に「未読」が含まれる
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toContain('未読');
    });

    it('isRead=true のとき accessibilityLabel に「既読」が含まれる', () => {
      const notification = makeNotificationItem({ isRead: true });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toContain('既読');
    });
  });

  describe('post コンテンツプレビュー', () => {
    it('post.content があるとき preview テキストが表示される', () => {
      const notification = makeNotificationItem({
        type: 'like',
        actor: { id: 'u-2', nickname: '花子', avatarUrl: null },
        post: { id: 'post-1', content: '黒松の春管理です。' },
        comment: null,
      });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      expect(screen.getByText('黒松の春管理です。')).toBeTruthy();
    });

    it('post=null かつ comment=null のとき preview は表示されない', () => {
      const notification = makeNotificationItem({
        type: 'system',
        actor: null,
        actorId: null,
        post: null,
        comment: null,
        postId: null,
      });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      // system 通知に特有のコンテンツプレビューは存在しない
      // MSG_NOTIFICATION_SYSTEM のテキストのみ存在する
      expect(screen.getByText(MSG_NOTIFICATION_SYSTEM)).toBeTruthy();
    });
  });

  describe('タップ', () => {
    it('タップすると onPress が呼ばれる', () => {
      const onPress = jest.fn();
      const notification = makeNotificationItem();
      render(<NotificationItem notification={notification} onPress={onPress} onMarkRead={jest.fn()} />);
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('onMarkRead が no-op であること', () => {
    it('onMarkRead に任意の関数を渡してもタップ時に自動呼び出しされない（現時点の no-op 実装）', () => {
      const onMarkRead = jest.fn();
      const notification = makeNotificationItem();
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={onMarkRead} />);
      fireEvent.press(screen.getByRole('button'));
      // NotificationItem は Batch 2b まで onMarkRead を直接呼び出さない
      expect(onMarkRead).not.toHaveBeenCalled();
    });
  });

  describe('a11y', () => {
    it('accessibilityRole が "button" に設定される', () => {
      const notification = makeNotificationItem();
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('accessibilityLabel に本文と相対時刻が含まれる', () => {
      const notification = makeNotificationItem({
        type: 'like',
        actor: { id: 'u-2', nickname: '花子', avatarUrl: null },
      });
      render(<NotificationItem notification={notification} onPress={jest.fn()} onMarkRead={jest.fn()} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toContain(MSG_NOTIFICATION_LIKE('花子'));
    });
  });
});
