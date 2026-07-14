/**
 * lib/auth/auth のユニットテスト。
 * lib/api は mock 境界（testing.md 規約）。
 * expo-secure-store はセットアップで一元モック済み。
 */

import { ApiError } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  initializeAuth,
  signInWithPassword,
  verifyTwoFactor,
  signOut,
  requestPasswordReset,
  confirmPasswordReset,
  signInWithGoogle,
  resetPending2FATicketForTest,
} from '@/lib/auth/auth';
import { resetCachedAccessTokenForTest } from '@/lib/auth/token-store';
import {
  resetAuthStoreForTest,
  getAuthStatus,
  getLastAuthFailureReason,
} from '@/lib/auth/auth-store';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiClientPost = jest.fn();
const mockApiClientGet = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    POST: (...args: unknown[]) => mockApiClientPost(...args),
    GET: (...args: unknown[]) => mockApiClientGet(...args),
  },
  configureAuthHooks: jest.fn(),
}));

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();
const mockDeleteItem = jest.fn();

jest.mock('expo-secure-store', () => ({
  setItemAsync: (...args: unknown[]) => mockSetItem(...args),
  getItemAsync: (...args: unknown[]) => mockGetItem(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItem(...args),
}));

// lib/auth/auth のテスト境界は lib/auth に留める。
// signOut 内で呼ばれる unregisterDeviceForPushNotifications は
// lib/push のテストで別途検証するためここではモックする。
const mockUnregisterDevice = jest.fn().mockResolvedValue(undefined);
const mockCancelPendingPushRegistrations = jest.fn();
jest.mock('@/lib/push/device-registration', () => ({
  cancelPendingPushRegistrations: (...args: unknown[]) =>
    mockCancelPendingPushRegistrations(...args),
  unregisterDeviceForPushNotifications: (...args: unknown[]) =>
    mockUnregisterDevice(...args),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeQueryClient() {
  const queryClient = createTestQueryClient();
  jest.spyOn(queryClient, 'clear');
  return queryClient;
}

function makeTokenPair() {
  return {
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
    expiresIn: 900,
  };
}

function makeApiError(code: MobileApiErrorCode, status = 401): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  resetCachedAccessTokenForTest();
  resetAuthStoreForTest();
  resetPending2FATicketForTest();
  mockSetItem.mockResolvedValue(undefined);
  mockDeleteItem.mockResolvedValue(undefined);
  mockUnregisterDevice.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// initializeAuth
// ---------------------------------------------------------------------------

describe('initializeAuth', () => {
  it('secure-store にトークンがある場合は signedIn になる', async () => {
    mockGetItem.mockResolvedValue('existing-token');
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    expect(getAuthStatus()).toBe('signedIn');
  });

  it('secure-store にトークンがない場合は signedOut になる', async () => {
    mockGetItem.mockResolvedValue(null);
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    expect(getAuthStatus()).toBe('signedOut');
  });

  it('configureAuthHooks を呼び出す', async () => {
    mockGetItem.mockResolvedValue(null);
    const { configureAuthHooks } = jest.requireMock('@/lib/api/client');
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    expect(configureAuthHooks).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// signInWithPassword
// ---------------------------------------------------------------------------

describe('signInWithPassword', () => {
  it('200 レスポンス: トークンを保存して signedIn を返す', async () => {
    mockApiClientPost.mockResolvedValue({
      data: makeTokenPair(),
      error: undefined,
    });

    const result = await signInWithPassword('user@example.com', 'password');

    expect(result).toEqual({ requires2FA: false });
    expect(getAuthStatus()).toBe('signedIn');
    expect(mockSetItem).toHaveBeenCalledTimes(2); // access + refresh
  });

  it('202 レスポンス（requires2FA）: チケットをメモリ保持して requires2FA: true を返す', async () => {
    mockApiClientPost.mockResolvedValue({
      data: { requires2FA: true as const, ticket: 'ticket-abc' },
      error: undefined,
    });

    const result = await signInWithPassword('user@example.com', 'password');

    expect(result).toEqual({ requires2FA: true });
    // 2FA 中は signedIn にならない
    expect(getAuthStatus()).toBe('loading'); // initializeAuth 未呼び出しのため loading
    // トークンを保存しない
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('401 エラー: ApiError を throw する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_INVALID_CREDENTIALS'),
    });

    await expect(signInWithPassword('user@example.com', 'wrong')).rejects.toBeInstanceOf(ApiError);
  });

  it('429 エラー: ApiError を throw する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });

    await expect(signInWithPassword('user@example.com', 'password')).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// verifyTwoFactor
// ---------------------------------------------------------------------------

describe('verifyTwoFactor', () => {
  it('チケットなしで呼ぶと Error を throw する', async () => {
    await expect(verifyTwoFactor('123456')).rejects.toThrow(
      '2FA ticket is not available'
    );
  });

  it('成功: トークンを保存して signedIn になる', async () => {
    // まず 2FA チケットをセットアップ
    mockApiClientPost.mockResolvedValueOnce({
      data: { requires2FA: true as const, ticket: 'ticket-xyz' },
      error: undefined,
    });
    await signInWithPassword('user@example.com', 'password');

    // 2FA 検証
    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    await verifyTwoFactor('123456');

    expect(getAuthStatus()).toBe('signedIn');
    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });

  it('失敗（AUTH_2FA_INVALID_CODE）: チケットを破棄して ApiError を throw する', async () => {
    // チケットをセット
    mockApiClientPost.mockResolvedValueOnce({
      data: { requires2FA: true as const, ticket: 'ticket-xyz' },
      error: undefined,
    });
    await signInWithPassword('user@example.com', 'password');

    // 失敗
    mockApiClientPost.mockResolvedValueOnce({
      data: undefined,
      error: makeApiError('AUTH_2FA_INVALID_CODE'),
    });

    await expect(verifyTwoFactor('wrong-code')).rejects.toBeInstanceOf(ApiError);

    // チケットが破棄されているため、再度 verifyTwoFactor を呼ぶと ticket なしエラー
    await expect(verifyTwoFactor('wrong-code')).rejects.toThrow('2FA ticket is not available');
  });

  it('失敗（AUTH_2FA_TICKET_EXPIRED）: チケットを破棄して ApiError を throw する', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: { requires2FA: true as const, ticket: 'ticket-xyz' },
      error: undefined,
    });
    await signInWithPassword('user@example.com', 'password');

    mockApiClientPost.mockResolvedValueOnce({
      data: undefined,
      error: makeApiError('AUTH_2FA_TICKET_EXPIRED'),
    });

    await expect(verifyTwoFactor('123456')).rejects.toBeInstanceOf(ApiError);

    // チケット破棄確認
    await expect(verifyTwoFactor('123456')).rejects.toThrow('2FA ticket is not available');
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe('signOut', () => {
  it('logout API を呼び、トークンを削除して signedOut になる', async () => {
    // リフレッシュトークンがある状態をシミュレート
    mockGetItem.mockResolvedValue('refresh-token');
    mockApiClientPost.mockResolvedValue({ data: { success: true as const }, error: undefined });

    const queryClient = makeQueryClient();
    await signOut(queryClient);

    expect(mockDeleteItem).toHaveBeenCalledTimes(2); // access + refresh
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(getAuthStatus()).toBe('signedOut');
    expect(getLastAuthFailureReason()).toBeNull();
  });

  it('logout API が失敗してもローカルクリーンアップを実施する（fail-safe）', async () => {
    mockGetItem.mockResolvedValue('refresh-token');
    mockApiClientPost.mockRejectedValue(new Error('Network error'));

    const queryClient = makeQueryClient();
    await signOut(queryClient);

    // ネットワーク失敗に関わらず削除と clear が走る
    expect(mockDeleteItem).toHaveBeenCalledTimes(2);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(getAuthStatus()).toBe('signedOut');
  });

  it('リフレッシュトークンがない場合は logout API を呼ばない', async () => {
    mockGetItem.mockResolvedValue(null);

    const queryClient = makeQueryClient();
    await signOut(queryClient);

    expect(mockApiClientPost).not.toHaveBeenCalled();
    expect(mockDeleteItem).toHaveBeenCalledTimes(2);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(getAuthStatus()).toBe('signedOut');
  });

  it('signOut は unregisterDeviceForPushNotifications を呼び出す', async () => {
    mockGetItem.mockResolvedValue('refresh-token');
    mockApiClientPost.mockResolvedValue({ data: { success: true as const }, error: undefined });

    const queryClient = makeQueryClient();
    await signOut(queryClient);

    expect(mockUnregisterDevice).toHaveBeenCalledTimes(1);
    expect(mockCancelPendingPushRegistrations).toHaveBeenCalledTimes(1);
    expect(mockCancelPendingPushRegistrations.mock.invocationCallOrder[0]).toBeLessThan(
      mockApiClientPost.mock.invocationCallOrder[0]
    );
  });

  it('Push 解除が失敗してもトークン削除・状態遷移は完了する（fail-safe）', async () => {
    mockGetItem.mockResolvedValue('refresh-token');
    mockApiClientPost.mockResolvedValue({ data: { success: true as const }, error: undefined });
    mockUnregisterDevice.mockRejectedValue(new Error('Push unregister failed'));

    const queryClient = makeQueryClient();
    await signOut(queryClient);

    expect(mockDeleteItem).toHaveBeenCalledTimes(2);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(getAuthStatus()).toBe('signedOut');
  });
});

// ---------------------------------------------------------------------------
// onAuthFailure 経路（reuseDetected 区別）
// ---------------------------------------------------------------------------

describe('initializeAuth の onAuthFailure', () => {
  it('reuseDetected=true の場合は kind: reuseDetected を記録する', async () => {
    mockGetItem.mockResolvedValue(null);
    const { configureAuthHooks } = jest.requireMock('@/lib/api/client') as {
      configureAuthHooks: jest.Mock;
    };
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    const capturedHooks = configureAuthHooks.mock.calls[0][0] as {
      onAuthFailure: (reuseDetected: boolean) => void;
    };

    // onAuthFailure(true) を手動呼び出しで検証
    capturedHooks.onAuthFailure(true);
    // 非同期処理のため少し待つ
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(getLastAuthFailureReason()).toEqual({ kind: 'reuseDetected' });
    expect(getAuthStatus()).toBe('signedOut');
  });

  it('reuseDetected=false の場合は kind: sessionExpired を記録する', async () => {
    mockGetItem.mockResolvedValue(null);
    const { configureAuthHooks } = jest.requireMock('@/lib/api/client') as {
      configureAuthHooks: jest.Mock;
    };
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    const capturedHooks = configureAuthHooks.mock.calls[0][0] as {
      onAuthFailure: (reuseDetected: boolean) => void;
    };

    capturedHooks.onAuthFailure(false);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(getLastAuthFailureReason()).toEqual({ kind: 'sessionExpired' });
    expect(getAuthStatus()).toBe('signedOut');
  });
});

// ---------------------------------------------------------------------------
// パスワードリセット
// ---------------------------------------------------------------------------

describe('requestPasswordReset', () => {
  it('成功（常に 200）: エラーなしで完了する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: { success: true as const },
      error: undefined,
    });

    await expect(requestPasswordReset('user@example.com')).resolves.toBeUndefined();
  });

  it('429: ApiError を throw する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('RATE_LIMITED', 429),
    });

    await expect(requestPasswordReset('user@example.com')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('confirmPasswordReset', () => {
  it('成功（200）: エラーなしで完了する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: { success: true as const },
      error: undefined,
    });

    await expect(
      confirmPasswordReset({
        email: 'user@example.com',
        token: 'reset-token',
        newPassword: 'NewPass1',
      })
    ).resolves.toBeUndefined();
  });

  it('401（AUTH_INVALID_CREDENTIALS）: ApiError を throw する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_INVALID_CREDENTIALS', 401),
    });

    await expect(
      confirmPasswordReset({
        email: 'user@example.com',
        token: 'invalid-token',
        newPassword: 'NewPass1',
      })
    ).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// Google サインイン
// ---------------------------------------------------------------------------

describe('signInWithGoogle', () => {
  it('成功: トークンを保存して signedIn になる', async () => {
    mockApiClientPost.mockResolvedValue({
      data: makeTokenPair(),
      error: undefined,
    });

    await signInWithGoogle('google-id-token');

    expect(getAuthStatus()).toBe('signedIn');
    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });

  it('401（AUTH_INVALID_TOKEN）: ApiError を throw する', async () => {
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_INVALID_TOKEN', 401),
    });

    await expect(signInWithGoogle('invalid-token')).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// initializeAuth の refreshTokens コールバック
// ---------------------------------------------------------------------------

describe('initializeAuth の refreshTokens コールバック', () => {
  it('リフレッシュトークンなしの場合は null を返す', async () => {
    mockGetItem.mockResolvedValue(null);
    const { configureAuthHooks } = jest.requireMock('@/lib/api/client') as {
      configureAuthHooks: jest.Mock;
    };
    const queryClient = makeQueryClient();
    await initializeAuth({ queryClient });

    const capturedHooks = configureAuthHooks.mock.calls[0][0] as {
      refreshTokens: () => Promise<string | null>;
    };

    const result = await capturedHooks.refreshTokens();
    expect(result).toBeNull();
  });

  it('リフレッシュ成功: 新しいアクセストークンを保存して返す', async () => {
    // getRefreshToken でリフレッシュトークンを返す
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'bon_log_refresh_token') return Promise.resolve('old-refresh');
      return Promise.resolve(null);
    });
    mockApiClientPost.mockResolvedValue({
      data: makeTokenPair(),
      error: undefined,
    });

    const { configureAuthHooks } = jest.requireMock('@/lib/api/client') as {
      configureAuthHooks: jest.Mock;
    };
    const queryClient = makeQueryClient();
    await initializeAuth({ queryClient });

    const capturedHooks = configureAuthHooks.mock.calls[0][0] as {
      refreshTokens: () => Promise<string | null>;
    };

    const result = await capturedHooks.refreshTokens();
    expect(result).toBe('new-access');
    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });

  it('リフレッシュ失敗（API エラー）: null を返す', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'bon_log_refresh_token') return Promise.resolve('old-refresh');
      return Promise.resolve(null);
    });
    mockApiClientPost.mockResolvedValue({
      data: undefined,
      error: makeApiError('AUTH_REFRESH_TOKEN_INVALID'),
    });

    const { configureAuthHooks } = jest.requireMock('@/lib/api/client') as {
      configureAuthHooks: jest.Mock;
    };
    const queryClient = makeQueryClient();
    await initializeAuth({ queryClient });

    const capturedHooks = configureAuthHooks.mock.calls[0][0] as {
      refreshTokens: () => Promise<string | null>;
    };

    const result = await capturedHooks.refreshTokens();
    expect(result).toBeNull();
  });
});
