/**
 * lib/auth/use-google-auth のユニットテスト。
 * @react-native-google-signin/google-signin と useGoogleSignInMutation をモックし、
 * フックの公開 API（isAvailable, isLoading, error, signIn の全分岐）を検証する。
 *
 * GoogleSignin.signIn は setup.ts で一元モック済み。
 * 各テストでは jest.mocked(GoogleSignin.signIn).mockResolvedValue(...) で戻り値を差し替える。
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { useGoogleAuth } from '@/lib/auth/use-google-auth';
import {
  ERR_GOOGLE_ID_TOKEN_MISSING,
  ERR_GOOGLE_SIGN_IN_FAILED,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockMutateAsync = jest.fn();
const mockUseGoogleSignInMutation = jest.fn();

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

const mockGoogleSignIn = jest.mocked(GoogleSignin.signIn);
const mockHasPlayServices = jest.mocked(GoogleSignin.hasPlayServices);

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  setupMutation();
  // デフォルト: signIn は success + idToken あり
  mockGoogleSignIn.mockResolvedValue({
    type: 'success',
    data: {
      idToken: 'GOOGLE_ID_TOKEN',
      serverAuthCode: null,
      scopes: [],
      user: {
        email: 'test@example.com',
        id: 'user-id',
        givenName: 'Test',
        familyName: 'User',
        photo: null,
        name: 'Test User',
      },
    },
  });
  mockHasPlayServices.mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// isAvailable
// ---------------------------------------------------------------------------

describe('useGoogleAuth - isAvailable', () => {
  it('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID が空のとき isAvailable は false', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isAvailable).toBe(false);
  });

  it('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID が設定されているとき isAvailable は true', () => {
    process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] = 'test-client-id.apps.googleusercontent.com';
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isAvailable).toBe(true);
    delete process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
  });
});

// ---------------------------------------------------------------------------
// signIn - isAvailable=false のとき早期 return
// ---------------------------------------------------------------------------

describe('useGoogleAuth - signIn（isAvailable=false）', () => {
  it('WEB_CLIENT_ID が空のとき signIn を呼んでも hasPlayServices は呼ばれない', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.signIn();
    });

    expect(mockHasPlayServices).not.toHaveBeenCalled();
    expect(mockGoogleSignIn).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('signIn を呼んでも resolve(undefined) になる（エラーにならない）', async () => {
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
    setupMutation({ isPending: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('mutation.isPending が false のとき isLoading が false になる', () => {
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
    setupMutation({ error: mutationError });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.error).toBe(mutationError);
  });

  it('mutation.error が null のとき error は null', () => {
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
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isAvailable).toBe('boolean');
    expect(result.current.error === null || result.current.error instanceof Error).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// signIn - isAvailable=true での内部分岐テスト
// ---------------------------------------------------------------------------

describe('useGoogleAuth - signIn（isAvailable=true）', () => {
  const WEB_CLIENT_ID = 'test-web-client-id.apps.googleusercontent.com';

  beforeEach(() => {
    process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] = WEB_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
  });

  it('env 設定時に isAvailable は true', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isAvailable).toBe(true);
  });

  it('type:success かつ idToken あり → mutateAsync が idToken で呼ばれる', async () => {
    mockGoogleSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'REAL_ID_TOKEN',
        serverAuthCode: null,
        scopes: [],
        user: {
          email: 'test@example.com',
          id: 'user-id',
          givenName: 'Test',
          familyName: 'User',
          photo: null,
          name: 'Test User',
        },
      },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.signIn();
    });

    expect(mockHasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
    expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({ idToken: 'REAL_ID_TOKEN' });
  });

  it('type:success かつ idToken が null → ERR_GOOGLE_ID_TOKEN_MISSING を throw', async () => {
    mockGoogleSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: null,
        serverAuthCode: null,
        scopes: [],
        user: {
          email: 'test@example.com',
          id: 'user-id',
          givenName: 'Test',
          familyName: 'User',
          photo: null,
          name: 'Test User',
        },
      },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow(ERR_GOOGLE_ID_TOKEN_MISSING);
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:success かつ idToken が空文字 → ERR_GOOGLE_ID_TOKEN_MISSING を throw', async () => {
    mockGoogleSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: '',
        serverAuthCode: null,
        scopes: [],
        user: {
          email: 'test@example.com',
          id: 'user-id',
          givenName: 'Test',
          familyName: 'User',
          photo: null,
          name: 'Test User',
        },
      },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow(ERR_GOOGLE_ID_TOKEN_MISSING);
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('type:cancelled → エラーにならず resolve(undefined)、mutateAsync 未呼び出し', async () => {
    mockGoogleSignIn.mockResolvedValue({
      type: 'cancelled',
      data: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).resolves.toBeUndefined();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('SIGN_IN_CANCELLED コード付きエラー throw → no-op（キャンセル扱い）', async () => {
    const cancelError = Object.assign(new Error('sign in cancelled'), {
      code: statusCodes.SIGN_IN_CANCELLED,
    });
    mockGoogleSignIn.mockRejectedValue(cancelError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).resolves.toBeUndefined();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('IN_PROGRESS コード付きエラー throw → no-op（進行中扱い）', async () => {
    const inProgressError = Object.assign(new Error('operation in progress'), {
      code: statusCodes.IN_PROGRESS,
    });
    mockGoogleSignIn.mockRejectedValue(inProgressError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).resolves.toBeUndefined();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('その他のコード付きネイティブエラー → そのメッセージで throw', async () => {
    const nativeError = Object.assign(new Error('play services not available'), {
      code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE,
    });
    mockGoogleSignIn.mockRejectedValue(nativeError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow('play services not available');
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('Error インスタンスの例外 → そのメッセージで throw', async () => {
    mockGoogleSignIn.mockRejectedValue(new Error('network_error'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow('network_error');
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('非 Error 値を reject → ERR_GOOGLE_SIGN_IN_FAILED を throw', async () => {
    mockGoogleSignIn.mockRejectedValue('string_error');

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow(ERR_GOOGLE_SIGN_IN_FAILED);
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('hasPlayServices が例外を投げた場合 → ERR_GOOGLE_SIGN_IN_FAILED を throw', async () => {
    mockHasPlayServices.mockRejectedValue(new Error('play services check failed'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toThrow('play services check failed');
    });

    expect(mockGoogleSignIn).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('isLoading は mutation.isPending を反映する（isAvailable=true の状態で確認）', () => {
    setupMutation({ isPending: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAvailable).toBe(true);
  });

  it('GoogleSignin.configure が webClientId で呼ばれる', () => {
    const mockConfigure = jest.mocked(GoogleSignin.configure);
    const { Wrapper } = createWrapper();
    renderHook(() => useGoogleAuth(), { wrapper: Wrapper });
    expect(mockConfigure).toHaveBeenCalledWith(
      expect.objectContaining({ webClientId: WEB_CLIENT_ID })
    );
  });
});
