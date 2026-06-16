/**
 * @module __tests__/lib/queries/moderation
 * lib/queries/moderation のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 *
 * 対象: useBlockUserMutation / useUnblockUserMutation / useMuteUserMutation /
 *       useUnmuteUserMutation / useReportMutation / useBlockedUsersQuery / useMutedUsersQuery
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  useBlockUserMutation,
  useUnblockUserMutation,
  useMuteUserMutation,
  useUnmuteUserMutation,
  useReportMutation,
  useBlockedUsersQuery,
  useMutedUsersQuery,
} from '@/lib/queries/moderation';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientGet = jest.fn();
const mockApiClientPost = jest.fn();
const mockApiClientDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
    POST: (...args: unknown[]) => mockApiClientPost(...args),
    DELETE: (...args: unknown[]) => mockApiClientDelete(...args),
    PATCH: jest.fn(),
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

type UserProfileResponse = components['schemas']['UserProfileResponse'];
type UserMinimalListResponse = components['schemas']['UserMinimalListResponse'];

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

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

function makeUserProfile(overrides?: Partial<UserProfileResponse>): UserProfileResponse {
  return {
    id: 'user-2',
    nickname: '盆栽花子',
    avatarUrl: null,
    headerUrl: null,
    bio: '盆栽愛好家',
    location: null,
    isPublic: true,
    bonsaiStartYear: null,
    bonsaiStartMonth: null,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    postsCount: 10,
    followersCount: 50,
    followingCount: 30,
    following: false,
    requested: false,
    isSelf: false,
    isBlocked: false,
    isMuted: false,
    ...overrides,
  };
}

function makeUserMinimalPage(
  items: UserMinimalListResponse['items'],
  nextCursor: string | null = null
): UserMinimalListResponse {
  return { items, nextCursor };
}

function makeUserMinimalItem(
  overrides?: Partial<UserMinimalListResponse['items'][number]>
): UserMinimalListResponse['items'][number] {
  return {
    id: 'user-2',
    nickname: '盆栽花子',
    avatarUrl: null,
    bio: '盆栽愛好家',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useBlockUserMutation
// ---------------------------------------------------------------------------

describe('useBlockUserMutation', () => {
  it('POST /api/v1/users/{id}/block を正しいパスで呼ぶ', async () => {
    mockApiClientPost.mockResolvedValue({ data: { blocked: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBlockUserMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/users/{id}/block', {
      params: { path: { id: 'user-2' } },
    });
  });

  it('成功時に users.detail の isBlocked=true / following=false / requested=false を即時反映する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { blocked: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(
      queryKeys.users.detail('user-2'),
      makeUserProfile({ following: true, requested: false, isBlocked: false })
    );

    const { result } = renderHook(() => useBlockUserMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => {
      const profile = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail('user-2')
      );
      expect(profile?.isBlocked).toBe(true);
      expect(profile?.following).toBe(false);
      expect(profile?.requested).toBe(false);
    });
  });

  it('onSettled で users.detail / posts.feed / search / notifications / users.blocks を invalidate する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { blocked: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBlockUserMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: queryKeys.users.detail('user-2') }),
        expect.objectContaining({ queryKey: queryKeys.posts.feed() }),
        expect.objectContaining({ queryKey: queryKeys.search.all }),
        expect.objectContaining({ queryKey: queryKeys.notifications.all }),
        expect.objectContaining({ queryKey: queryKeys.users.blocks }),
      ])
    );
  });
});

// ---------------------------------------------------------------------------
// useUnblockUserMutation
// ---------------------------------------------------------------------------

describe('useUnblockUserMutation', () => {
  it('DELETE /api/v1/users/{id}/block を正しいパスで呼ぶ', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { blocked: false }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnblockUserMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/users/{id}/block', {
      params: { path: { id: 'user-2' } },
    });
  });

  it('成功時に users.detail の isBlocked=false を即時反映する', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { blocked: false }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(
      queryKeys.users.detail('user-2'),
      makeUserProfile({ isBlocked: true })
    );

    const { result } = renderHook(() => useUnblockUserMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => {
      const profile = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail('user-2')
      );
      expect(profile?.isBlocked).toBe(false);
    });
  });

  it('onSettled で users.blocks / posts.feed / search を invalidate する', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { blocked: false }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUnblockUserMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: queryKeys.users.blocks }),
        expect.objectContaining({ queryKey: queryKeys.posts.feed() }),
        expect.objectContaining({ queryKey: queryKeys.search.all }),
      ])
    );
  });
});

// ---------------------------------------------------------------------------
// useMuteUserMutation
// ---------------------------------------------------------------------------

describe('useMuteUserMutation', () => {
  it('POST /api/v1/users/{id}/mute を正しいパスで呼ぶ', async () => {
    mockApiClientPost.mockResolvedValue({ data: { muted: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMuteUserMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/users/{id}/mute', {
      params: { path: { id: 'user-2' } },
    });
  });

  it('成功時に users.detail の isMuted=true を即時反映する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { muted: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(
      queryKeys.users.detail('user-2'),
      makeUserProfile({ isMuted: false })
    );

    const { result } = renderHook(() => useMuteUserMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => {
      const profile = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail('user-2')
      );
      expect(profile?.isMuted).toBe(true);
    });
  });

  it('onSettled で posts.feed / notifications / search / users.mutes を invalidate する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { muted: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMuteUserMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: queryKeys.posts.feed() }),
        expect.objectContaining({ queryKey: queryKeys.notifications.all }),
        expect.objectContaining({ queryKey: queryKeys.search.all }),
        expect.objectContaining({ queryKey: queryKeys.users.mutes }),
      ])
    );
  });
});

// ---------------------------------------------------------------------------
// useUnmuteUserMutation
// ---------------------------------------------------------------------------

describe('useUnmuteUserMutation', () => {
  it('DELETE /api/v1/users/{id}/mute を正しいパスで呼ぶ', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { muted: false }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUnmuteUserMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/users/{id}/mute', {
      params: { path: { id: 'user-2' } },
    });
  });

  it('成功時に users.detail の isMuted=false を即時反映する', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { muted: false }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(
      queryKeys.users.detail('user-2'),
      makeUserProfile({ isMuted: true })
    );

    const { result } = renderHook(() => useUnmuteUserMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => {
      const profile = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail('user-2')
      );
      expect(profile?.isMuted).toBe(false);
    });
  });

  it('onSettled で users.mutes / posts.feed / notifications を invalidate する', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { muted: false }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUnmuteUserMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: queryKeys.users.mutes }),
        expect.objectContaining({ queryKey: queryKeys.posts.feed() }),
        expect.objectContaining({ queryKey: queryKeys.notifications.all }),
      ])
    );
  });
});

// ---------------------------------------------------------------------------
// useReportMutation
// ---------------------------------------------------------------------------

describe('useReportMutation', () => {
  it('POST /api/v1/reports を正しい body で呼ぶ', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useReportMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        targetType: 'post',
        targetId: 'post-1',
        reason: 'spam',
        description: 'スパムコンテンツです',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/reports', {
      body: {
        targetType: 'post',
        targetId: 'post-1',
        reason: 'spam',
        description: 'スパムコンテンツです',
      },
    });
  });

  it('description なしでも mutate が動く', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useReportMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        targetType: 'user',
        targetId: 'user-2',
        reason: 'harassment',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/reports', {
      body: {
        targetType: 'user',
        targetId: 'user-2',
        reason: 'harassment',
        description: undefined,
      },
    });
  });

  it('409 CONFLICT で ApiError が throw される', async () => {
    const err = makeApiError('CONFLICT', 409);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useReportMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ targetType: 'post', targetId: 'post-1', reason: 'spam' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('CONFLICT');
    }
  });

  it('404 NOT_FOUND で ApiError が throw される', async () => {
    const err = makeApiError('NOT_FOUND', 404);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useReportMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ targetType: 'comment', targetId: 'c-1', reason: 'inappropriate' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });

  it('429 RATE_LIMITED で ApiError が throw される', async () => {
    const err = makeApiError('RATE_LIMITED', 429);
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useReportMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ targetType: 'post', targetId: 'post-1', reason: 'spam' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
    }
  });
});

// ---------------------------------------------------------------------------
// useBlockedUsersQuery
// ---------------------------------------------------------------------------

describe('useBlockedUsersQuery', () => {
  it('GET /api/v1/users/me/blocks を呼び items を取得する', async () => {
    const page = makeUserMinimalPage([makeUserMinimalItem()]);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBlockedUsersQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/users/me/blocks', expect.any(Object));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
    expect(result.current.data?.pages[0].items[0].id).toBe('user-2');
  });

  it('nextCursor が null のとき hasNextPage=false になる', async () => {
    const page = makeUserMinimalPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBlockedUsersQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor がある場合 hasNextPage=true になる', async () => {
    const page = makeUserMinimalPage([makeUserMinimalItem()], 'cursor-next');
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBlockedUsersQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('エラー時に isError=true になる', async () => {
    const err = makeApiError('AUTH_REQUIRED', 401);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBlockedUsersQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useMutedUsersQuery
// ---------------------------------------------------------------------------

describe('useMutedUsersQuery', () => {
  it('GET /api/v1/users/me/mutes を呼び items を取得する', async () => {
    const page = makeUserMinimalPage([
      makeUserMinimalItem({ id: 'muted-user-1', nickname: 'ミュートユーザー' }),
    ]);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMutedUsersQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/users/me/mutes', expect.any(Object));
    expect(result.current.data?.pages[0].items[0].nickname).toBe('ミュートユーザー');
  });

  it('nextCursor が null のとき hasNextPage=false になる', async () => {
    const page = makeUserMinimalPage([], null);
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMutedUsersQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor がある場合 hasNextPage=true になる', async () => {
    const page = makeUserMinimalPage([makeUserMinimalItem()], 'cursor-abc');
    mockApiClientGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMutedUsersQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('エラー時に isError=true になる', async () => {
    const err = makeApiError('AUTH_REQUIRED', 401);
    mockApiClientGet.mockResolvedValue({ data: undefined, error: err });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMutedUsersQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
