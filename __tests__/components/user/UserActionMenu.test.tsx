/**
 * @module __tests__/components/user/UserActionMenu
 * UserActionMenu コンポーネントのテスト。
 * Android パス（Modal）でのメニュー項目表示分岐 / iOS パス（ActionSheetIOS）の呼び出しを検証する。
 */

import React from 'react';
import { Platform, ActionSheetIOS } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { UserActionMenu } from '@/components/user/UserActionMenu';
import {
  ERR_MUTE_FAILED,
  ERR_UNMUTE_FAILED,
  ERR_UNBLOCK_FAILED,
  ERR_MUTE_ALREADY_MUTED,
  ERR_RATE_LIMIT,
  ERR_USER_NOT_FOUND,
  ERR_FORBIDDEN,
  ERR_BLOCK_ALREADY_BLOCKED,
} from '@/lib/constants/errors';
import { ApiError } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockBlockMutate = jest.fn();
const mockUnblockMutate = jest.fn();
const mockMuteMutate = jest.fn();
const mockUnmuteMutate = jest.fn();

jest.mock('@/lib/queries/moderation', () => ({
  useBlockUserMutation: () => ({
    mutate: mockBlockMutate,
    isPending: false,
  }),
  useUnblockUserMutation: () => ({
    mutate: mockUnblockMutate,
    isPending: false,
  }),
  useMuteUserMutation: () => ({
    mutate: mockMuteMutate,
    isPending: false,
  }),
  useUnmuteUserMutation: () => ({
    mutate: mockUnmuteMutate,
    isPending: false,
  }),
  useReportMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

const mockIsOnline = { value: true };

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockIsOnline.value,
}));

// useToast をモックして showToast の呼び出しを検証できるようにする
const mockShowToast = jest.fn();
const mockHideToast = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: { message: '', visible: false, variant: 'default' as const },
    showToast: mockShowToast,
    hideToast: mockHideToast,
  }),
}));

// ActionSheetIOS のスパイ（iOS パステスト用）
const mockShowActionSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(jest.fn());

// ---------------------------------------------------------------------------
// デフォルト props
// ---------------------------------------------------------------------------

const defaultProps = {
  targetUserId: 'user-2',
  targetUserNickname: '盆栽花子',
  isOwnContent: false,
  contentType: 'post' as const,
  contentId: 'post-1',
  isBlocked: false,
  isMuted: false,
  onClose: jest.fn(),
};

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockIsOnline.value = true;
  mockShowActionSheet.mockClear();
  // テストは Android パスをデフォルトとする
  Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
});

// ---------------------------------------------------------------------------
// Android パス テスト
// ---------------------------------------------------------------------------

describe('UserActionMenu (Android)', () => {
  describe('投稿（contentType=post）のメニュー項目', () => {
    it('isOwnContent=false のとき通報・ブロック・ミュートボタンが表示される', () => {
      renderWithProviders(<UserActionMenu {...defaultProps} contentType="post" />);
      expect(screen.getByRole('button', { name: '投稿を通報' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '@盆栽花子 をブロック' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '@盆栽花子 をミュート' })).toBeTruthy();
    });

    it('ブロック済みのときはアンブロックボタンが表示され、ミュートは非表示', () => {
      renderWithProviders(<UserActionMenu {...defaultProps} contentType="post" isBlocked />);
      expect(screen.getByRole('button', { name: '@盆栽花子 のブロックを解除' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: '@盆栽花子 をミュート' })).toBeNull();
    });

    it('ミュート済みのときはアンミュートボタンが表示される', () => {
      renderWithProviders(<UserActionMenu {...defaultProps} contentType="post" isMuted />);
      expect(screen.getByRole('button', { name: '@盆栽花子 のミュートを解除' })).toBeTruthy();
    });
  });

  describe('コメント（contentType=comment）のメニュー項目', () => {
    it('コメント通報ボタンが表示される', () => {
      renderWithProviders(<UserActionMenu {...defaultProps} contentType="comment" contentId="c-1" />);
      expect(screen.getByRole('button', { name: 'コメントを通報' })).toBeTruthy();
    });
  });

  describe('ユーザー（contentType=user）のメニュー項目', () => {
    it('ユーザー通報ボタンが表示される', () => {
      renderWithProviders(<UserActionMenu {...defaultProps} contentType="user" />);
      expect(screen.getByRole('button', { name: '@盆栽花子 を通報' })).toBeTruthy();
    });
  });

  describe('isOwnContent=true', () => {
    it('自分のコンテンツのときは null が返される（何も表示されない）', () => {
      const { toJSON } = renderWithProviders(
        <UserActionMenu {...defaultProps} isOwnContent />
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('ブロック操作', () => {
    it('ブロックを選択すると確認ダイアログが表示される', async () => {
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をブロック' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ブロックする' })).toBeTruthy();
      });
    });
  });

  describe('ミュート操作', () => {
    it('ミュートを選択すると muteMutation.mutate が呼ばれる', async () => {
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をミュート' }));
      await waitFor(() => {
        expect(mockMuteMutate).toHaveBeenCalledWith(
          { userId: 'user-2' },
          expect.any(Object)
        );
      });
    });

    it('ミュート成功時のトーストが表示される', () => {
      mockMuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onSuccess: () => void }) => {
          callbacks.onSuccess();
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をミュート' }));
      expect(mockShowToast).toHaveBeenCalledWith('@盆栽花子 をミュートしました', 'default');
    });

    it('アンミュートを選択すると unmuteMutation.mutate が呼ばれる', async () => {
      renderWithProviders(<UserActionMenu {...defaultProps} isMuted />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のミュートを解除' }));
      await waitFor(() => {
        expect(mockUnmuteMutate).toHaveBeenCalledWith(
          { userId: 'user-2' },
          expect.any(Object)
        );
      });
    });

    it('アンミュート成功時のトーストが表示される', () => {
      mockUnmuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onSuccess: () => void }) => {
          callbacks.onSuccess();
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isMuted />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のミュートを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith('@盆栽花子 のミュートを解除しました', 'default');
    });
  });

  describe('アンブロック操作', () => {
    it('アンブロックを選択すると unblockMutation.mutate が呼ばれる', async () => {
      renderWithProviders(<UserActionMenu {...defaultProps} isBlocked />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のブロックを解除' }));
      await waitFor(() => {
        expect(mockUnblockMutate).toHaveBeenCalledWith(
          { userId: 'user-2' },
          expect.any(Object)
        );
      });
    });

    it('アンブロック成功時のトーストが表示される', () => {
      mockUnblockMutate.mockImplementation(
        (_params: unknown, callbacks: { onSuccess: () => void }) => {
          callbacks.onSuccess();
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isBlocked />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のブロックを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith('@盆栽花子 のブロックを解除しました', 'default');
    });
  });

  describe('ミュートエラーパス', () => {
    it('ミュートエラー（CONFLICT）で ERR_MUTE_ALREADY_MUTED でトーストが呼ばれる', () => {
      mockMuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'CONFLICT', status: 409, message: 'already muted' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をミュート' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_MUTE_ALREADY_MUTED, 'error');
    });

    it('ミュートエラー（RATE_LIMITED）で ERR_RATE_LIMIT でトーストが呼ばれる', () => {
      mockMuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をミュート' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_RATE_LIMIT, 'warning');
    });

    it('ミュートエラー（NOT_FOUND）で ERR_USER_NOT_FOUND でトーストが呼ばれる', () => {
      mockMuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をミュート' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_USER_NOT_FOUND, 'error');
    });

    it('ミュートエラー（その他 ApiError）で ERR_MUTE_FAILED でトーストが呼ばれる', () => {
      mockMuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'server error' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をミュート' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_MUTE_FAILED, 'error');
    });

    it('ミュートエラー（非 ApiError）で ERR_MUTE_FAILED でトーストが呼ばれる', () => {
      mockMuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new Error('network error'));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をミュート' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_MUTE_FAILED, 'error');
    });
  });

  describe('アンミュートエラーパス', () => {
    it('アンミュートエラー（RATE_LIMITED）で ERR_RATE_LIMIT でトーストが呼ばれる', () => {
      mockUnmuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isMuted />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のミュートを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_RATE_LIMIT, 'warning');
    });

    it('アンミュートエラー（NOT_FOUND）で ERR_USER_NOT_FOUND でトーストが呼ばれる', () => {
      mockUnmuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isMuted />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のミュートを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_USER_NOT_FOUND, 'error');
    });

    it('アンミュートエラー（その他 ApiError）で ERR_UNMUTE_FAILED でトーストが呼ばれる', () => {
      mockUnmuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'server error' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isMuted />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のミュートを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_UNMUTE_FAILED, 'error');
    });

    it('アンミュートエラー（非 ApiError）で ERR_UNMUTE_FAILED でトーストが呼ばれる', () => {
      mockUnmuteMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new Error('network error'));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isMuted />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のミュートを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_UNMUTE_FAILED, 'error');
    });
  });

  describe('ブロック確認（handleBlockConfirm）', () => {
    it('ブロック成功時のトーストが呼ばれる', async () => {
      mockBlockMutate.mockImplementation(
        (_params: unknown, callbacks: { onSuccess: () => void }) => {
          callbacks.onSuccess();
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をブロック' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ブロックする' })).toBeTruthy();
      });
      fireEvent.press(screen.getByRole('button', { name: 'ブロックする' }));
      expect(mockShowToast).toHaveBeenCalledWith('@盆栽花子 をブロックしました', 'default');
    });

    it('ブロックエラー（CONFLICT）で ERR_BLOCK_ALREADY_BLOCKED でトーストが呼ばれる', async () => {
      mockBlockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'CONFLICT', status: 409, message: 'already blocked' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をブロック' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ブロックする' })).toBeTruthy();
      });
      fireEvent.press(screen.getByRole('button', { name: 'ブロックする' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_BLOCK_ALREADY_BLOCKED, 'error');
    });

    it('ブロックエラー（RATE_LIMITED）で ERR_RATE_LIMIT でトーストが呼ばれる', async () => {
      mockBlockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をブロック' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ブロックする' })).toBeTruthy();
      });
      fireEvent.press(screen.getByRole('button', { name: 'ブロックする' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_RATE_LIMIT, 'warning');
    });

    it('ブロックエラー（NOT_FOUND）で ERR_USER_NOT_FOUND でトーストが呼ばれる', async () => {
      mockBlockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をブロック' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ブロックする' })).toBeTruthy();
      });
      fireEvent.press(screen.getByRole('button', { name: 'ブロックする' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_USER_NOT_FOUND, 'error');
    });

    it('ブロックエラー（GUEST_NOT_ALLOWED）で ERR_FORBIDDEN でトーストが呼ばれる', async () => {
      mockBlockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'GUEST_NOT_ALLOWED', status: 403, message: 'forbidden' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をブロック' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ブロックする' })).toBeTruthy();
      });
      fireEvent.press(screen.getByRole('button', { name: 'ブロックする' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_FORBIDDEN, 'error');
    });

    it('ブロックエラー（ACCOUNT_SUSPENDED）で ERR_FORBIDDEN でトーストが呼ばれる', async () => {
      mockBlockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'ACCOUNT_SUSPENDED', status: 403, message: 'suspended' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をブロック' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ブロックする' })).toBeTruthy();
      });
      fireEvent.press(screen.getByRole('button', { name: 'ブロックする' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_FORBIDDEN, 'error');
    });
  });

  describe('アンブロックエラーパス', () => {
    it('アンブロックエラー（RATE_LIMITED）で ERR_RATE_LIMIT でトーストが呼ばれる', () => {
      mockUnblockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'rate limited' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isBlocked />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のブロックを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_RATE_LIMIT, 'warning');
    });

    it('アンブロックエラー（NOT_FOUND）で ERR_USER_NOT_FOUND でトーストが呼ばれる', () => {
      mockUnblockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isBlocked />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のブロックを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_USER_NOT_FOUND, 'error');
    });

    it('アンブロックエラー（その他 ApiError）で ERR_UNBLOCK_FAILED でトーストが呼ばれる', () => {
      mockUnblockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'server error' }));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isBlocked />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のブロックを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_UNBLOCK_FAILED, 'error');
    });

    it('アンブロックエラー（非 ApiError）で ERR_UNBLOCK_FAILED でトーストが呼ばれる', () => {
      mockUnblockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError: (err: unknown) => void }) => {
          callbacks.onError(new Error('network error'));
        }
      );
      renderWithProviders(<UserActionMenu {...defaultProps} isBlocked />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 のブロックを解除' }));
      expect(mockShowToast).toHaveBeenCalledWith(ERR_UNBLOCK_FAILED, 'error');
    });
  });

  describe('通報ダイアログ', () => {
    it('通報ボタンを押すと showReportDialog 状態が true になりメニューが非表示になる', async () => {
      renderWithProviders(<UserActionMenu {...defaultProps} contentType="post" />);
      const reportButton = screen.getByRole('button', { name: '投稿を通報' });
      expect(reportButton).toBeTruthy();
      fireEvent.press(reportButton);
      // ReportDialog が表示されるとメニューの Modal が非表示になるため、メニューボタンが消える
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '投稿を通報' })).toBeNull();
      });
    });
  });

  describe('オフライン', () => {
    it('オフライン時にミュートを選択すると muteMutation は呼ばれない', () => {
      mockIsOnline.value = false;
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をミュート' }));
      expect(mockMuteMutate).not.toHaveBeenCalled();
    });

    it('オフライン時にブロックを選択すると確認ダイアログは出ない', () => {
      mockIsOnline.value = false;
      renderWithProviders(<UserActionMenu {...defaultProps} />);
      fireEvent.press(screen.getByRole('button', { name: '@盆栽花子 をブロック' }));
      expect(screen.queryByRole('button', { name: 'ブロックする' })).toBeNull();
    });
  });

  describe('キャンセル', () => {
    it('キャンセルボタンを押すと onClose が呼ばれる', () => {
      const onClose = jest.fn();
      renderWithProviders(<UserActionMenu {...defaultProps} onClose={onClose} />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// iOS パス テスト
// ---------------------------------------------------------------------------

describe('UserActionMenu (iOS)', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
  });

  it('iOS では ActionSheetIOS.showActionSheetWithOptions が呼ばれる', () => {
    renderWithProviders(<UserActionMenu {...defaultProps} />);
    expect(mockShowActionSheet).toHaveBeenCalled();
  });

  it('isOwnContent=true のとき ActionSheetIOS を呼ばず onClose が呼ばれる', () => {
    const onClose = jest.fn();
    renderWithProviders(<UserActionMenu {...defaultProps} isOwnContent onClose={onClose} />);
    expect(mockShowActionSheet).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
