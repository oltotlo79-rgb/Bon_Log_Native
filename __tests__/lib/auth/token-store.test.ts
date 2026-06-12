/**
 * lib/auth/token-store のユニットテスト。
 * expo-secure-store はセットアップで一元モックする（testing.md 規約）。
 */

import {
  saveAccessToken,
  getAccessToken,
  deleteAccessToken,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  saveTokenPair,
  deleteTokenPair,
  resetCachedAccessTokenForTest,
} from '@/lib/auth/token-store';

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();
const mockDeleteItem = jest.fn();

jest.mock('expo-secure-store', () => ({
  setItemAsync: (...args: unknown[]) => mockSetItem(...args),
  getItemAsync: (...args: unknown[]) => mockGetItem(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItem(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetCachedAccessTokenForTest();
});

describe('saveAccessToken / getAccessToken', () => {
  it('保存後に getAccessToken がメモリキャッシュから値を返す', async () => {
    mockSetItem.mockResolvedValue(undefined);

    await saveAccessToken('access-token-value');
    const token = await getAccessToken();

    expect(token).toBe('access-token-value');
    // メモリキャッシュがあるため secure-store の getItemAsync は呼ばれない
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('メモリキャッシュがない場合は secure-store から読み込む', async () => {
    mockGetItem.mockResolvedValue('stored-access-token');

    const token = await getAccessToken();

    expect(token).toBe('stored-access-token');
    expect(mockGetItem).toHaveBeenCalledTimes(1);
  });

  it('secure-store に値がなければ null を返す', async () => {
    mockGetItem.mockResolvedValue(null);

    const token = await getAccessToken();

    expect(token).toBeNull();
  });
});

describe('deleteAccessToken', () => {
  it('削除後は getAccessToken が null を返す', async () => {
    mockSetItem.mockResolvedValue(undefined);
    mockDeleteItem.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);

    await saveAccessToken('token');
    await deleteAccessToken();
    const token = await getAccessToken();

    expect(token).toBeNull();
  });
});

describe('saveRefreshToken / getRefreshToken', () => {
  it('保存して取得できる', async () => {
    mockSetItem.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue('refresh-token-value');

    await saveRefreshToken('refresh-token-value');
    const token = await getRefreshToken();

    expect(token).toBe('refresh-token-value');
  });
});

describe('deleteRefreshToken', () => {
  it('deleteItemAsync を呼ぶ', async () => {
    mockDeleteItem.mockResolvedValue(undefined);

    await deleteRefreshToken();

    expect(mockDeleteItem).toHaveBeenCalledTimes(1);
  });
});

describe('saveTokenPair', () => {
  it('アクセストークンとリフレッシュトークンを両方保存する', async () => {
    mockSetItem.mockResolvedValue(undefined);

    await saveTokenPair({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });
});

describe('deleteTokenPair', () => {
  it('アクセストークンとリフレッシュトークンを両方削除する', async () => {
    mockDeleteItem.mockResolvedValue(undefined);

    await deleteTokenPair();

    expect(mockDeleteItem).toHaveBeenCalledTimes(2);
  });
});
