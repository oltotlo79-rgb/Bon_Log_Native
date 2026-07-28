/**
 * lib/queries/users のユニットテスト。
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useUserProfileQuery, isBlockedByViewedUser } from '@/lib/queries/users';
import type { UserProfile } from '@/lib/queries/users';

const mockApiClientGet = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
    POST: jest.fn(),
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
  return { Wrapper };
}

function makeApiError(code: MobileApiErrorCode, status: number): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

function makeUserProfile() {
  return {
    id: 'user-1',
    nickname: '松の匠',
    avatarUrl: null,
    headerUrl: null,
    bio: '黒松愛好家',
    location: '東京',
    isPublic: true,
    bonsaiStartYear: 2010,
    bonsaiStartMonth: 4,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    postsCount: 42,
    followersCount: 100,
    followingCount: 50,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useUserProfileQuery', () => {
  it('成功でプロフィールが返る', async () => {
    const profile = makeUserProfile();
    mockApiClientGet.mockResolvedValue({ data: profile, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserProfileQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('user-1');
    expect(result.current.data?.postsCount).toBe(42);
  });

  it('id が空文字の場合はフェッチしない（enabled=false）', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserProfileQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('NOT_FOUND', 404),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserProfileQuery('user-nonexistent'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
    }
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserProfileQuery('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

describe('isBlockedByViewedUser', () => {
  it('isBlockedByUser: true のとき true を返す', () => {
    const profile: Pick<UserProfile, 'isBlockedByUser'> = { isBlockedByUser: true };
    expect(isBlockedByViewedUser(profile)).toBe(true);
  });

  it('isBlockedByUser: false のとき false を返す', () => {
    const profile: Pick<UserProfile, 'isBlockedByUser'> = { isBlockedByUser: false };
    expect(isBlockedByViewedUser(profile)).toBe(false);
  });

  it('isBlockedByUser: undefined（サーバー未配備時）のとき false を返す（安全側判定）', () => {
    // スペック上は required boolean だが、サーバー本番配備前は実行時 undefined になり得る
    // （lib/queries/users.ts の JSDoc / cfw handback 2026-07-28）。型と実行時の乖離を吸収できることを検証する。
    const profile = { isBlockedByUser: undefined } as unknown as Pick<
      UserProfile,
      'isBlockedByUser'
    >;
    expect(isBlockedByViewedUser(profile)).toBe(false);
  });

  it('isBlockedByUser フィールド自体が存在しないオブジェクトでも false を返す', () => {
    const profile = {} as unknown as Pick<UserProfile, 'isBlockedByUser'>;
    expect(isBlockedByViewedUser(profile)).toBe(false);
  });

  it('profile 自体が undefined の場合は TypeError を throw する（呼び出し側の型で防止される契約）', () => {
    // @ts-expect-error 実行時に undefined が渡された場合の挙動を検証するための意図的な型違反
    expect(() => isBlockedByViewedUser(undefined)).toThrow(TypeError);
  });

  it('profile 自体が null の場合は TypeError を throw する（呼び出し側の型で防止される契約）', () => {
    // @ts-expect-error 実行時に null が渡された場合の挙動を検証するための意図的な型違反
    expect(() => isBlockedByViewedUser(null)).toThrow(TypeError);
  });
});
