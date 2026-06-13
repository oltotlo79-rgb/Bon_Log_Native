/**
 * lib/queries/follows のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { useToggleFollowMutation, useFollowStateQuery } from '@/lib/queries/follows';
import type { FollowState } from '@/lib/queries/follows';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientPost = jest.fn();
const mockApiClientDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
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

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

// invalidateQueries 後もキャッシュが残るよう gcTime を Infinity に設定する
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
// useToggleFollowMutation
// ---------------------------------------------------------------------------

describe('useToggleFollowMutation', () => {
  describe('POST/DELETE 出し分け', () => {
    it('isActive=false（未フォロー）のとき POST を呼ぶ', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: true, requested: false, followerCount: 51 },
        error: undefined,
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/users/{id}/follow', {
        params: { path: { id: 'user-2' } },
      });
      expect(mockApiClientDelete).not.toHaveBeenCalled();
    });

    it('isActive=true（フォロー済み/リクエスト中）のとき DELETE を呼ぶ', async () => {
      mockApiClientDelete.mockResolvedValue({
        data: { following: false, requested: false, followerCount: 49 },
        error: undefined,
      });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/users/{id}/follow', {
        params: { path: { id: 'user-2' } },
      });
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });

  describe('公開/非公開アカウントの応答反映', () => {
    it('公開アカウントへのフォローで following:true, requested:false が followState に保存される', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: true, requested: false, followerCount: 51 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false });
      });

      // setQueryData が onSuccess で書き込まれるタイミングを待つ
      await waitFor(() => {
        const state = queryClient.getQueryData<FollowState>(queryKeys.users.followState('user-2'));
        expect(state).toEqual({ following: true, requested: false });
      });
    });

    it('非公開アカウントへのフォローで following:false, requested:true が followState に保存される', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: false, requested: true, followerCount: 50 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false });
      });

      await waitFor(() => {
        const state = queryClient.getQueryData<FollowState>(queryKeys.users.followState('user-2'));
        expect(state).toEqual({ following: false, requested: true });
      });
    });

    it('フォロー解除後に following:false, requested:false が followState に保存される', async () => {
      mockApiClientDelete.mockResolvedValue({
        data: { following: false, requested: false, followerCount: 49 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: true });
      });

      await waitFor(() => {
        const state = queryClient.getQueryData<FollowState>(queryKeys.users.followState('user-2'));
        expect(state).toEqual({ following: false, requested: false });
      });
    });
  });

  describe('楽観更新（followersCount のみ）', () => {
    it('onMutate でプロフィールの followersCount が +1 される（フォロー時）', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: true, requested: false, followerCount: 51 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.users.detail('user-2'), makeUserProfile({ followersCount: 50 }));

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false });
      });

      await waitFor(() => {
        const profile = queryClient.getQueryData<UserProfileResponse>(queryKeys.users.detail('user-2'));
        expect(profile?.followersCount).toBe(51);
      });
    });

    it('onMutate でプロフィールの followersCount が -1 される（解除時）', async () => {
      mockApiClientDelete.mockResolvedValue({
        data: { following: false, requested: false, followerCount: 49 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.users.detail('user-2'), makeUserProfile({ followersCount: 50 }));

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: true });
      });

      await waitFor(() => {
        const profile = queryClient.getQueryData<UserProfileResponse>(queryKeys.users.detail('user-2'));
        expect(profile?.followersCount).toBe(49);
      });
    });
  });

  describe('onError ロールバック', () => {
    it('エラー時にプロフィールの followersCount が元に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.users.detail('user-2'), makeUserProfile({ followersCount: 50 }));

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      const profile = queryClient.getQueryData<UserProfileResponse>(queryKeys.users.detail('user-2'));
      expect(profile?.followersCount).toBe(50);
    });
  });

  describe('onSuccess での確定値反映', () => {
    it('成功時にプロフィールの followersCount がサーバー確定値に更新される', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: true, requested: false, followerCount: 55 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(queryKeys.users.detail('user-2'), makeUserProfile({ followersCount: 50 }));

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false });
      });

      // setQueryData が onSuccess で書き込まれるタイミングを待つ（invalidate より先）
      await waitFor(() => {
        const profile = queryClient.getQueryData<UserProfileResponse>(queryKeys.users.detail('user-2'));
        expect(profile?.followersCount).toBe(55);
      });
    });
  });

  describe('エラー種別', () => {
    it('自己フォロー 400 VALIDATION_ERROR で ApiError が throw される', async () => {
      const err = makeApiError('VALIDATION_ERROR', 400);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'self-user', isActive: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect((result.current.error as ApiError).code).toBe('VALIDATION_ERROR');
    });

    it('ブロック・不存在 404 NOT_FOUND で ApiError が throw される', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect((result.current.error as ApiError).code).toBe('NOT_FOUND');
    });

    it('429 RATE_LIMITED で ApiError が throw される', async () => {
      const err = makeApiError('RATE_LIMITED', 429);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect((result.current.error as ApiError).code).toBe('RATE_LIMITED');
    });
  });
});

// ---------------------------------------------------------------------------
// useFollowStateQuery
// ---------------------------------------------------------------------------

describe('useFollowStateQuery', () => {
  it('初期状態で data が null（queryFn が null を返す）', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFollowStateQuery('user-2'), { wrapper: Wrapper });

    // queryFn が null を返すため data は null になる
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('userId が空文字のとき enabled=false でフェッチしない', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useFollowStateQuery(''), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
