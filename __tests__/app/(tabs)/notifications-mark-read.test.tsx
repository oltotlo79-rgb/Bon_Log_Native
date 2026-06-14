/**
 * @module __tests__/app/(tabs)/notifications-mark-read
 * 通知既読化ロジックのテスト（notifications-screen.md §8 対応）。
 * - 自動全件既読化（マウント時）
 * - 「すべて既読にする」ボタン
 * - 失敗時のトースト表示制御
 * - 通知タップ時に既読化 API が呼ばれないこと
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import NotificationsScreen from '@/app/(tabs)/notifications/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeNotificationItem } from '@/__tests__/utils/data-factories';
import { ERR_NOTIFICATION_READ_FAILED } from '@/lib/constants/errors';

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseNotificationsQuery = jest.fn();
const mockUseUnreadCountQuery = jest.fn();
const mockMarkReadMutate = jest.fn();
let mockIsPending = false;

jest.mock('@/lib/queries/notifications', () => ({
  useNotificationsQuery: () => mockUseNotificationsQuery(),
  useUnreadCountQuery: () => mockUseUnreadCountQuery(),
  useMarkNotificationsReadMutation: () => ({
    mutate: mockMarkReadMutate,
    isPending: mockIsPending,
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

describe('NotificationsScreen — 自動全件既読化（マウント時）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  it('unreadCount > 0 かつデータあり のとき、マウント後に mutate({}) が 1 回だけ呼ばれる', async () => {
    const notification = makeNotificationItem({ isRead: false });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 3 } });

    renderWithProviders(<NotificationsScreen />);

    await waitFor(() => {
      expect(mockMarkReadMutate).toHaveBeenCalledTimes(1);
      expect(mockMarkReadMutate).toHaveBeenCalledWith({});
    });
  });

  it('unreadCount = 0 のとき、マウント後に mutate は呼ばれない', async () => {
    const notification = makeNotificationItem({ isRead: true });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 0 } });

    renderWithProviders(<NotificationsScreen />);

    // 非同期処理の完了を待機してから呼ばれていないことを確認する
    await waitFor(() => {
      expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
    });
    expect(mockMarkReadMutate).not.toHaveBeenCalled();
  });

  it('data が undefined（ローディング中）のとき、mutate は呼ばれない', async () => {
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: undefined,
      isLoading: true,
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 5 } });

    renderWithProviders(<NotificationsScreen />);

    await waitFor(() => {
      expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
    });
    expect(mockMarkReadMutate).not.toHaveBeenCalled();
  });

  it('自動既読化は一度だけ実行される（多重発火しない）', async () => {
    const notification = makeNotificationItem({ isRead: false });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 2 } });

    renderWithProviders(<NotificationsScreen />);

    await waitFor(() => {
      expect(mockMarkReadMutate).toHaveBeenCalledTimes(1);
    });

    // さらに待機しても 1 回のまま（useRef フラグで多重発火を防ぐ）
    await new Promise((r) => setTimeout(r, 50));
    expect(mockMarkReadMutate).toHaveBeenCalledTimes(1);
  });

  it('自動既読化の失敗時にトーストは表示されない（サイレント）', async () => {
    const notification = makeNotificationItem({ isRead: false });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 1 } });

    // 自動既読化は onError コールバックなしで呼ばれるため、
    // エラーが発生しても ERR_NOTIFICATION_READ_FAILED トーストは出ない
    mockMarkReadMutate.mockImplementation(() => {
      // 何もしない（エラーを発生させても onError は画面側で設定されていない）
    });

    renderWithProviders(<NotificationsScreen />);

    await waitFor(() => {
      expect(mockMarkReadMutate).toHaveBeenCalledTimes(1);
    });

    // ERR_NOTIFICATION_READ_FAILED トーストが表示されていないことを確認
    expect(screen.queryByText(ERR_NOTIFICATION_READ_FAILED)).toBeNull();
  });
});

describe('NotificationsScreen — 「すべて既読にする」ボタン', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  it('unreadCount > 0 のときボタンが表示される', () => {
    const notification = makeNotificationItem({ isRead: false });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 5 } });

    renderWithProviders(<NotificationsScreen />);

    expect(screen.getByRole('button', { name: 'すべての通知を既読にする' })).toBeTruthy();
  });

  it('unreadCount = 0 のときボタンが表示されない', () => {
    const notification = makeNotificationItem({ isRead: true });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 0 } });

    renderWithProviders(<NotificationsScreen />);

    expect(screen.queryByRole('button', { name: 'すべての通知を既読にする' })).toBeNull();
  });

  it('「すべて既読にする」ボタンをタップすると mutate が onError コールバック付きで呼ばれる', () => {
    const notification = makeNotificationItem({ isRead: false });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 3 } });

    renderWithProviders(<NotificationsScreen />);

    // 自動既読化の呼び出しをクリア
    mockMarkReadMutate.mockClear();

    fireEvent.press(screen.getByRole('button', { name: 'すべての通知を既読にする' }));

    expect(mockMarkReadMutate).toHaveBeenCalledTimes(1);
    // ボタン押下時は onError コールバックを伴う呼び出しになる
    expect(mockMarkReadMutate).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it('isPending=true のときボタンが disabled になる', () => {
    mockIsPending = true;

    const notification = makeNotificationItem({ isRead: false });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 2 } });

    renderWithProviders(<NotificationsScreen />);

    const button = screen.getByRole('button', { name: 'すべての通知を既読にする' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('ボタン押下の失敗時に ERR_NOTIFICATION_READ_FAILED トーストが表示される', async () => {
    const notification = makeNotificationItem({ isRead: false });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 1 } });

    // mutate が呼ばれたとき、ボタン押下のコールバック（onError）を即座に実行するモック
    mockMarkReadMutate.mockImplementation(
      (_params: unknown, callbacks?: { onError?: () => void }) => {
        if (callbacks?.onError) {
          callbacks.onError();
        }
      }
    );

    renderWithProviders(<NotificationsScreen />);

    // 自動既読化の呼び出しをクリアしてからボタンを押す
    mockMarkReadMutate.mockClear();
    mockMarkReadMutate.mockImplementation(
      (_params: unknown, callbacks?: { onError?: () => void }) => {
        if (callbacks?.onError) {
          callbacks.onError();
        }
      }
    );

    fireEvent.press(screen.getByRole('button', { name: 'すべての通知を既読にする' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_NOTIFICATION_READ_FAILED)).toBeTruthy();
    });
  });
});

describe('NotificationsScreen — 通知タップ時に既読化 API が呼ばれないこと', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  it('unreadCount=0 のとき通知アイテムをタップしても markRead.mutate は呼ばれない', () => {
    const notification = makeNotificationItem({
      type: 'like',
      postId: 'post-1',
      isRead: false,
    });
    mockUseNotificationsQuery.mockReturnValue({
      ...defaultNotificationsState,
      data: { pages: [{ items: [notification], nextCursor: null }] },
    });
    // unreadCount=0 にして自動既読化を無効化する
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 0 } });

    renderWithProviders(<NotificationsScreen />);

    // 自動既読化が呼ばれていないことを確認
    expect(mockMarkReadMutate).not.toHaveBeenCalled();

    // 通知タップ（遷移のみ）
    fireEvent.press(screen.getByRole('button'));

    // タップ後も既読化 mutate は呼ばれていない
    expect(mockMarkReadMutate).not.toHaveBeenCalled();
  });
});
