/**
 * @module __tests__/app/(tabs)/notifications-tap-routing
 * 通知アイテムをタップしたとき router.push が期待ルートで呼ばれることを検証する。
 * resolveNotificationRoute の全分岐（post系・user系・subscription_expiring・無遷移）を網羅し、
 * 将来の遷移先変更が回帰テストで検出できるようにする。
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import NotificationsScreen from '@/app/(tabs)/notifications/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeNotificationItem } from '@/__tests__/utils/data-factories';
import { routes } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseNotificationsQuery = jest.fn();
const mockUseUnreadCountQuery = jest.fn();

jest.mock('@/lib/queries/notifications', () => ({
  useNotificationsQuery: () => mockUseNotificationsQuery(),
  useUnreadCountQuery: () => mockUseUnreadCountQuery(),
}));

const defaultNotificationsState = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

function renderWithSingleNotification(notification: ReturnType<typeof makeNotificationItem>) {
  mockUseNotificationsQuery.mockReturnValue({
    ...defaultNotificationsState,
    data: { pages: [{ items: [notification], nextCursor: null }] },
  });
  mockUseUnreadCountQuery.mockReturnValue({ data: { count: 0 } });
  renderWithProviders(<NotificationsScreen />);
}

describe('通知タップ → router.push 遷移先の検証', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // post 系: postId あり → routes.postDetail(postId)
  // -----------------------------------------------------------------------

  const postRouteTypes = [
    'like',
    'comment_like',
    'comment',
    'reply',
    'quote',
    'repost',
    'mention',
  ] as const;

  postRouteTypes.forEach((type) => {
    it(`type="${type}" で postId="post-abc" のとき → routes.postDetail("post-abc") で push する`, () => {
      const notification = makeNotificationItem({
        type,
        postId: 'post-abc',
        actorId: 'actor-1',
        actor: { id: 'actor-1', nickname: 'テストユーザー', avatarUrl: null },
      });
      renderWithSingleNotification(notification);

      fireEvent.press(screen.getByRole('button'));

      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith(routes.postDetail('post-abc'));
    });
  });

  // -----------------------------------------------------------------------
  // post 系: postId=null → push されない（null route = 無遷移）
  // -----------------------------------------------------------------------

  postRouteTypes.forEach((type) => {
    it(`type="${type}" で postId=null のとき → router.push が呼ばれない`, () => {
      const notification = makeNotificationItem({
        type,
        postId: null,
        post: null,
        actorId: 'actor-1',
        actor: { id: 'actor-1', nickname: 'テストユーザー', avatarUrl: null },
      });
      renderWithSingleNotification(notification);

      fireEvent.press(screen.getByRole('button'));

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // user 系: actorId あり → routes.userDetail(actorId)
  // -----------------------------------------------------------------------

  it('type="follow" で actorId="actor-xyz" のとき → routes.userDetail("actor-xyz") で push する', () => {
    const notification = makeNotificationItem({
      type: 'follow',
      actorId: 'actor-xyz',
      postId: null,
      post: null,
      actor: { id: 'actor-xyz', nickname: 'フォロワー', avatarUrl: null },
    });
    renderWithSingleNotification(notification);

    fireEvent.press(screen.getByRole('button'));

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith(routes.userDetail('actor-xyz'));
  });

  it('type="follow_request" で actorId="actor-req" のとき → routes.userDetail("actor-req") で push する', () => {
    const notification = makeNotificationItem({
      type: 'follow_request',
      actorId: 'actor-req',
      postId: null,
      post: null,
      actor: { id: 'actor-req', nickname: 'リクエスト送信者', avatarUrl: null },
    });
    renderWithSingleNotification(notification);

    fireEvent.press(screen.getByRole('button'));

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith(routes.userDetail('actor-req'));
  });

  it('type="follow_request_approved" で actorId="actor-approved" のとき → routes.userDetail("actor-approved") で push する', () => {
    const notification = makeNotificationItem({
      type: 'follow_request_approved',
      actorId: 'actor-approved',
      postId: null,
      post: null,
      actor: { id: 'actor-approved', nickname: '承認者', avatarUrl: null },
    });
    renderWithSingleNotification(notification);

    fireEvent.press(screen.getByRole('button'));

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith(routes.userDetail('actor-approved'));
  });

  // user 系: actorId=null → push されない
  it('type="follow" で actorId=null のとき → router.push が呼ばれない', () => {
    const notification = makeNotificationItem({
      type: 'follow',
      actorId: null,
      postId: null,
      post: null,
      actor: null,
    });
    renderWithSingleNotification(notification);

    fireEvent.press(screen.getByRole('button'));

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // subscription_expiring → routes.settingsSubscription（固定パス）
  // -----------------------------------------------------------------------

  it('type="subscription_expiring" のとき → routes.settingsSubscription で push する', () => {
    const notification = makeNotificationItem({
      type: 'subscription_expiring',
      postId: null,
      post: null,
      actorId: null,
      actor: null,
    });
    renderWithSingleNotification(notification);

    fireEvent.press(screen.getByRole('button'));

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith(routes.settingsSubscription);
  });

  // settingsSubscription が正しい定数値を持つことを定数参照で保証（文字列ハードコード回避）
  it('routes.settingsSubscription が "/settings/subscription" を返す', () => {
    expect(routes.settingsSubscription).toBe('/settings/subscription');
  });

  // -----------------------------------------------------------------------
  // 無遷移型: message / system → push されない
  // -----------------------------------------------------------------------

  it('type="message" のとき → router.push が呼ばれない', () => {
    const notification = makeNotificationItem({
      type: 'message',
      postId: null,
      post: null,
      actorId: 'actor-msg',
      actor: { id: 'actor-msg', nickname: 'メッセージ送信者', avatarUrl: null },
    });
    renderWithSingleNotification(notification);

    fireEvent.press(screen.getByRole('button'));

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('type="system" のとき → router.push が呼ばれない', () => {
    const notification = makeNotificationItem({
      type: 'system',
      postId: null,
      post: null,
      actorId: null,
      actor: null,
    });
    renderWithSingleNotification(notification);

    fireEvent.press(screen.getByRole('button'));

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 期待ルートの構造検証（routes ヘルパーが正しいパスを生成すること）
  // -----------------------------------------------------------------------

  it('routes.postDetail("post-123") が "/posts/post-123" を返す', () => {
    expect(routes.postDetail('post-123')).toBe('/posts/post-123');
  });

  it('routes.userDetail("user-456") が "/users/user-456" を返す', () => {
    expect(routes.userDetail('user-456')).toBe('/users/user-456');
  });
});
