/**
 * @module __tests__/lib/auth/auth-billing
 * lib/auth/auth の RevenueCat billing identify/reset 統合テスト。
 * auth.test.ts 既存テストの補完として、billing 経路のみを検証する（testing.md 規約）。
 *
 * billing.md: ログイン4経路（password/2FA/Google/initializeAuth復元）で
 * identifyBillingUser が呼ばれること、/users/me 失敗でも認証を継続すること、
 * ログアウトで resetBillingUser が呼ばれることを確認する。
 */

import { ApiError } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  initializeAuth,
  signInWithPassword,
  verifyTwoFactor,
  signOut,
  signInWithGoogle,
  resetPending2FATicketForTest,
} from '@/lib/auth/auth';
import { resetCachedAccessTokenForTest } from '@/lib/auth/token-store';
import { resetAuthStoreForTest, getAuthStatus } from '@/lib/auth/auth-store';

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

const mockUnregisterDevice = jest.fn().mockResolvedValue(undefined);
const mockCancelPendingPushRegistrations = jest.fn();
jest.mock('@/lib/push/device-registration', () => ({
  cancelPendingPushRegistrations: (...args: unknown[]) =>
    mockCancelPendingPushRegistrations(...args),
  unregisterDeviceForPushNotifications: (...args: unknown[]) =>
    mockUnregisterDevice(...args),
}));

// billing ラッパーをモック: identifyBillingUser / resetBillingUser の呼び出しを検証する
const mockIdentifyBillingUser = jest.fn().mockResolvedValue(undefined);
const mockResetBillingUser = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/billing/purchases', () => ({
  identifyBillingUser: (...args: unknown[]) => mockIdentifyBillingUser(...args),
  resetBillingUser: (...args: unknown[]) => mockResetBillingUser(...args),
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

function makeUsersMeResponse(id = 'server-user-id') {
  return {
    id,
    nickname: '松の匠',
    isPremium: false,
    avatarUrl: null,
    bio: null,
    location: null,
  };
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
  mockGetItem.mockResolvedValue(null);
  mockUnregisterDevice.mockResolvedValue(undefined);
  mockIdentifyBillingUser.mockResolvedValue(undefined);
  mockResetBillingUser.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// signInWithPassword → identifyBillingUser
// ---------------------------------------------------------------------------

describe('signInWithPassword + billing identify', () => {
  it('ログイン成功後に identifyBillingUser がサーバーユーザー ID で呼ばれる', async () => {
    // POST /api/v1/auth/login → トークン返却
    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    // GET /api/v1/users/me → ユーザー ID
    mockApiClientGet.mockResolvedValueOnce({
      data: makeUsersMeResponse('user-from-server'),
      error: undefined,
    });

    await signInWithPassword('user@example.com', 'password');

    expect(mockIdentifyBillingUser).toHaveBeenCalledWith('user-from-server');
    expect(mockIdentifyBillingUser).toHaveBeenCalledTimes(1);
  });

  it('/users/me が失敗してもログイン（signedIn 遷移）は継続する（fail-safe）', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    // /users/me エラー
    mockApiClientGet.mockResolvedValueOnce({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });

    const result = await signInWithPassword('user@example.com', 'password');

    // ログインは完了している
    expect(result).toEqual({ requires2FA: false });
    expect(getAuthStatus()).toBe('signedIn');
    // identify 失敗はログインを止めない
    expect(mockIdentifyBillingUser).not.toHaveBeenCalled();
  });

  it('identifyBillingUser が失敗してもログイン（signedIn 遷移）は継続する（fail-safe）', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    mockApiClientGet.mockResolvedValueOnce({
      data: makeUsersMeResponse(),
      error: undefined,
    });
    mockIdentifyBillingUser.mockRejectedValueOnce(new Error('RevenueCat エラー'));

    const result = await signInWithPassword('user@example.com', 'password');

    // identify が失敗してもログインは完了
    expect(result).toEqual({ requires2FA: false });
    expect(getAuthStatus()).toBe('signedIn');
  });

  it('2FA フロー（requires2FA: true）では identifyBillingUser は呼ばれない', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: { requires2FA: true as const, ticket: 'ticket-abc' },
      error: undefined,
    });

    const result = await signInWithPassword('user@example.com', 'password');

    expect(result).toEqual({ requires2FA: true });
    expect(mockIdentifyBillingUser).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// verifyTwoFactor → identifyBillingUser
// ---------------------------------------------------------------------------

describe('verifyTwoFactor + billing identify', () => {
  it('2FA 成功後に identifyBillingUser が呼ばれる', async () => {
    // 2FA チケットをセットアップ
    mockApiClientPost.mockResolvedValueOnce({
      data: { requires2FA: true as const, ticket: 'ticket-xyz' },
      error: undefined,
    });
    await signInWithPassword('user@example.com', 'password');

    // 2FA 検証成功
    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    // GET /users/me
    mockApiClientGet.mockResolvedValueOnce({
      data: makeUsersMeResponse('user-2fa'),
      error: undefined,
    });

    await verifyTwoFactor('123456');

    expect(mockIdentifyBillingUser).toHaveBeenCalledWith('user-2fa');
    expect(mockIdentifyBillingUser).toHaveBeenCalledTimes(1);
  });

  it('2FA 成功後の /users/me 失敗でもログイン継続（fail-safe）', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: { requires2FA: true as const, ticket: 'ticket-xyz' },
      error: undefined,
    });
    await signInWithPassword('user@example.com', 'password');

    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    mockApiClientGet.mockResolvedValueOnce({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });

    await verifyTwoFactor('123456');

    // ログイン完了
    expect(getAuthStatus()).toBe('signedIn');
    expect(mockIdentifyBillingUser).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// signInWithGoogle → identifyBillingUser
// ---------------------------------------------------------------------------

describe('signInWithGoogle + billing identify', () => {
  it('Google ログイン成功後に identifyBillingUser が呼ばれる', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    mockApiClientGet.mockResolvedValueOnce({
      data: makeUsersMeResponse('google-user-id'),
      error: undefined,
    });

    await signInWithGoogle('google-id-token');

    expect(mockIdentifyBillingUser).toHaveBeenCalledWith('google-user-id');
    expect(mockIdentifyBillingUser).toHaveBeenCalledTimes(1);
  });

  it('Google ログイン後の /users/me 失敗でもログイン継続（fail-safe）', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    mockApiClientGet.mockResolvedValueOnce({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });

    await signInWithGoogle('google-id-token');

    // ログイン完了
    expect(getAuthStatus()).toBe('signedIn');
  });

  it('identifyBillingUser が失敗してもログイン継続（fail-safe）', async () => {
    mockApiClientPost.mockResolvedValueOnce({
      data: makeTokenPair(),
      error: undefined,
    });
    mockApiClientGet.mockResolvedValueOnce({
      data: makeUsersMeResponse(),
      error: undefined,
    });
    mockIdentifyBillingUser.mockRejectedValueOnce(new Error('RevenueCat ログインエラー'));

    await signInWithGoogle('google-id-token');

    expect(getAuthStatus()).toBe('signedIn');
  });
});

// ---------------------------------------------------------------------------
// initializeAuth（保存済みトークン復元）→ identifyBillingUser
// ---------------------------------------------------------------------------

describe('initializeAuth（セッション復元）+ billing identify', () => {
  it('保存済みトークンがある場合 identifyBillingUser が呼ばれる', async () => {
    // アクセストークンが保存されている状態
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'bon_log_access_token') return Promise.resolve('saved-access-token');
      return Promise.resolve(null);
    });
    mockApiClientGet.mockResolvedValueOnce({
      data: makeUsersMeResponse('restored-user'),
      error: undefined,
    });
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    expect(getAuthStatus()).toBe('signedIn');
    expect(mockIdentifyBillingUser).toHaveBeenCalledWith('restored-user');
  });

  it('保存済みトークンがない場合は identifyBillingUser は呼ばれない', async () => {
    mockGetItem.mockResolvedValue(null);
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    expect(getAuthStatus()).toBe('signedOut');
    expect(mockIdentifyBillingUser).not.toHaveBeenCalled();
  });

  it('セッション復元後の /users/me 失敗でも signedIn 状態は維持される（fail-safe）', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'bon_log_access_token') return Promise.resolve('saved-access-token');
      return Promise.resolve(null);
    });
    mockApiClientGet.mockResolvedValueOnce({
      data: undefined,
      error: makeApiError('AUTH_REQUIRED', 401),
    });
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    // セッション復元は完了している
    expect(getAuthStatus()).toBe('signedIn');
    expect(mockIdentifyBillingUser).not.toHaveBeenCalled();
  });

  it('identifyBillingUser が例外を throw してもセッション復元は継続する（fail-safe）', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'bon_log_access_token') return Promise.resolve('saved-access-token');
      return Promise.resolve(null);
    });
    mockApiClientGet.mockResolvedValueOnce({
      data: makeUsersMeResponse(),
      error: undefined,
    });
    mockIdentifyBillingUser.mockRejectedValueOnce(new Error('RevenueCat 初期化エラー'));
    const queryClient = makeQueryClient();

    await initializeAuth({ queryClient });

    // signedIn 状態は維持
    expect(getAuthStatus()).toBe('signedIn');
  });
});

// ---------------------------------------------------------------------------
// signOut → resetBillingUser
// ---------------------------------------------------------------------------

describe('signOut + resetBillingUser', () => {
  it('ログアウト時に resetBillingUser が呼ばれる', async () => {
    mockGetItem.mockResolvedValue('refresh-token');
    mockApiClientPost.mockResolvedValue({ data: { success: true as const }, error: undefined });

    const queryClient = makeQueryClient();
    await signOut(queryClient);

    expect(mockResetBillingUser).toHaveBeenCalledTimes(1);
  });

  it('resetBillingUser が失敗してもトークン削除・状態遷移は完了する（fail-safe）', async () => {
    mockGetItem.mockResolvedValue('refresh-token');
    mockApiClientPost.mockResolvedValue({ data: { success: true as const }, error: undefined });
    mockResetBillingUser.mockRejectedValueOnce(new Error('RevenueCat reset エラー'));

    const queryClient = makeQueryClient();
    await signOut(queryClient);

    expect(mockDeleteItem).toHaveBeenCalledTimes(2);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(getAuthStatus()).toBe('signedOut');
  });

  it('logout API が失敗しても resetBillingUser は呼ばれる', async () => {
    mockGetItem.mockResolvedValue('refresh-token');
    mockApiClientPost.mockRejectedValue(new Error('ネットワークエラー'));

    const queryClient = makeQueryClient();
    await signOut(queryClient);

    expect(mockResetBillingUser).toHaveBeenCalledTimes(1);
    expect(getAuthStatus()).toBe('signedOut');
  });
});
