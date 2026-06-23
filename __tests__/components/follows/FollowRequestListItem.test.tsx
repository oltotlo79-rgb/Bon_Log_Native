/**
 * components/follows/FollowRequestListItem のユニットテスト。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FollowRequestListItem } from '@/components/follows/FollowRequestListItem';
import { makeFollowRequestItem } from '@/__tests__/utils/data-factories';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function renderItem(overrides?: {
  onApprove?: jest.Mock;
  onDecline?: jest.Mock;
  onPressUser?: jest.Mock;
  isApproving?: boolean;
  isDeclining?: boolean;
}) {
  const request = makeFollowRequestItem();
  const onApprove = overrides?.onApprove ?? jest.fn();
  const onDecline = overrides?.onDecline ?? jest.fn();
  const onPressUser = overrides?.onPressUser ?? jest.fn();

  render(
    <FollowRequestListItem
      request={request}
      onApprove={onApprove}
      onDecline={onDecline}
      isApproving={overrides?.isApproving ?? false}
      isDeclining={overrides?.isDeclining ?? false}
      onPressUser={onPressUser}
    />
  );

  return { request, onApprove, onDecline, onPressUser };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('FollowRequestListItem', () => {
  describe('表示', () => {
    it('申請者のニックネームが表示される', () => {
      renderItem();
      expect(screen.getByText('申請者')).toBeTruthy();
    });

    it('bio がある場合表示される', () => {
      const request = makeFollowRequestItem({
        requester: {
          id: 'r-1',
          nickname: 'bioユーザー',
          avatarUrl: null,
          bio: '盆栽好き',
        },
      });
      render(
        <FollowRequestListItem
          request={request}
          onApprove={jest.fn()}
          onDecline={jest.fn()}
          isApproving={false}
          isDeclining={false}
          onPressUser={jest.fn()}
        />
      );
      expect(screen.getByText('盆栽好き')).toBeTruthy();
    });

    it('bio が null のとき bio は表示されない', () => {
      const request = makeFollowRequestItem({
        requester: {
          id: 'r-1',
          nickname: 'nobioユーザー',
          avatarUrl: null,
          bio: null,
        },
      });
      render(
        <FollowRequestListItem
          request={request}
          onApprove={jest.fn()}
          onDecline={jest.fn()}
          isApproving={false}
          isDeclining={false}
          onPressUser={jest.fn()}
        />
      );
      expect(screen.queryByText('盆栽好き')).toBeNull();
    });

    it('「承認」ボタンが表示される', () => {
      renderItem();
      expect(screen.getByTestId('follow-request-approve')).toBeTruthy();
    });

    it('「拒否」ボタンが表示される', () => {
      renderItem();
      expect(screen.getByTestId('follow-request-reject')).toBeTruthy();
    });
  });

  describe('承認ボタン操作', () => {
    it('承認ボタン押下で onApprove が requestId を引数に呼ばれる', () => {
      const onApprove = jest.fn();
      renderItem({ onApprove });

      fireEvent.press(screen.getByTestId('follow-request-approve'));

      expect(onApprove).toHaveBeenCalledTimes(1);
      expect(onApprove).toHaveBeenCalledWith('req-1');
    });

    it('isApproving=true のとき承認ボタンが disabled', () => {
      renderItem({ isApproving: true });
      const button = screen.getByTestId('follow-request-approve');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('isDeclining=true のとき承認ボタンも disabled（連打防止）', () => {
      renderItem({ isDeclining: true });
      const button = screen.getByTestId('follow-request-approve');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('拒否ボタン操作', () => {
    it('拒否ボタン押下で onDecline が requestId を引数に呼ばれる', () => {
      const onDecline = jest.fn();
      renderItem({ onDecline });

      fireEvent.press(screen.getByTestId('follow-request-reject'));

      expect(onDecline).toHaveBeenCalledTimes(1);
      expect(onDecline).toHaveBeenCalledWith('req-1');
    });

    it('isDeclining=true のとき拒否ボタンが disabled', () => {
      renderItem({ isDeclining: true });
      const button = screen.getByTestId('follow-request-reject');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('isApproving=true のとき拒否ボタンも disabled（連打防止）', () => {
      renderItem({ isApproving: true });
      const button = screen.getByTestId('follow-request-reject');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('ユーザープロフィール遷移', () => {
    it('行タップで onPressUser が requesterId を引数に呼ばれる', () => {
      const onPressUser = jest.fn();
      renderItem({ onPressUser });

      fireEvent.press(screen.getByRole('button', { name: '申請者 のプロフィールを表示する' }));

      expect(onPressUser).toHaveBeenCalledTimes(1);
      expect(onPressUser).toHaveBeenCalledWith('requester-1');
    });
  });
});
