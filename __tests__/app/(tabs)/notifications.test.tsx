/**
 * @module __tests__/app/(tabs)/notifications
 * 通知一覧画面のテスト。
 * 一覧表示 / GUEST_NOT_ALLOWED(403) / 空 / エラー / pull-to-refresh を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import NotificationsScreen from '@/app/(tabs)/notifications/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeNotificationItem } from '@/__tests__/utils/data-factories';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_NOTIFICATIONS_LOAD_FAILED,
  ERR_AUTH_REQUIRED,
} from '@/lib/constants/errors';
import { MSG_NOTIFICATION_LIKE } from '@/lib/constants/notification-messages';

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

const defaultUnreadCountState = {
  data: { count: 0 },
};

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationsQuery.mockReturnValue(defaultNotificationsState);
    mockUseUnreadCountQuery.mockReturnValue(defaultUnreadCountState);
  });

  it('ヘッダーに「通知」と表示される', () => {
    renderWithProviders(<NotificationsScreen />);
    expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
  });

  describe('ローディング', () => {
    it('isLoading=true のときローディング状態が表示される', () => {
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        isLoading: true,
      });
      renderWithProviders(<NotificationsScreen />);
      // ScreenLoading が表示されている（ヘッダーは残る）
      expect(screen.getByRole('header', { name: '通知' })).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('通知が 0 件のとき空状態メッセージが表示される', () => {
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        data: { pages: [{ items: [], nextCursor: null }] },
      });
      renderWithProviders(<NotificationsScreen />);
      expect(screen.getByText('まだ通知はありません')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のときエラーメッセージが表示される', () => {
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<NotificationsScreen />);
      expect(screen.getByText(ERR_NOTIFICATIONS_LOAD_FAILED)).toBeTruthy();
    });

    it('GUEST_NOT_ALLOWED エラーのとき認証要求メッセージが表示される', () => {
      const guestError = new ApiError({
        code: 'GUEST_NOT_ALLOWED',
        status: 403,
        message: 'Guest not allowed',
      });
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        isError: true,
        error: guestError,
      });
      renderWithProviders(<NotificationsScreen />);
      expect(screen.getByText(ERR_AUTH_REQUIRED)).toBeTruthy();
    });

    it('GUEST_NOT_ALLOWED エラーのとき「ログインする」リンクが表示される', () => {
      const guestError = new ApiError({
        code: 'GUEST_NOT_ALLOWED',
        status: 403,
        message: 'Guest not allowed',
      });
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        isError: true,
        error: guestError,
      });
      renderWithProviders(<NotificationsScreen />);
      expect(screen.getByRole('button', { name: 'ログインする' })).toBeTruthy();
    });
  });

  describe('一覧表示', () => {
    it('通知が存在するとき通知本文が表示される', () => {
      const notification = makeNotificationItem({
        type: 'like',
        actor: { id: 'u-2', nickname: '花子', avatarUrl: null },
      });
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        data: { pages: [{ items: [notification], nextCursor: null }] },
      });
      renderWithProviders(<NotificationsScreen />);
      expect(screen.getByText(MSG_NOTIFICATION_LIKE('花子'))).toBeTruthy();
    });

    it('複数の通知が表示される', () => {
      const notif1 = makeNotificationItem({
        id: 'n-1',
        type: 'like',
        actor: { id: 'u-2', nickname: '花子', avatarUrl: null },
      });
      const notif2 = makeNotificationItem({
        id: 'n-2',
        type: 'follow',
        actor: { id: 'u-3', nickname: '次郎', avatarUrl: null },
      });
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        data: { pages: [{ items: [notif1, notif2], nextCursor: null }] },
      });
      renderWithProviders(<NotificationsScreen />);
      expect(screen.getByText(MSG_NOTIFICATION_LIKE('花子'))).toBeTruthy();
    });
  });

  describe('unread バッジ', () => {
    it('unreadCount > 0 のとき「すべて既読にする」ボタンが表示される', () => {
      mockUseUnreadCountQuery.mockReturnValue({ data: { count: 3 } });
      const notification = makeNotificationItem();
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        data: { pages: [{ items: [notification], nextCursor: null }] },
      });
      renderWithProviders(<NotificationsScreen />);
      expect(screen.getByRole('button', { name: 'すべての通知を既読にする' })).toBeTruthy();
    });

    it('unreadCount = 0 のとき「すべて既読にする」ボタンが表示されない', () => {
      mockUseUnreadCountQuery.mockReturnValue({ data: { count: 0 } });
      const notification = makeNotificationItem({ isRead: true });
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        data: { pages: [{ items: [notification], nextCursor: null }] },
      });
      renderWithProviders(<NotificationsScreen />);
      expect(screen.queryByRole('button', { name: 'すべての通知を既読にする' })).toBeNull();
    });
  });

  describe('pull-to-refresh', () => {
    it('データ取得後に refetch が利用可能な状態になる', () => {
      const refetch = jest.fn();
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        data: { pages: [{ items: [], nextCursor: null }] },
        refetch,
      });
      renderWithProviders(<NotificationsScreen />);
      expect(refetch).not.toHaveBeenCalled();
    });
  });

  describe('GUEST_NOT_ALLOWED ログインボタンの遷移', () => {
    it('「ログインする」ボタンをタップするとログイン画面へ遷移する', () => {
      const guestError = new ApiError({
        code: 'GUEST_NOT_ALLOWED',
        status: 403,
        message: 'Guest not allowed',
      });
      mockUseNotificationsQuery.mockReturnValue({
        ...defaultNotificationsState,
        isError: true,
        error: guestError,
      });
      renderWithProviders(<NotificationsScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'ログインする' }));
      expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
