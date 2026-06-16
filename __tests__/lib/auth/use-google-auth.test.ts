/**
 * lib/auth/use-google-auth のユニットテスト。
 * expo-auth-session/providers/google と useGoogleSignInMutation をモックし、
 * フックの公開 API（isAvailable, isLoading, error, signIn の全分岐）を検証する。
 *
 * signIn 本体のテストでは beforeEach で EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID を設定し、
 * request を非 null にすることで isAvailable=true を再現する。
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useGoogleAuth } from '@/lib/auth/use-google-auth';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockPromptAsync = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseIdTokenAuthRequest = jest.fn();
const mockUseGoogleSignInMutation = jest.fn();

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: (...args: unknown[]) => mockUseIdTokenAuthRequest(...args),
}));

jest.mock('@/lib/queries/auth', () => ({
  useGoogleSignInMutation: (...args: unknown[]) => mockUseGoogleSignInMutation(...args),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper };
}

const FAKE_REQUEST = { url: 'https://accounts.google.com/o/oauth2/auth' };

function setupRequestAndPrompt(
  request: unknown,
  promptResult: unknown = { type: 'success', params: { id_token: 'TOKEN' } }
) {
  mockPromptAsync.mockResolvedValue(promptResult);
  mockUseIdTokenAuthRequest.mockReturnValue([request, null, mockPromptAsync]);
}

function setupMutation({
  isPending = false,
  error = null as Error | null,
} = {}) {
  mockUseGoogleSignInMutation.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending,
    error,
    isIdle: !isPending,
    isSuccess: false,
    isError: error !== null,
    isPaused: false,
    data: undefined,
    failureCount: 0,
    failureReason: null,
    variables: undefined,
    context: undefined,
    reset: jest.fn(),
    mutate: jest.fn(),
    status: error !== null ? 'error' : (isPending ? 'pending' : 'idle'),
    submittedAt: 0,
  });
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  setupMutation();
  setupRequestAndPrompt(null);
});

// ---------------------------------------------------------------------------
// isAvailable
// ---------------------------------------------------------------------------

describe('useGoogleAuth - isAvailable', () => {
  it('request が null のとき isAvailable は false', () => {
    setupRequestAndPrompt(null);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isAvailable).toBe(false);
  });

  it('request が非 null でも WEB_CLIENT_ID が空（テスト環境）のとき isAvailable は false', () => {
    // テスト環境では EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID 未設定 → WEB_CLIENT_ID = ''
    setupRequestAndPrompt(FAKE_REQUEST);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// signIn - isAvailable=false のとき早期 return
// ---------------------------------------------------------------------------

describe('useGoogleAuth - signIn（isAvailable=false）', () => {
  it('request=null のとき signIn を呼んでも promptAsync は呼ばれない', async () => {
    setupRequestAndPrompt(null);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.signIn();
    });

    expect(mockPromptAsync).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('WEB_CLIENT_ID が空のとき signIn を呼んでも promptAsync は呼ばれない', async () => {
    setupRequestAndPrompt(FAKE_REQUEST);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.signIn();
    });

    expect(mockPromptAsync).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('signIn を呼んでも resolve(undefined) になる（エラーにならない）', async () => {
    setupRequestAndPrompt(null);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).resolves.toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// isLoading
// ---------------------------------------------------------------------------

describe('useGoogleAuth - isLoading', () => {
  it('mutation.isPending が true のとき isLoading が true になる', () => {
    setupRequestAndPrompt(FAKE_REQUEST);
    setupMutation({ isPending: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('mutation.isPending が false のとき isLoading が false になる', () => {
    setupRequestAndPrompt(FAKE_REQUEST);
    setupMutation({ isPending: false });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// error
// ---------------------------------------------------------------------------

describe('useGoogleAuth - error', () => {
  it('mutation.error が設定されているとき error に反映される', () => {
    const mutationError = new Error('server validation failed');
    setupRequestAndPrompt(FAKE_REQUEST);
    setupMutation({ error: mutationError });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.error).toBe(mutationError);
  });

  it('mutation.error が null のとき error は null', () => {
    setupRequestAndPrompt(FAKE_REQUEST);
    setupMutation({ error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 戻り値の構造
// ---------------------------------------------------------------------------

describe('useGoogleAuth - 戻り値の構造', () => {
  it('signIn, isLoading, isAvailable, error の 4 フィールドを返す', () => {
    setupRequestAndPrompt(FAKE_REQUEST);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isAvailable).toBe('boolean');
    expect(result.current.error === null || result.current.error instanceof Error).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// signIn - isAvailable=true（env 設定 + request 非 null）での内部分岐テスト
// ---------------------------------------------------------------------------

describe('useGoogleAuth - signIn（isAvailable=true）', () => {
  const WEB_CLIENT_ID = 'test-web-client-id.apps.googleusercontent.com';

  beforeEach(() => {
    process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] = WEB_CLIENT_ID;
    setupRequestAndPrompt(FAKE_REQUEST);
  });

  afterEach(() => {
    delete process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
  });

  it('env 設定 + request 非 null のとき isAvailable は true', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isAvailable).toBe(true);
  });

  it('type:success かつ id_token あり → mutateAsync が idToken で呼ばれる', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, {
      type: 'success',
      params: { id_token: 'GOOGLE_ID_TOKEN' },
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.signIn();
    });

    expect(mockPromptAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({ idToken: 'GOOGLE_ID_TOKEN' });
  });

  it('type:success かつ id_token が存在しない（空オブジェクト）→ ERR_GOOGLE_ID_TOKEN_MISSING を throw', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, {
      type: 'success',
      params: {},
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow(
        'Google ログインに失敗しました。もう一度お試しください。'
      );
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:success かつ id_token が空文字 → ERR_GOOGLE_ID_TOKEN_MISSING を throw', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, {
      type: 'success',
      params: { id_token: '' },
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow(
        'Google ログインに失敗しました。もう一度お試しください。'
      );
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:error かつ error.message あり → そのメッセージで throw', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, {
      type: 'error',
      error: { message: 'access_denied' },
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow('access_denied');
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:error かつ error が null → ERR_GOOGLE_SIGN_IN_FAILED を throw', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, {
      type: 'error',
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow(
        'Google ログイン中にエラーが発生しました。再度お試しください。'
      );
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:cancel → エラーにならず resolve(undefined) になり mutateAsync 未呼び出し', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, { type: 'cancel' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).resolves.toBeUndefined();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:dismiss → エラーにならず resolve(undefined) になり mutateAsync 未呼び出し', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, { type: 'dismiss' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).resolves.toBeUndefined();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:locked → エラーにならず resolve(undefined) になり mutateAsync 未呼び出し', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, { type: 'locked' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).resolves.toBeUndefined();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:opened → エラーにならず resolve(undefined) になり mutateAsync 未呼び出し', async () => {
    setupRequestAndPrompt(FAKE_REQUEST, { type: 'opened' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).resolves.toBeUndefined();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('promptAsync が例外を投げた場合（Error インスタンス）→ そのメッセージで throw', async () => {
    mockPromptAsync.mockRejectedValue(new Error('network_error'));
    mockUseIdTokenAuthRequest.mockReturnValue([FAKE_REQUEST, null, mockPromptAsync]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow('network_error');
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('promptAsync が非 Error 値を reject した場合 → ERR_GOOGLE_SIGN_IN_FAILED を throw', async () => {
    mockPromptAsync.mockRejectedValue('string_error');
    mockUseIdTokenAuthRequest.mockReturnValue([FAKE_REQUEST, null, mockPromptAsync]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow(
        'Google ログイン中にエラーが発生しました。再度お試しください。'
      );
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('isLoading は mutation.isPending を反映する（isAvailable=true の状態で確認）', () => {
    setupMutation({ isPending: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAvailable).toBe(true);
  });
});
