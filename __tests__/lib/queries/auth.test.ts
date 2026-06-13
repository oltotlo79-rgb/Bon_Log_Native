/**
 * lib/queries/auth のユニットテスト。
 * lib/auth は mock 境界（testing.md 規約）。
 * TanStack Query フックのテスト。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import {
  useLoginMutation,
  useVerifyTwoFactorMutation,
  useLogoutMutation,
  usePasswordResetRequestMutation,
  usePasswordResetConfirmMutation,
  useGoogleSignInMutation,
  useCurrentUserQuery,
  useRegisterMutation,
} from '@/lib/queries/auth';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockSignInWithPassword = jest.fn();
const mockVerifyTwoFactor = jest.fn();
const mockSignOut = jest.fn();
const mockRequestPasswordReset = jest.fn();
const mockConfirmPasswordReset = jest.fn();
const mockSignInWithGoogle = jest.fn();

jest.mock('@/lib/auth/auth', () => ({
  signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
  verifyTwoFactor: (...args: unknown[]) => mockVerifyTwoFactor(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
  confirmPasswordReset: (...args: unknown[]) => mockConfirmPasswordReset(...args),
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
}));

const mockApiClientGet = jest.fn();
const mockApiClientPost = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiClientGet(...args),
    POST: (...args: unknown[]) => mockApiClientPost(...args),
  },
  configureAuthHooks: jest.fn(),
  // jest.mock ファクトリ内ではスコープ外変数参照不可のため require を使用する
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function createWrapper(queryClient = createTestQueryClient()) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function makeApiError(code: MobileApiErrorCode, status = 401): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockApiClientPost.mockReset();
});

// ---------------------------------------------------------------------------
// useLoginMutation
// ---------------------------------------------------------------------------

describe('useLoginMutation', () => {
  it('成功（requires2FA: false）でデータが返る', async () => {
    mockSignInWithPassword.mockResolvedValue({ requires2FA: false });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLoginMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ email: 'user@example.com', password: 'Pass1234' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ requires2FA: false });
  });

  it('成功（requires2FA: true）でデータが返る', async () => {
    mockSignInWithPassword.mockResolvedValue({ requires2FA: true });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLoginMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ email: 'user@example.com', password: 'Pass1234' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ requires2FA: true });
  });

  it('失敗（AUTH_INVALID_CREDENTIALS）でエラーが返る', async () => {
    mockSignInWithPassword.mockRejectedValue(makeApiError('AUTH_INVALID_CREDENTIALS'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLoginMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ email: 'user@example.com', password: 'wrong' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useVerifyTwoFactorMutation
// ---------------------------------------------------------------------------

describe('useVerifyTwoFactorMutation', () => {
  it('成功で isSuccess になる', async () => {
    mockVerifyTwoFactor.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useVerifyTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ code: '123456' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('AUTH_2FA_INVALID_CODE でエラーが返る', async () => {
    mockVerifyTwoFactor.mockRejectedValue(makeApiError('AUTH_2FA_INVALID_CODE'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useVerifyTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ code: 'wrong' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('AUTH_2FA_INVALID_CODE');
  });

  it('AUTH_2FA_TICKET_EXPIRED でエラーが返る', async () => {
    mockVerifyTwoFactor.mockRejectedValue(makeApiError('AUTH_2FA_TICKET_EXPIRED'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useVerifyTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ code: '123456' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('AUTH_2FA_TICKET_EXPIRED');
  });
});

// ---------------------------------------------------------------------------
// useLogoutMutation
// ---------------------------------------------------------------------------

describe('useLogoutMutation', () => {
  it('成功で isSuccess になる', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLogoutMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('signOut に queryClient が渡される', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useLogoutMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSignOut).toHaveBeenCalledWith(queryClient);
  });
});

// ---------------------------------------------------------------------------
// usePasswordResetRequestMutation
// ---------------------------------------------------------------------------

describe('usePasswordResetRequestMutation', () => {
  it('成功で isSuccess になる', async () => {
    mockRequestPasswordReset.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePasswordResetRequestMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ email: 'user@example.com' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('429 でエラーが返る', async () => {
    mockRequestPasswordReset.mockRejectedValue(makeApiError('RATE_LIMITED', 429));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePasswordResetRequestMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ email: 'user@example.com' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// usePasswordResetConfirmMutation
// ---------------------------------------------------------------------------

describe('usePasswordResetConfirmMutation', () => {
  it('成功で isSuccess になる', async () => {
    mockConfirmPasswordReset.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePasswordResetConfirmMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        email: 'user@example.com',
        token: 'reset-token',
        newPassword: 'NewPass1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('401（AUTH_INVALID_CREDENTIALS）でエラーが返る', async () => {
    mockConfirmPasswordReset.mockRejectedValue(makeApiError('AUTH_INVALID_CREDENTIALS', 401));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePasswordResetConfirmMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        email: 'user@example.com',
        token: 'invalid',
        newPassword: 'NewPass1',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('AUTH_INVALID_CREDENTIALS');
  });
});

// ---------------------------------------------------------------------------
// useGoogleSignInMutation
// ---------------------------------------------------------------------------

describe('useGoogleSignInMutation', () => {
  it('成功で isSuccess になる', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGoogleSignInMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ idToken: 'google-id-token' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useRegisterMutation
// ---------------------------------------------------------------------------

describe('useRegisterMutation', () => {
  const validParams = {
    nickname: 'テストユーザー',
    email: 'new@example.com',
    password: 'Pass1234',
  };

  it('成功（201）で { success: true } が返る', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRegisterMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(validParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true });
  });

  it('成功時に termsAccepted: true を body に含めて POST する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRegisterMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(validParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/auth/register', {
      body: {
        nickname: validParams.nickname,
        email: validParams.email,
        password: validParams.password,
        termsAccepted: true,
      },
    });
  });

  it('409 CONFLICT でエラーが返る（メール重複）', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('CONFLICT', 409),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRegisterMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(validParams);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe('CONFLICT');
    expect((result.current.error as ApiError).status).toBe(409);
  });

  it('400 VALIDATION_ERROR でエラーが返る', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRegisterMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ ...validParams, password: 'short' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('VALIDATION_ERROR');
  });

  it('429 RATE_LIMITED でエラーが返る', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRegisterMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(validParams);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('RATE_LIMITED');
  });
});

// ---------------------------------------------------------------------------
// useCurrentUserQuery
// ---------------------------------------------------------------------------

describe('useCurrentUserQuery', () => {
  it('成功でユーザーデータが返る', async () => {
    const userData = {
      id: 'user-1',
      email: 'user@example.com',
      nickname: 'TestUser',
      avatarUrl: null,
      bio: null,
      isPremium: false,
    };
    mockApiClientGet.mockResolvedValue({ data: userData, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCurrentUserQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(userData);
  });

  it('enabled=false の場合はフェッチしない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useCurrentUserQuery({ enabled: false }),
      { wrapper: Wrapper }
    );

    expect(result.current.isPending).toBe(true);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('401 でエラーが返る', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCurrentUserQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
