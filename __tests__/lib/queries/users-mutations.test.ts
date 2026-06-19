/**
 * @module __tests__/lib/queries/users-mutations
 * useCurrentUserProfileQuery / useUpdateProfileMutation / useDeleteAccountMutation のテスト。
 *
 * 特重要: useDeleteAccountMutation は onSettled で signOut を呼び、
 * サーバー削除成功・失敗いずれの場合も fail-safe でローカル撤収を行う。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useCurrentUserProfileQuery,
  useUpdateProfileMutation,
  useDeleteAccountMutation,
} from '@/lib/queries/users';
import { queryKeys } from '@/lib/queries/keys';

const mockApiGet = jest.fn();
const mockApiPatch = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiGet(...args),
    POST: jest.fn(),
    PATCH: (...args: unknown[]) => mockApiPatch(...args),
    DELETE: (...args: unknown[]) => mockApiDelete(...args),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

const mockSignOut = jest.fn();
jest.mock('@/lib/auth/auth', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
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

async function actAndExpectError(fn: () => Promise<unknown>): Promise<void> {
  await act(async () => {
    try {
      await fn();
    } catch {
      // expected
    }
  });
}

const ME_DATA = {
  id: 'user-1',
  email: 'test@bon-log.com',
  nickname: '松の匠',
  avatarUrl: null,
  bio: '盆栽歴10年',
  isPremium: false,
};

const PROFILE_DATA = {
  id: 'user-1',
  nickname: '松の匠',
  avatarUrl: null,
  headerUrl: null,
  bio: '盆栽歴10年',
  location: '東京',
  isPublic: true,
  bonsaiStartYear: 2015,
  bonsaiStartMonth: 3,
  followersCount: 100,
  followingCount: 50,
  postsCount: 200,
  isBlocked: false,
  isMuted: false,
  isFollowing: false,
  isFollowedBy: false,
};

const FULL_PROFILE = {
  ...ME_DATA,
  headerUrl: null,
  location: '東京',
  isPublic: true,
  bonsaiStartYear: 2015,
  bonsaiStartMonth: 3,
  birthDate: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// useCurrentUserProfileQuery
// ---------------------------------------------------------------------------

describe('useCurrentUserProfileQuery', () => {
  it('キャッシュ未存在の場合 me + profile を API から取得し birthDate: null で補完する', async () => {
    mockApiGet
      .mockResolvedValueOnce({ data: ME_DATA, error: undefined })
      .mockResolvedValueOnce({ data: PROFILE_DATA, error: undefined });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUserProfileQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.birthDate).toBeNull();
    expect(result.current.data?.id).toBe('user-1');
    expect(result.current.data?.email).toBe('test@bon-log.com');
  });

  it('キャッシュ存在時は API を呼ばずキャッシュ値を返す', async () => {
    const { Wrapper, queryClient } = createWrapper();

    // 事前にキャッシュを書き込む
    queryClient.setQueryData(queryKeys.users.meProfile, FULL_PROFILE);

    const { result } = renderHook(() => useCurrentUserProfileQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiGet).not.toHaveBeenCalled();
    expect(result.current.data?.nickname).toBe('松の匠');
  });

  it('enabled: false の場合はフェッチを行わない', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUserProfileQuery({ enabled: false }), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('GET /api/v1/users/me が失敗した場合にエラーを throw する', async () => {
    mockApiGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUserProfileQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useUpdateProfileMutation
// ---------------------------------------------------------------------------

describe('useUpdateProfileMutation', () => {
  const updateBody = {
    nickname: '新しい名前',
    bio: '新しいプロフィール',
  };

  it('成功で UsersMeFullResponse が返る', async () => {
    mockApiPatch.mockResolvedValue({ data: FULL_PROFILE, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateProfileMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(updateBody);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nickname).toBe('松の匠');
  });

  it('成功後に users.me と users.meProfile のキャッシュが setQueryData で即時更新される', async () => {
    mockApiPatch.mockResolvedValue({ data: FULL_PROFILE, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    // setQueryData の呼び出し自体をスパイで検証する
    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

    const { result } = renderHook(() => useUpdateProfileMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(updateBody);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // users.me キャッシュへの書き込みが行われたこと
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      queryKeys.users.me,
      expect.objectContaining({ id: FULL_PROFILE.id, nickname: FULL_PROFILE.nickname })
    );
    // users.meProfile キャッシュへの書き込みが行われたこと
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      queryKeys.users.meProfile,
      FULL_PROFILE
    );
  });

  it('成功後に users.me と users.meProfile が invalidate される', async () => {
    mockApiPatch.mockResolvedValue({ data: FULL_PROFILE, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProfileMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(updateBody);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.users.me })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.users.meProfile })
      );
    });
  });

  it('成功後に users.detail(currentUserId) が invalidate される', async () => {
    mockApiPatch.mockResolvedValue({ data: FULL_PROFILE, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProfileMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(updateBody);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.users.detail('user-1') })
      );
    });
  });

  it('既存の users.detail キャッシュが存在する場合は setQueryData でニックネーム等が即時反映される', async () => {
    const updatedProfile = { ...FULL_PROFILE, nickname: '更新後のニックネーム', avatarUrl: 'https://cdn.bon-log.com/avatar.jpg' };
    mockApiPatch.mockResolvedValue({ data: updatedProfile, error: undefined });

    const { Wrapper, queryClient } = createWrapper();

    // setQueryData の呼び出しをスパイする（gcTime:0 のため invalidate 後にキャッシュが GC される可能性がある）
    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

    // users.detail キャッシュを事前に書き込む（存在チェック分岐を通すため）
    queryClient.setQueryData(queryKeys.users.detail('user-1'), PROFILE_DATA);

    const { result } = renderHook(() => useUpdateProfileMutation('user-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(updateBody);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // users.detail(user-1) に対して setQueryData が呼ばれ、nickname が更新された値になること
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      queryKeys.users.detail('user-1'),
      expect.objectContaining({ nickname: '更新後のニックネーム' })
    );
  });

  it('400 VALIDATION_ERROR で ApiError が throw される', async () => {
    mockApiPatch.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateProfileMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(updateBody));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('error が undefined の場合は汎用エラーが throw される', async () => {
    mockApiPatch.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateProfileMutation('user-1'), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync(updateBody));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error updating profile');
  });
});

// ---------------------------------------------------------------------------
// useDeleteAccountMutation（重要: fail-safe でのサインアウト検証）
// ---------------------------------------------------------------------------

describe('useDeleteAccountMutation', () => {
  it('成功時に signOut が呼ばれる（fail-safe）', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useDeleteAccountMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(queryClient);
  });

  it('サーバーエラー（ApiError）が throw されても signOut が呼ばれる（fail-safe）', async () => {
    mockApiDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useDeleteAccountMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync());

    // エラーの場合でも onSettled が呼ばれ signOut が実行される
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockSignOut).toHaveBeenCalledWith(queryClient);
  });

  it('汎用エラー（data/error ともに undefined）が throw されても signOut が呼ばれる（fail-safe）', async () => {
    mockApiDelete.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useDeleteAccountMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync());

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockSignOut).toHaveBeenCalledWith(queryClient);
    void result;
  });

  it('signOut は onSettled で必ず呼ばれる（成功・失敗いずれのケースでも）', async () => {
    // 本テストは signOut の呼び出しそのものを検証する。
    // signOut 自体が throw した場合は onSettled のエラーが伝播するため（本番コードは try/catch なし）、
    // そのシナリオは「core に useDeleteAccountMutation onSettled の try/catch 追加が必要」として差し戻す。
    // ここでは signOut が正常な場合に呼ばれることを確認する。
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    mockSignOut.mockResolvedValue(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useDeleteAccountMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // onSettled が呼ばれ signOut が実行されること
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(queryClient);
  });

  it('成功 SuccessResponse を返す', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteAccountMutation(), { wrapper: Wrapper });

    let resolvedData: unknown;
    await act(async () => {
      resolvedData = await result.current.mutateAsync();
    });

    expect(resolvedData).toEqual({ success: true });
  });
});
