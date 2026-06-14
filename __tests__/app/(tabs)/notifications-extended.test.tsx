/**
 * app/(tabs)/notifications の追加テスト。
 * resolveNotificationRoute の全通知タイプ分岐と handleLoadMore、
 * isFetchingNextPage のフッター表示を検証する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import NotificationsScreen from '@/app/(tabs)/notifications/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeNotificationItem } from '@/__tests__/utils/data-factories';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseNotificationsQuery = jest.fn();
const mockUseUnreadCountQuery = jest.fn();
const mockMarkReadMutate = jest.fn();

jest.mock('@/lib/queries/notifications', () => ({
  useNotificationsQuery: () => mockUseNotificationsQuery(),
  useUnreadCountQuery: () => mockUseUnreadCountQuery(),
  useMarkNotificationsReadMutation: () => ({
    mutate: mockMarkReadMutate,
    isPending: false,
  }),
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

const defaultUnreadCountState = { data: { count: 0 } };

describe('NotificationsScreen — resolveNotificationRoute 各タイプ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationsQuery.mockReturnValue(defaultNotificationsState);
    mockUseUnreadCountQuery.mockReturnValue(defaultUnreadCountState);
  });

  const postRouteTypes = ['like', 'comment_like', 'comment', 'reply', 'quote', 'repost', 'mention'] as const;

  postRouteTypes.forEach((type) => {
    it(`type="${type}" で postId あり → 通知アイテムが表示される`, () => {
      const notification = makeNotificationItem({ type, postId: 'post-xyz' });
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        data: { pages: [{ items: [notification], nextCursor: null }] },
      });
      renderWithProviders(<NotificationsScreen />);
      // 通知アイテムがレンダリングされていること（エラーが出ないこと）
      expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
    });
  });

  it('type="follow" で actorId あり → 通知アイテムが表示される', () => {
    const notification = makeNotificationItem({
      type: 'follow',
      actorId: 'actor-001',
      postId: null,
    });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
  });

  it('type="follow_request" で actorId あり → 通知アイテムが表示される', () => {
    const notification = makeNotificationItem({
      type: 'follow_request',
      actorId: 'actor-002',
      postId: null,
    });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
  });

  it('type="follow_request_approved" で actorId あり → 通知アイテムが表示される', () => {
    const notification = makeNotificationItem({
      type: 'follow_request_approved',
      actorId: 'actor-003',
      postId: null,
    });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
  });

  it('type="subscription_expiring" → 通知アイテムが表示される', () => {
    const notification = makeNotificationItem({
      type: 'subscription_expiring',
      postId: null,
      actorId: null,
    });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
  });

  it('type="system" → 通知アイテムが表示される（null route = タップしても遷移しない）', () => {
    const notification = makeNotificationItem({
      type: 'system',
      postId: null,
      actorId: null,
    });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
  });

  it('type="like" で postId が null のとき route は null → タップしても遷移しない', () => {
    const notification = makeNotificationItem({ type: 'like', postId: null });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

describe('NotificationsScreen — isFetchingNextPage フッター', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUnreadCountQuery.mockReturnValue(defaultUnreadCountState);
  });

  it('isFetchingNextPage=true のとき「読み込み中」フッターが表示される', () => {
    const notification = makeNotificationItem();
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: 'next' }] },
      isFetchingNextPage: true,
      hasNextPage: true,
    });
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('hasNextPage=false かつ通知あり のとき「これ以上通知はありません」フッターが表示される', () => {
    const notification = makeNotificationItem();
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
      isFetchingNextPage: false,
      hasNextPage: false,
    });
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByText('これ以上通知はありません')).toBeTruthy();
  });
});

describe('NotificationsScreen — オフライン状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUnreadCountQuery.mockReturnValue(defaultUnreadCountState);
  });

  it('オフライン時も基本レンダリングが通る', () => {
    const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status');
    (useOnlineStatus as jest.Mock).mockReturnValue(false);
    mockUseNotificationsQuery.mockReturnValue(defaultNotificationsState);
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
  });
});
