/**
 * @module __tests__/components/user/FollowButton
 * FollowButton コンポーネントのテスト。
 * 3状態表示・pressIn フィードバック・未認証/オフライン/エラー対応・compact サイズを検証する。
 * モック境界: lib/api/client（ネットワーク不使用）。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { FollowButton } from '@/components/user/FollowButton';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_OFFLINE_ACTION,
  ERR_RATE_LIMIT,
  ERR_USER_NOT_FOUND,
  ERR_FORBIDDEN,
  ERR_FOLLOW_FAILED,
} from '@/lib/constants/errors';
import { ROUTE_LOGIN } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// モック設定（lib/api/client 境界）
// ---------------------------------------------------------------------------

const mockApiClientPost = jest.fn();
const mockApiClientDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: (...args: unknown[]) => mockApiClientPost(...args),
    DELETE: (...args: unknown[]) => mockApiClientDelete(...args),
    PATCH: jest.fn(),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

// router.push の呼び出しを監視する（setup.ts のモック参照と同一）
const getRouterPushMock = () => jest.requireMock('expo-router').router.push as jest.Mock;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type RenderProps = {
  targetUserId?: string;
  isPublic?: boolean;
  following?: boolean;
  requested?: boolean;
  currentUserId?: string | undefined;
  size?: 'default' | 'compact';
  targetNickname?: string;
};

function renderFollowButton(props: RenderProps = {}) {
  const targetUserId = props.targetUserId ?? 'user-2';
  const isPublic = props.isPublic ?? true;
  const following = props.following ?? false;
  const requested = props.requested ?? false;
  // undefined を明示的に渡したとき（未認証テスト）は undefined を保持する。
  // 分割代入デフォルトは undefined に適用されてしまうため、in 演算子でキーの有無を判定する。
  const currentUserId = 'currentUserId' in props ? props.currentUserId : 'me-1';
  const size = props.size ?? 'default';
  const targetNickname = props.targetNickname ?? '盆栽花子';

  return renderWithProviders(
    <FollowButton
      targetUserId={targetUserId}
      isPublic={isPublic}
      following={following}
      requested={requested}
      currentUserId={currentUserId}
      size={size}
      targetNickname={targetNickname}
    />
  );
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// 3状態の表示
// ---------------------------------------------------------------------------

describe('FollowButton — 3状態表示', () => {
  it('未フォロー状態（following=false, requested=false）のとき「フォロー」が表示される', () => {
    renderFollowButton({ following: false, requested: false });
    expect(screen.getByText('フォロー')).toBeTruthy();
  });

  it('申請中状態（following=false, requested=true）のとき「申請中」が表示される', () => {
    renderFollowButton({ following: false, requested: true });
    expect(screen.getByText('申請中')).toBeTruthy();
  });

  it('フォロー中状態（following=true, requested=false）のとき「フォロー中」が表示される', () => {
    renderFollowButton({ following: true, requested: false });
    expect(screen.getByText('フォロー中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// accessibilityLabel
// ---------------------------------------------------------------------------

describe('FollowButton — accessibilityLabel', () => {
  it('未フォロー: accessibilityLabel に「をフォローする」が含まれる', () => {
    renderFollowButton({ following: false, requested: false, targetNickname: '盆栽花子' });
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityLabel).toBe('盆栽花子 をフォローする');
  });

  it('申請中: accessibilityLabel に「フォローリクエストを取り消す」が含まれる', () => {
    renderFollowButton({ following: false, requested: true, targetNickname: '盆栽花子' });
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityLabel).toBe('盆栽花子 へのフォローリクエストを取り消す');
  });

  it('フォロー中: accessibilityLabel に「フォローを解除する」が含まれる', () => {
    renderFollowButton({ following: true, requested: false, targetNickname: '盆栽花子' });
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityLabel).toBe('盆栽花子 のフォローを解除する');
  });

  it('targetNickname 未指定のとき「このユーザー」がラベルに使われる', () => {
    renderWithProviders(
      <FollowButton
        targetUserId="user-2"
        isPublic
        following={false}
        requested={false}
        currentUserId="me-1"
      />
    );
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityLabel).toContain('このユーザー');
  });
});

// ---------------------------------------------------------------------------
// pressIn フィードバック
// ---------------------------------------------------------------------------

describe('FollowButton — pressIn フィードバック', () => {
  it('フォロー中にpressInすると「フォローを解除」に変わる（default サイズ）', () => {
    renderFollowButton({ following: true, requested: false, size: 'default' });
    const btn = screen.getByRole('button');
    fireEvent(btn, 'pressIn');
    expect(screen.getByText('フォローを解除')).toBeTruthy();
  });

  it('申請中にpressInすると「申請を取り消す」に変わる（default サイズ）', () => {
    renderFollowButton({ following: false, requested: true, size: 'default' });
    const btn = screen.getByRole('button');
    fireEvent(btn, 'pressIn');
    expect(screen.getByText('申請を取り消す')).toBeTruthy();
  });

  it('フォロー中にpressInすると「解除」に変わる（compact サイズ）', () => {
    renderFollowButton({ following: true, requested: false, size: 'compact' });
    const btn = screen.getByRole('button');
    fireEvent(btn, 'pressIn');
    expect(screen.getByText('解除')).toBeTruthy();
  });

  it('申請中にpressInすると「取消」に変わる（compact サイズ）', () => {
    renderFollowButton({ following: false, requested: true, size: 'compact' });
    const btn = screen.getByRole('button');
    fireEvent(btn, 'pressIn');
    expect(screen.getByText('取消')).toBeTruthy();
  });

  it('pressOut 後は元のラベルに戻る', () => {
    renderFollowButton({ following: true, requested: false });
    const btn = screen.getByRole('button');
    fireEvent(btn, 'pressIn');
    expect(screen.getByText('フォローを解除')).toBeTruthy();
    fireEvent(btn, 'pressOut');
    expect(screen.getByText('フォロー中')).toBeTruthy();
  });

  it('未フォロー状態は pressIn してもラベルが変わらない', () => {
    renderFollowButton({ following: false, requested: false });
    const btn = screen.getByRole('button');
    fireEvent(btn, 'pressIn');
    expect(screen.getByText('フォロー')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップで mutate が正しい引数で呼ばれる
// ---------------------------------------------------------------------------

describe('FollowButton — タップで mutate 呼び出し', () => {
  it('未フォローをタップ → POST が呼ばれる（isActive=false）', async () => {
    mockApiClientPost.mockResolvedValue({
      data: { following: true, requested: false, followerCount: 51 },
      error: undefined,
    });
    renderFollowButton({ following: false, requested: false, isPublic: true });
    const btn = screen.getByRole('button');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(mockApiClientPost).toHaveBeenCalledWith('/api/v1/users/{id}/follow', {
        params: { path: { id: 'user-2' } },
      });
    });
    expect(mockApiClientDelete).not.toHaveBeenCalled();
  });

  it('フォロー中をタップ → DELETE が呼ばれる（isActive=true）', async () => {
    mockApiClientDelete.mockResolvedValue({
      data: { following: false, requested: false, followerCount: 49 },
      error: undefined,
    });
    renderFollowButton({ following: true, requested: false, isPublic: true });
    const btn = screen.getByRole('button');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/users/{id}/follow', {
        params: { path: { id: 'user-2' } },
      });
    });
    expect(mockApiClientPost).not.toHaveBeenCalled();
  });

  it('申請中をタップ → DELETE が呼ばれる（isActive=true）', async () => {
    mockApiClientDelete.mockResolvedValue({
      data: { following: false, requested: false, followerCount: 50 },
      error: undefined,
    });
    renderFollowButton({ following: false, requested: true, isPublic: false });
    const btn = screen.getByRole('button');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(mockApiClientDelete).toHaveBeenCalledWith('/api/v1/users/{id}/follow', {
        params: { path: { id: 'user-2' } },
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 未認証（currentUserId=undefined）→ ログイン遷移
// ---------------------------------------------------------------------------

describe('FollowButton — 未認証', () => {
  it('currentUserId=undefined のときタップで router.push(ROUTE_LOGIN) が呼ばれ mutate しない', async () => {
    const routerPushMock = getRouterPushMock();
    renderFollowButton({ currentUserId: undefined, following: false });
    const btn = screen.getByRole('button');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(ROUTE_LOGIN);
    });
    expect(mockApiClientPost).not.toHaveBeenCalled();
    expect(mockApiClientDelete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// オフライン → mutate しない + ERR_OFFLINE_ACTION トースト
// ---------------------------------------------------------------------------

describe('FollowButton — オフライン', () => {
  it('オフライン時にタップすると mutate が呼ばれず ERR_OFFLINE_ACTION トーストが表示される', async () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderFollowButton({ following: false });
    const btn = screen.getByRole('button');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(screen.getByText(ERR_OFFLINE_ACTION)).toBeTruthy();
    });
    expect(mockApiClientPost).not.toHaveBeenCalled();
    expect(mockApiClientDelete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// エラーハンドリング
// ---------------------------------------------------------------------------

describe('FollowButton — エラーハンドリング', () => {
  it('429 RATE_LIMITED → ERR_RATE_LIMIT トーストが表示される', async () => {
    const err = new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited' });
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    renderFollowButton({ following: false });
    fireEvent.press(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(ERR_RATE_LIMIT)).toBeTruthy();
    });
  });

  it('404 NOT_FOUND → ERR_USER_NOT_FOUND トーストが表示される', async () => {
    const err = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' });
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    renderFollowButton({ following: false });
    fireEvent.press(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });
  });

  it('403 GUEST_NOT_ALLOWED → ERR_FORBIDDEN トーストが表示される', async () => {
    const err = new ApiError({ code: 'GUEST_NOT_ALLOWED', status: 403, message: 'forbidden' });
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    renderFollowButton({ following: false });
    fireEvent.press(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(ERR_FORBIDDEN)).toBeTruthy();
    });
  });

  it('403 ACCOUNT_SUSPENDED → ERR_FORBIDDEN トーストが表示される', async () => {
    const err = new ApiError({ code: 'ACCOUNT_SUSPENDED', status: 403, message: 'suspended' });
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    renderFollowButton({ following: false });
    fireEvent.press(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(ERR_FORBIDDEN)).toBeTruthy();
    });
  });

  it('その他の ApiError → ERR_FOLLOW_FAILED トーストが表示される', async () => {
    const err = new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'server error' });
    mockApiClientPost.mockResolvedValue({ data: undefined, error: err });
    renderFollowButton({ following: false });
    fireEvent.press(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(ERR_FOLLOW_FAILED)).toBeTruthy();
    });
  });

  it('非 ApiError → ERR_FOLLOW_FAILED トーストが表示される', async () => {
    mockApiClientPost.mockRejectedValue(new Error('Network error'));
    renderFollowButton({ following: false });
    fireEvent.press(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(ERR_FOLLOW_FAILED)).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// ローディング中 disabled / busy
// ---------------------------------------------------------------------------

describe('FollowButton — ローディング状態', () => {
  it('API 呼び出し中はボタンが accessibilityState.disabled になる', async () => {
    // pending のまま返さない Promise でローディング状態を維持する
    let resolvePost!: (value: unknown) => void;
    mockApiClientPost.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));

    renderFollowButton({ following: false });
    const btn = screen.getByRole('button');
    fireEvent.press(btn);

    await waitFor(() => {
      expect(screen.getByRole('button').props.accessibilityState?.disabled).toBe(true);
    });

    resolvePost({ data: { following: true, requested: false, followerCount: 51 }, error: undefined });
  });

  it('API 呼び出し中は accessibilityState.busy が true になる', async () => {
    let resolvePost!: (value: unknown) => void;
    mockApiClientPost.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));

    renderFollowButton({ following: false });
    const btn = screen.getByRole('button');
    fireEvent.press(btn);

    await waitFor(() => {
      expect(screen.getByRole('button').props.accessibilityState?.busy).toBe(true);
    });

    resolvePost({ data: { following: true, requested: false, followerCount: 51 }, error: undefined });
  });
});

// ---------------------------------------------------------------------------
// compact サイズ
// ---------------------------------------------------------------------------

describe('FollowButton — compact サイズ', () => {
  it('compact サイズで未フォロー状態「フォロー」が表示される', () => {
    renderFollowButton({ size: 'compact', following: false, requested: false });
    expect(screen.getByText('フォロー')).toBeTruthy();
  });

  it('compact サイズで申請中「申請中」が表示される', () => {
    renderFollowButton({ size: 'compact', following: false, requested: true });
    expect(screen.getByText('申請中')).toBeTruthy();
  });

  it('compact サイズで押下フィードバックがコンパクト文言になる', () => {
    renderFollowButton({ size: 'compact', following: true, requested: false });
    const btn = screen.getByRole('button');
    fireEvent(btn, 'pressIn');
    expect(screen.getByText('解除')).toBeTruthy();
  });
});
