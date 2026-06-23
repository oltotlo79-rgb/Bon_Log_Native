/**
 * lib/queries/notifications のユニットテスト。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  resolveNotificationPreference,
} from '@/lib/queries/notifications';
import { UNREAD_COUNT_REFETCH_INTERVAL_MS } from '@/lib/constants/query';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

type NotificationPreferences = components['schemas']['NotificationPreferencesResponse'];

const mockApiClientGet = jest.fn();

const mockApiClientPatch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
    POST: jest.fn(),
    PATCH: (...args: unknown[]) => mockApiClientPatch(...args),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

function createWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function makeApiError(code: MobileApiErrorCode, status: number): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

function makeNotificationsPage(ids: string[], nextCursor: string | null) {
  return {
    items: ids.map((id) => ({
      id,
      type: 'LIKE',
      isRead: false,
      createdAt: '2025-06-01T10:00:00Z',
      actorId: 'user-2',
      postId: 'post-1',
      commentId: null,
      actor: { id: 'user-2', nickname: 'フォロワー', avatarUrl: null },
      post: { id: 'post-1', content: '黒松の記録' },
      comment: null,
    })),
    nextCursor,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useNotificationsQuery
// ---------------------------------------------------------------------------

describe('useNotificationsQuery', () => {
  it('成功で notifications が返る', async () => {
    const page = makeNotificationsPage(['notif-1', 'notif-2'], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
  });

  it('空レスポンスで hasNextPage が false', async () => {
    const page = makeNotificationsPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor が string の場合は hasNextPage が true', async () => {
    const page = makeNotificationsPage(['notif-1'], 'cursor-abc');
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('次ページ取得が実行される', async () => {
    const page1 = makeNotificationsPage(['notif-1'], 'cursor-abc');
    const page2 = makeNotificationsPage(['notif-2'], null);
    mockApiClientGet
      .mockResolvedValueOnce({ data: page1, error: undefined })
      .mockResolvedValueOnce({ data: page2, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.fetchNextPage();
    });

    await waitFor(
      () => {
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.data?.pages).toHaveLength(2);
      },
      { timeout: 5000 }
    );
  });

  it('403 GUEST_NOT_ALLOWED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('GUEST_NOT_ALLOWED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
    }
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useUnreadCountQuery
// ---------------------------------------------------------------------------

describe('useUnreadCountQuery', () => {
  it('成功で未読件数が返る', async () => {
    mockApiClientGet.mockResolvedValue({ data: { count: 5 }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(5);
  });

  it('未読なし（count: 0）', async () => {
    mockApiClientGet.mockResolvedValue({ data: { count: 0 }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(0);
  });

  it('403 GUEST_NOT_ALLOWED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('GUEST_NOT_ALLOWED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
    }
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('refetchInterval が経過すると自動 refetch される（ポーリング動作）', async () => {
    jest.useFakeTimers();
    mockApiClientGet.mockResolvedValue({ data: { count: 3 }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnreadCountQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const callCountAfterMount = mockApiClientGet.mock.calls.length;

    jest.advanceTimersByTime(UNREAD_COUNT_REFETCH_INTERVAL_MS);
    await waitFor(() => expect(mockApiClientGet.mock.calls.length).toBeGreaterThan(callCountAfterMount));

    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// resolveNotificationPreference
// ---------------------------------------------------------------------------

describe('resolveNotificationPreference', () => {
  it('キーが未設定（undefined）のとき true を返す', () => {
    const prefs: NotificationPreferences = {};
    expect(resolveNotificationPreference(prefs, 'like')).toBe(true);
  });

  it('キーが明示的 true のとき true を返す', () => {
    const prefs: NotificationPreferences = { like: true };
    expect(resolveNotificationPreference(prefs, 'like')).toBe(true);
  });

  it('キーが明示的 false のとき false を返す', () => {
    const prefs: NotificationPreferences = { like: false };
    expect(resolveNotificationPreference(prefs, 'like')).toBe(false);
  });

  it('異なるキーが false でも対象キー（未設定）は true', () => {
    const prefs: NotificationPreferences = { comment: false };
    expect(resolveNotificationPreference(prefs, 'like')).toBe(true);
  });

  it('複数キーが混在するとき各キーを正しく解決する', () => {
    const prefs: NotificationPreferences = {
      like: true,
      comment: false,
      follow: undefined,
    };
    expect(resolveNotificationPreference(prefs, 'like')).toBe(true);
    expect(resolveNotificationPreference(prefs, 'comment')).toBe(false);
    expect(resolveNotificationPreference(prefs, 'follow')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useNotificationSettingsQuery
// ---------------------------------------------------------------------------

describe('useNotificationSettingsQuery', () => {
  it('成功で settings が返る', async () => {
    const settings = {
      preferences: { like: true, comment: false, follow: true },
    };
    mockApiClientGet.mockResolvedValue({ data: settings, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationSettingsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.preferences.like).toBe(true);
    expect(result.current.data?.preferences.comment).toBe(false);
  });

  it('403 GUEST_NOT_ALLOWED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('GUEST_NOT_ALLOWED', 403),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationSettingsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('GUEST_NOT_ALLOWED');
    }
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationSettingsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useUpdateNotificationSettingsMutation
// ---------------------------------------------------------------------------

describe('useUpdateNotificationSettingsMutation', () => {
  beforeEach(() => {
    mockApiClientPatch.mockReset();
  });

  it('部分更新成功で isSuccess になる', async () => {
    mockApiClientPatch.mockResolvedValue({ error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateNotificationSettingsMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ like: false } as NotificationPreferences);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPatch).toHaveBeenCalledWith('/api/v1/users/me/notification-settings', {
      body: { like: false },
    });
  });

  it('成功で notifications.settings が invalidate される', async () => {
    mockApiClientPatch.mockResolvedValue({ error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateNotificationSettingsMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ comment: true } as NotificationPreferences);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.settings });
  });

  it('400 VALIDATION_ERROR で ApiError が throw される', async () => {
    mockApiClientPatch.mockResolvedValue({
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateNotificationSettingsMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ like: true } as NotificationPreferences);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('429 RATE_LIMITED で ApiError が throw される', async () => {
    mockApiClientPatch.mockResolvedValue({
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateNotificationSettingsMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ follow: false } as NotificationPreferences);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
    }
  });
});
