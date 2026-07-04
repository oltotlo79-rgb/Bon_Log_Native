/**
 * lib/queries/auth のパスワード変更・メールアドレス変更ミューテーションのユニットテスト。
 * useChangePasswordMutation / useRequestEmailChangeMutation / useConfirmEmailChangeMutation を対象とする。
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
  useChangePasswordMutation,
  useRequestEmailChangeMutation,
  useConfirmEmailChangeMutation,
} from '@/lib/queries/auth';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientPost = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    POST: (...args: unknown[]) => mockApiClientPost(...args),
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

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useChangePasswordMutation
// ---------------------------------------------------------------------------

describe('useChangePasswordMutation', () => {
  it('成功で currentPassword・newPassword を body に送信する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ currentPassword: 'OldPass1', newPassword: 'NewPass2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true });
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/auth/password/change', {
      body: { currentPassword: 'OldPass1', newPassword: 'NewPass2' },
    });
  });

  it('成功後に users.me を invalidate しない（フィールドへの影響がないため）', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ currentPassword: 'OldPass1', newPassword: 'NewPass2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('401 AUTH_INVALID_CREDENTIALS（現パスワード不一致）でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_INVALID_CREDENTIALS', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ currentPassword: 'wrong', newPassword: 'NewPass2' });
      } catch {
        // isError の確認は waitFor 側で行う
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('400 VALIDATION_ERROR（新パスワード強度不足）でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('VALIDATION_ERROR', 400),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ currentPassword: 'OldPass1', newPassword: 'weak' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('409 CONFLICT（OAuth 専用アカウント）でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('CONFLICT', 409),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ currentPassword: 'OldPass1', newPassword: 'NewPass2' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('CONFLICT');
    }
  });

  it('429 RATE_LIMITED でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ currentPassword: 'OldPass1', newPassword: 'NewPass2' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
    }
  });
});

// ---------------------------------------------------------------------------
// useRequestEmailChangeMutation
// ---------------------------------------------------------------------------

describe('useRequestEmailChangeMutation', () => {
  it('成功で newEmail・currentPassword を body に送信する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRequestEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ newEmail: 'new@example.com', currentPassword: 'Pass1234' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true });
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/auth/email/change/request', {
      body: { newEmail: 'new@example.com', currentPassword: 'Pass1234' },
    });
  });

  it('成功後に invalidate しない（確定は confirm 後のため）', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRequestEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ newEmail: 'new@example.com', currentPassword: 'Pass1234' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('401 AUTH_INVALID_CREDENTIALS（現パスワード不一致）でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_INVALID_CREDENTIALS', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRequestEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ newEmail: 'new@example.com', currentPassword: 'wrong' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('409 CONFLICT（OAuth 専用アカウント）でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('CONFLICT', 409),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRequestEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ newEmail: 'new@example.com', currentPassword: 'Pass1234' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('CONFLICT');
    }
  });

  it('429 RATE_LIMITED でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useRequestEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ newEmail: 'new@example.com', currentPassword: 'Pass1234' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
    }
  });
});

// ---------------------------------------------------------------------------
// useConfirmEmailChangeMutation
// ---------------------------------------------------------------------------

describe('useConfirmEmailChangeMutation', () => {
  it('成功で token を body に送信する', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConfirmEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ token: 'confirm-token-123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true });
    expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/auth/email/change/confirm', {
      body: { token: 'confirm-token-123' },
    });
  });

  it('成功後に users.me が invalidate される（email フィールドが変わるため）', async () => {
    mockApiClientPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useConfirmEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ token: 'confirm-token-123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.users.me });
  });

  it('401 AUTH_INVALID_CREDENTIALS（トークン無効/期限切れ）でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_INVALID_CREDENTIALS', 401),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConfirmEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ token: 'expired-token' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('409 CONFLICT（newEmail 使用済み）でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('CONFLICT', 409),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConfirmEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ token: 'confirm-token-123' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('CONFLICT');
    }
  });

  it('429 RATE_LIMITED でエラーが伝播する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConfirmEmailChangeMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ token: 'confirm-token-123' });
      } catch {
        // no-op
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
    }
  });
});
