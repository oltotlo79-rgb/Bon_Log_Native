/**
 * lib/queries/follows のユニットテスト。
 * lib/api/client を mock 境界とし、ネットワークに出ない（testing.md 規約）。
 *
 * v1.4.0 以降: フォロー状態は users.detail と search.users キャッシュに直接保持する。
 * useFollowStateQuery / FollowState / queryKeys.users.followState は存在しない。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { useToggleFollowMutation } from '@/lib/queries/follows';
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
type SearchUsersResponse = components['schemas']['SearchUsersResponse'];

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
    following: false,
    requested: false,
    isSelf: false,
    ...overrides,
  };
}

function makeSearchUsersPage(
  items: SearchUsersResponse['items']
): SearchUsersResponse {
  return { items, nextCursor: null };
}

function makeSearchUserItem(
  overrides?: Partial<SearchUsersResponse['items'][number]>
): SearchUsersResponse['items'][number] {
  return {
    id: 'user-2',
    nickname: '盆栽花子',
    avatarUrl: null,
    bio: null,
    followersCount: 50,
    followingCount: 30,
    following: false,
    requested: false,
    isPublic: true,
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
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
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
        result.current.mutate({ userId: 'user-2', isActive: true, isPublic: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/users/{id}/follow', {
        params: { path: { id: 'user-2' } },
      });
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });

  describe('楽観更新 — users.detail キャッシュ', () => {
    it('公開アカウントへのフォロー: following:true/followersCount+1 が楽観更新される', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: true, requested: false, followerCount: 51 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(
        queryKeys.users.detail('user-2'),
        makeUserProfile({ followersCount: 50, following: false, requested: false })
      );

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
      });

      await waitFor(() => {
        const profile = queryClient.getQueryData<UserProfileResponse>(
          queryKeys.users.detail('user-2')
        );
        expect(profile?.following).toBe(true);
        expect(profile?.requested).toBe(false);
        expect(profile?.followersCount).toBe(51);
      });
    });

    it('非公開アカウントへのフォロー: requested:true/followersCount据え置きが楽観更新される', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: false, requested: true, followerCount: 50 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(
        queryKeys.users.detail('user-2'),
        makeUserProfile({ followersCount: 50, following: false, requested: false, isPublic: false })
      );

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: false });
      });

      await waitFor(() => {
        const profile = queryClient.getQueryData<UserProfileResponse>(
          queryKeys.users.detail('user-2')
        );
        expect(profile?.following).toBe(false);
        expect(profile?.requested).toBe(true);
        expect(profile?.followersCount).toBe(50);
      });
    });

    it('フォロー解除: following:false/followersCount-1 が楽観更新される', async () => {
      mockApiClientDelete.mockResolvedValue({
        data: { following: false, requested: false, followerCount: 49 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(
        queryKeys.users.detail('user-2'),
        makeUserProfile({ followersCount: 50, following: true, requested: false })
      );

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: true, isPublic: true });
      });

      await waitFor(() => {
        const profile = queryClient.getQueryData<UserProfileResponse>(
          queryKeys.users.detail('user-2')
        );
        expect(profile?.following).toBe(false);
        expect(profile?.requested).toBe(false);
        expect(profile?.followersCount).toBe(49);
      });
    });

    it('リクエスト取消: requested:false/followersCount据え置きが楽観更新される', async () => {
      mockApiClientDelete.mockResolvedValue({
        data: { following: false, requested: false, followerCount: 50 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(
        queryKeys.users.detail('user-2'),
        makeUserProfile({ followersCount: 50, following: false, requested: true })
      );

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: true, isPublic: false });
      });

      await waitFor(() => {
        const profile = queryClient.getQueryData<UserProfileResponse>(
          queryKeys.users.detail('user-2')
        );
        expect(profile?.following).toBe(false);
        expect(profile?.requested).toBe(false);
        expect(profile?.followersCount).toBe(50);
      });
    });
  });

  describe('楽観更新 — 検索キャッシュ', () => {
    it('公開アカウントへのフォロー: 検索キャッシュの該当 item の following が true になる', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: true, requested: false, followerCount: 51 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const searchKey = queryKeys.search.users('黒松');
      const initialData = {
        pages: [makeSearchUsersPage([makeSearchUserItem()])],
        pageParams: [undefined],
      };
      queryClient.setQueryData(searchKey, initialData);

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<typeof initialData>(searchKey);
        const item = cached?.pages[0]?.items[0];
        expect(item?.following).toBe(true);
        expect(item?.requested).toBe(false);
      });
    });

    it('フォロー解除: 検索キャッシュの該当 item の following が false になる', async () => {
      mockApiClientDelete.mockResolvedValue({
        data: { following: false, requested: false, followerCount: 49 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const searchKey = queryKeys.search.users('黒松');
      const initialData = {
        pages: [makeSearchUsersPage([makeSearchUserItem({ following: true })])],
        pageParams: [undefined],
      };
      queryClient.setQueryData(searchKey, initialData);

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: true, isPublic: true });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<typeof initialData>(searchKey);
        const item = cached?.pages[0]?.items[0];
        expect(item?.following).toBe(false);
        expect(item?.requested).toBe(false);
      });
    });
  });

  describe('onError ロールバック', () => {
    it('エラー時にプロフィールの followersCount が元に戻る', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(
        queryKeys.users.detail('user-2'),
        makeUserProfile({ followersCount: 50, following: false, requested: false })
      );

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      const profile = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail('user-2')
      );
      expect(profile?.followersCount).toBe(50);
      expect(profile?.following).toBe(false);
    });

    it('エラー時に検索キャッシュがロールバックされる', async () => {
      const err = makeApiError('RATE_LIMITED', 429);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper, queryClient } = createWrapper();

      const searchKey = queryKeys.search.users('黒松');
      const initialData = {
        pages: [makeSearchUsersPage([makeSearchUserItem({ following: false })])],
        pageParams: [undefined],
      };
      queryClient.setQueryData(searchKey, initialData);

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      const cached = queryClient.getQueryData<typeof initialData>(searchKey);
      expect(cached?.pages[0]?.items[0]?.following).toBe(false);
    });
  });

  describe('onSuccess での確定値反映', () => {
    it('成功時にプロフィールの followersCount がサーバー確定値に更新される', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: true, requested: false, followerCount: 55 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      queryClient.setQueryData(
        queryKeys.users.detail('user-2'),
        makeUserProfile({ followersCount: 50, following: false, requested: false })
      );

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
      });

      await waitFor(() => {
        const profile = queryClient.getQueryData<UserProfileResponse>(
          queryKeys.users.detail('user-2')
        );
        expect(profile?.followersCount).toBe(55);
        expect(profile?.following).toBe(true);
        expect(profile?.requested).toBe(false);
      });
    });

    it('成功時に検索キャッシュも FollowResponse の確定値で上書きされる', async () => {
      mockApiClientPost.mockResolvedValue({
        data: { following: true, requested: false, followerCount: 51 },
        error: undefined,
      });
      const { Wrapper, queryClient } = createWrapper();

      const searchKey = queryKeys.search.users('黒松');
      const initialData = {
        pages: [makeSearchUsersPage([makeSearchUserItem({ following: false })])],
        pageParams: [undefined],
      };
      queryClient.setQueryData(searchKey, initialData);

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      act(() => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
      });

      await waitFor(() => result.current.isSuccess);
      const cached = queryClient.getQueryData<typeof initialData>(searchKey);
      expect(cached?.pages[0]?.items[0]?.following).toBe(true);
      expect(cached?.pages[0]?.items[0]?.requested).toBe(false);
    });
  });

  describe('エラー種別', () => {
    it('自己フォロー 400 VALIDATION_ERROR で ApiError が throw される', async () => {
      const err = makeApiError('VALIDATION_ERROR', 400);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'self-user', isActive: false, isPublic: true });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('ブロック・不存在 404 NOT_FOUND で ApiError が throw される', async () => {
      const err = makeApiError('NOT_FOUND', 404);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
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

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('RATE_LIMITED');
      }
    });

    it('403 ACCOUNT_SUSPENDED で ApiError が throw される', async () => {
      const err = makeApiError('ACCOUNT_SUSPENDED', 403);
      mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useToggleFollowMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ userId: 'user-2', isActive: false, isPublic: true });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      if (result.current.error instanceof ApiError) {
        expect(result.current.error.code).toBe('ACCOUNT_SUSPENDED');
      }
    });
  });
});
