/**
 * lib/queries/auth の 2FA 管理フック（setup / enable / disable）のユニットテスト。
 * lib/api/client は mock 境界（testing.md 規約）。ネットワークに出ない。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { queryKeys } from '@/lib/queries/keys';
import {
  useTwoFactorSetupMutation,
  useEnableTwoFactorMutation,
  useDisableTwoFactorMutation,
} from '@/lib/queries/auth';

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
  },
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

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

function makeSetupResponse() {
  return {
    secret: 'JBSWY3DPEHPK3PXP',
    otpAuthUrl: 'otpauth://totp/BonLog?secret=JBSWY3DPEHPK3PXP',
    setupId: 'setup-123',
    backupCodes: ['ABCD-EFGH1234', 'IJKL-MNOP5678'],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useTwoFactorSetupMutation
// ---------------------------------------------------------------------------

describe('useTwoFactorSetupMutation', () => {
  it('成功で secret・otpAuthUrl・setupId・backupCodes が返る', async () => {
    const setupResponse = makeSetupResponse();
    mockApiClientGet.mockResolvedValue({ data: setupResponse, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTwoFactorSetupMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(setupResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/api/v1/auth/2fa/setup');
  });

  it('呼び出すたびに GET /api/v1/auth/2fa/setup を再実行する（キャッシュしない）', async () => {
    mockApiClientGet.mockResolvedValue({ data: makeSetupResponse(), error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTwoFactorSetupMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockApiClientGet).toHaveBeenCalledTimes(2);
  });

  it('429 RATE_LIMITED でエラーが返る', async () => {
    mockApiClientGet.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTwoFactorSetupMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // isError の確認は waitFor 側で行う
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// useEnableTwoFactorMutation
// ---------------------------------------------------------------------------

describe('useEnableTwoFactorMutation', () => {
  it('成功で { enabled: true } が返り、code と setupId を body に送る', async () => {
    mockApiClientPost.mockResolvedValue({ data: { enabled: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEnableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ code: '123456', setupId: 'setup-123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ enabled: true });
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/auth/2fa/enable', {
      body: { code: '123456', setupId: 'setup-123' },
    });
  });

  it('成功後に users.me が invalidate される', async () => {
    mockApiClientPost.mockResolvedValue({ data: { enabled: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useEnableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ code: '123456', setupId: 'setup-123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.users.me });
  });

  it('AUTH_2FA_INVALID_CODE でエラーが返る', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_2FA_INVALID_CODE', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEnableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ code: 'wrong', setupId: 'setup-123' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_2FA_INVALID_CODE');
    }
  });

  it('AUTH_2FA_TICKET_EXPIRED でエラーが返る', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_2FA_TICKET_EXPIRED', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEnableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ code: '123456', setupId: 'expired-setup' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('CONFLICT（既に有効化済み）でエラーが返る', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('CONFLICT', 409),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEnableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ code: '123456', setupId: 'setup-123' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('CONFLICT');
    }
  });
});

// ---------------------------------------------------------------------------
// useDisableTwoFactorMutation
// ---------------------------------------------------------------------------

describe('useDisableTwoFactorMutation', () => {
  it('成功で { disabled: true } が返り、password を body に送る', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { disabled: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDisableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ password: 'CurrentPass1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ disabled: true });
    expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/auth/2fa/disable', {
      body: { password: 'CurrentPass1' },
    });
  });

  it('成功後に users.me が invalidate される', async () => {
    mockApiClientDelete.mockResolvedValue({ data: { disabled: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDisableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ password: 'CurrentPass1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.users.me });
  });

  it('AUTH_INVALID_CREDENTIALS（パスワード不一致）でエラーが返る', async () => {
    mockApiClientDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_INVALID_CREDENTIALS', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDisableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ password: 'wrong-password' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('CONFLICT（未有効化）でエラーが返る', async () => {
    mockApiClientDelete.mockResolvedValue({
      data: undefined,
      error: makeApiError('CONFLICT', 409),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDisableTwoFactorMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ password: 'CurrentPass1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('CONFLICT');
    }
  });
});
