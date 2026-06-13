/**
 * lib/queries/notifications の useMarkNotificationsReadMutation ユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { useMarkNotificationsReadMutation } from '@/lib/queries/notifications';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientPatch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: jest.fn(),
    DELETE: jest.fn(),
    PATCH: (...args: unknown[]) => mockApiClientPatch(...args),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

// ---------------------------------------------------------------------------
// 型エイリアス
// ---------------------------------------------------------------------------

type NotificationsListResponse = components['schemas']['NotificationsListResponse'];
type UnreadCountResponse = components['schemas']['UnreadCountResponse'];

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

// setQueryData の確認後も invalidateQueries でキャッシュが消えないよう gcTime を Infinity に設定する
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function makeApiError(code: MobileApiErrorCode, status: number): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

function makeNotificationItem(
  id: string,
  isRead: boolean
): NotificationsListResponse['items'][number] {
  return {
    id,
    type: 'like',
    isRead,
    createdAt: '2025-06-01T10:00:00Z',
    actorId: 'user-2',
    postId: 'post-1',
    commentId: null,
    actor: { id: 'user-2', nickname: 'フォロワー', avatarUrl: null },
    post: { id: 'post-1', content: '黒松の記録' },
    comment: null,
  };
}

function makeNotificationsListData(
  items: NotificationsListResponse['items']
): InfiniteData<NotificationsListResponse> {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useMarkNotificationsReadMutation
// ---------------------------------------------------------------------------

describe('useMarkNotificationsReadMutation', () => {
  describe('ids 指定での既読化', () => {
    it('ids を指定したとき PATCH に ids が送られる', async () => {
      mockApiClientPatch.mockResolvedValue({
        data: { success: true, unreadCount: 1 },
        error: undefined,
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ ids: ['notif-1', 'notif-2'] });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientPatch).toHaveBeenCalledWith('/api/v1/notifications/read', {
        body: { ids: ['notif-1', 'notif-2'] },
      });
    });

    it('ids 指定時に通知一覧の該当通知のみ isRead が true になる', async () => {
      mockApiClientPatch.mockResolvedValue({
        data: { success: true, unreadCount: 1 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const listData = makeNotificationsListData([
        makeNotificationItem('notif-1', false),
        makeNotificationItem('notif-2', false),
        makeNotificationItem('notif-3', false),
      ]);
      queryClient.setQueryData(queryKeys.notifications.list(), listData);

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ ids: ['notif-1', 'notif-2'] });
      });

      // setQueryData が onSuccess で書き込まれるタイミングを待つ
      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<NotificationsListResponse>>(
          queryKeys.notifications.list()
        );
        const items = cached?.pages[0].items ?? [];
        expect(items.find((i) => i.id === 'notif-1')?.isRead).toBe(true);
        expect(items.find((i) => i.id === 'notif-2')?.isRead).toBe(true);
        // notif-3 は指定していないため未読のまま
        expect(items.find((i) => i.id === 'notif-3')?.isRead).toBe(false);
      });
    });
  });

  describe('全件既読化（ids 省略・空配列）', () => {
    it('ids を省略したとき PATCH に ids: undefined が送られる', async () => {
      mockApiClientPatch.mockResolvedValue({
        data: { success: true, unreadCount: 0 },
        error: undefined,
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({});
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientPatch).toHaveBeenCalledWith('/api/v1/notifications/read', {
        body: { ids: undefined },
      });
    });

    it('ids 省略時に通知一覧の全通知が isRead:true になる', async () => {
      mockApiClientPatch.mockResolvedValue({
        data: { success: true, unreadCount: 0 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const listData = makeNotificationsListData([
        makeNotificationItem('notif-1', false),
        makeNotificationItem('notif-2', false),
      ]);
      queryClient.setQueryData(queryKeys.notifications.list(), listData);

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({});
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<NotificationsListResponse>>(
          queryKeys.notifications.list()
        );
        const items = cached?.pages[0].items ?? [];
        expect(items.every((i) => i.isRead)).toBe(true);
      });
    });

    it('ids が空配列のとき全通知が既読になる', async () => {
      mockApiClientPatch.mockResolvedValue({
        data: { success: true, unreadCount: 0 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const listData = makeNotificationsListData([
        makeNotificationItem('notif-1', false),
        makeNotificationItem('notif-2', false),
      ]);
      queryClient.setQueryData(queryKeys.notifications.list(), listData);

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ ids: [] });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<NotificationsListResponse>>(
          queryKeys.notifications.list()
        );
        const items = cached?.pages[0].items ?? [];
        expect(items.every((i) => i.isRead)).toBe(true);
      });
    });
  });

  describe('unreadCount の更新', () => {
    it('成功時に unreadCount キャッシュがサーバー返却値で更新される', async () => {
      mockApiClientPatch.mockResolvedValue({
        data: { success: true, unreadCount: 3 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      // 初期値を設定
      queryClient.setQueryData<UnreadCountResponse>(queryKeys.notifications.unreadCount, { count: 10 });

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({});
      });

      // setQueryData が onSuccess で書き込まれるタイミングを待つ
      await waitFor(() => {
        const unreadCount = queryClient.getQueryData<UnreadCountResponse>(
          queryKeys.notifications.unreadCount
        );
        // サーバーの unreadCount(3) が count フィールドに変換されて保存される
        expect(unreadCount?.count).toBe(3);
      });
    });

    it('全件既読後に unreadCount が 0 になる', async () => {
      mockApiClientPatch.mockResolvedValue({
        data: { success: true, unreadCount: 0 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData<UnreadCountResponse>(queryKeys.notifications.unreadCount, { count: 5 });

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({});
      });

      await waitFor(() => {
        const unreadCount = queryClient.getQueryData<UnreadCountResponse>(
          queryKeys.notifications.unreadCount
        );
        expect(unreadCount?.count).toBe(0);
      });
    });
  });

  describe('エラー種別', () => {
    it('403 GUEST_NOT_ALLOWED で ApiError が throw される', async () => {
      const err = makeApiError('GUEST_NOT_ALLOWED', 403);
      mockApiClientPatch.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({});
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect((result.current.error as ApiError).code).toBe('GUEST_NOT_ALLOWED');
    });

    it('400 VALIDATION_ERROR（100件超）で ApiError が throw される', async () => {
      const err = makeApiError('VALIDATION_ERROR', 400);
      mockApiClientPatch.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ ids: Array.from({ length: 101 }, (_, i) => `notif-${i}`) });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect((result.current.error as ApiError).code).toBe('VALIDATION_ERROR');
    });

    it('429 RATE_LIMITED で ApiError が throw される', async () => {
      const err = makeApiError('RATE_LIMITED', 429);
      mockApiClientPatch.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useMarkNotificationsReadMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({});
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect((result.current.error as ApiError).code).toBe('RATE_LIMITED');
    });
  });
});
