/**
 * app/follow-requests/index のテスト。
 * 4状態（ローディング/空/エラー/オフライン）、承認・拒否操作、無限スクロールを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import FollowRequestsScreen from '@/app/follow-requests/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeFollowRequestItem } from '@/__tests__/utils/data-factories';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_FOLLOW_REQUESTS_LOAD_FAILED,
  ERR_FOLLOW_REQUEST_APPROVE_FAILED,
  ERR_FOLLOW_REQUEST_REJECT_FAILED,
  ERR_NOT_FOUND,
  ERR_RATE_LIMIT,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseFollowRequestsQuery = jest.fn();
const mockApproveMutate = jest.fn();
const mockRejectMutate = jest.fn();

jest.mock('@/lib/queries/follows', () => ({
  useFollowRequestsQuery: () => mockUseFollowRequestsQuery(),
  useApproveFollowRequestMutation: () => ({
    mutate: (...args: Parameters<typeof mockApproveMutate>) => mockApproveMutate(...args),
    isPending: false,
  }),
  useRejectFollowRequestMutation: () => ({
    mutate: (...args: Parameters<typeof mockRejectMutate>) => mockRejectMutate(...args),
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// デフォルト状態
// ---------------------------------------------------------------------------

const defaultQueryState = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

function makeRequestsPage(requests: ReturnType<typeof makeFollowRequestItem>[], nextCursor: string | null) {
  return {
    pages: [{ requests, nextCursor }],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseFollowRequestsQuery.mockReturnValue(defaultQueryState);
});

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('FollowRequestsScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のときヘッダーが表示される', () => {
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        isLoading: true,
      });
      renderWithProviders(<FollowRequestsScreen />);
      expect(screen.getByRole('header', { name: 'フォローリクエスト' })).toBeTruthy();
    });

    it('isLoading=true のときスケルトンが表示される（リクエスト行は表示されない）', () => {
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        isLoading: true,
      });
      renderWithProviders(<FollowRequestsScreen />);
      expect(screen.queryByRole('button', { name: /のプロフィールを表示する/ })).toBeNull();
    });
  });

  describe('空状態', () => {
    it('リクエストが 0 件のとき空状態メッセージが表示される', () => {
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([], null),
      });
      renderWithProviders(<FollowRequestsScreen />);
      expect(screen.getByText('承認待ちのフォローリクエストはありません')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のときエラーメッセージが表示される', () => {
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        isError: true,
        error: new Error('load error'),
      });
      renderWithProviders(<FollowRequestsScreen />);
      expect(screen.getByText(ERR_FOLLOW_REQUESTS_LOAD_FAILED)).toBeTruthy();
    });
  });

  describe('オフライン エラー状態', () => {
    it('オフライン中かつデータなしのとき ERR_OFFLINE_ACTION が表示される', () => {
      const { useOnlineStatus } = jest.requireMock<{ useOnlineStatus: jest.Mock }>('@/hooks/use-online-status');
      useOnlineStatus.mockReturnValue(false);

      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        isError: true,
        error: new Error('offline'),
        data: undefined,
      });
      renderWithProviders(<FollowRequestsScreen />);
      expect(screen.getByText(ERR_OFFLINE_ACTION)).toBeTruthy();

      useOnlineStatus.mockReturnValue(true);
    });
  });

  describe('一覧表示', () => {
    it('リクエストが存在するとき申請者のニックネームが表示される', () => {
      const request = makeFollowRequestItem({
        requester: { id: 'r-1', nickname: '松太郎', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);
      expect(screen.getByText('松太郎')).toBeTruthy();
    });

    it('複数件のリクエストが表示される', () => {
      const req1 = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者1', avatarUrl: null, bio: null },
      });
      const req2 = makeFollowRequestItem({
        id: 'req-2',
        requester: { id: 'r-2', nickname: '申請者2', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([req1, req2], null),
      });
      renderWithProviders(<FollowRequestsScreen />);
      expect(screen.getByText('申請者1')).toBeTruthy();
      expect(screen.getByText('申請者2')).toBeTruthy();
    });
  });

  describe('承認操作', () => {
    it('承認ボタン押下で approveMutation.mutate が呼ばれる', async () => {
      mockApproveMutate.mockImplementation(() => undefined);
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-approve'));
      });

      expect(mockApproveMutate).toHaveBeenCalledWith(
        { requestId: 'req-1', requesterId: 'r-1' },
        expect.any(Object)
      );
    });

    it('承認成功でトーストが表示される', async () => {
      mockApproveMutate.mockImplementation(
        (_vars: unknown, opts?: { onSuccess?: () => void }) => {
          opts?.onSuccess?.();
        }
      );
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '花子', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-approve'));
      });

      await waitFor(() => {
        expect(screen.queryByText('@花子 のフォローリクエストを承認しました')).toBeTruthy();
      });
    });

    it('承認 404 エラーでエラートーストが表示される', async () => {
      const err = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' });
      mockApproveMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(err);
        }
      );
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-approve'));
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_NOT_FOUND)).toBeTruthy();
      });
    });

    it('承認 429 エラーでレート制限トーストが表示される', async () => {
      const err = new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited' });
      mockApproveMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(err);
        }
      );
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-approve'));
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_RATE_LIMIT)).toBeTruthy();
      });
    });

    it('承認汎用エラーで ERR_FOLLOW_REQUEST_APPROVE_FAILED トーストが表示される', async () => {
      const err = new Error('unknown error');
      mockApproveMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(err);
        }
      );
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-approve'));
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_FOLLOW_REQUEST_APPROVE_FAILED)).toBeTruthy();
      });
    });
  });

  describe('拒否操作', () => {
    it('拒否ボタン押下で rejectMutation.mutate が呼ばれる', async () => {
      mockRejectMutate.mockImplementation(() => undefined);
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-reject'));
      });

      expect(mockRejectMutate).toHaveBeenCalledWith(
        { requestId: 'req-1' },
        expect.any(Object)
      );
    });

    it('拒否成功でトーストが表示される', async () => {
      mockRejectMutate.mockImplementation(
        (_vars: unknown, opts?: { onSuccess?: () => void }) => {
          opts?.onSuccess?.();
        }
      );
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '次郎', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-reject'));
      });

      await waitFor(() => {
        expect(screen.queryByText('@次郎 のフォローリクエストを拒否しました')).toBeTruthy();
      });
    });

    it('拒否 404 エラーでエラートーストが表示される', async () => {
      const err = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' });
      mockRejectMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(err);
        }
      );
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-reject'));
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_NOT_FOUND)).toBeTruthy();
      });
    });

    it('拒否汎用エラーで ERR_FOLLOW_REQUEST_REJECT_FAILED トーストが表示される', async () => {
      const err = new Error('unknown error');
      mockRejectMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(err);
        }
      );
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-reject'));
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_FOLLOW_REQUEST_REJECT_FAILED)).toBeTruthy();
      });
    });
  });

  describe('オフライン中の操作抑止', () => {
    it('オフライン中に承認ボタンを押すと ERR_OFFLINE_ACTION トーストが表示される', async () => {
      const { useOnlineStatus } = jest.requireMock<{ useOnlineStatus: jest.Mock }>('@/hooks/use-online-status');
      useOnlineStatus.mockReturnValue(false);

      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-approve'));
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_OFFLINE_ACTION)).toBeTruthy();
      });
      expect(mockApproveMutate).not.toHaveBeenCalled();

      useOnlineStatus.mockReturnValue(true);
    });

    it('オフライン中に拒否ボタンを押すと ERR_OFFLINE_ACTION トーストが表示される', async () => {
      const { useOnlineStatus } = jest.requireMock<{ useOnlineStatus: jest.Mock }>('@/hooks/use-online-status');
      useOnlineStatus.mockReturnValue(false);

      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-1', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('follow-request-reject'));
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_OFFLINE_ACTION)).toBeTruthy();
      });
      expect(mockRejectMutate).not.toHaveBeenCalled();

      useOnlineStatus.mockReturnValue(true);
    });
  });

  describe('無限スクロール', () => {
    it('hasNextPage=true のとき onEndReached が fetchNextPage を呼ぶ', () => {
      const fetchNextPage = jest.fn();
      const request = makeFollowRequestItem();
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], 'cursor-abc'),
        hasNextPage: true,
        fetchNextPage,
      });
      renderWithProviders(<FollowRequestsScreen />);
      expect(fetchNextPage).not.toHaveBeenCalled();
    });
  });

  describe('ユーザープロフィール遷移', () => {
    it('行タップで router.push が userDetail パスで呼ばれる', async () => {
      const request = makeFollowRequestItem({
        id: 'req-1',
        requester: { id: 'r-99', nickname: '申請者', avatarUrl: null, bio: null },
      });
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([request], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: '申請者 のプロフィールを表示する' })
        );
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/users/r-99');
    });
  });

  describe('戻るボタン', () => {
    it('「戻る」ボタン押下で router.back が呼ばれる', () => {
      mockUseFollowRequestsQuery.mockReturnValue({
        ...defaultQueryState,
        data: makeRequestsPage([], null),
      });
      renderWithProviders(<FollowRequestsScreen />);

      fireEvent.press(screen.getByRole('button', { name: '戻る' }));

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });
});
