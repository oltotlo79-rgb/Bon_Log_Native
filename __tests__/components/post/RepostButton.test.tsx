/**
 * @module __tests__/components/post/RepostButton
 * RepostButton コンポーネントのユニットテスト。
 * モック境界: useToggleRepostMutation をモック。ネットワークに出ない。
 * 件数表示・アクティブ状態・メニュー選択・ミューテーション呼び出し・遷移・未認証を検証する。
 */

import React from 'react';
import { Platform, Alert, type AlertButton } from 'react-native';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { RepostButton } from '@/components/post/RepostButton';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_RATE_LIMIT,
  ERR_OFFLINE_ACTION,
  ERR_GENERIC,
} from '@/lib/constants/errors';
import { ROUTE_LOGIN, routePostQuote } from '@/lib/constants/routes';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockMutate = jest.fn();

jest.mock('@/lib/queries/posts', () => ({
  useToggleRepostMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

const mockRouterPush = jest.requireMock('expo-router').router.push as jest.Mock;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type Props = React.ComponentProps<typeof RepostButton>;

function renderRepostButton(props?: Partial<Props>) {
  const defaultProps: Props = {
    postId: 'post-1',
    isReposted: false,
    repostCount: 0,
    currentUserId: 'user-1',
    ...props,
  };
  return renderWithProviders(<RepostButton {...defaultProps} />);
}

/**
 * Alert.alert をモックしてボタンインデックスを選択するヘルパー。
 * Android では Alert を使う。
 */
function pressAlertButton(buttonText: string) {
  const alertSpy = jest.spyOn(Alert, 'alert');
  return { alertSpy, buttonText };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('RepostButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Android を前提にする（Alert.alert 経由のメニュー）
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    act(() => {
      onlineManager.setOnline(true);
    });
  });

  afterEach(() => {
    act(() => {
      onlineManager.setOnline(true);
    });
  });

  // -------------------------------------------------------------------------
  // 件数とアクティブ表示
  // -------------------------------------------------------------------------

  describe('件数とアクティブ表示', () => {
    it('repostCount=0 のとき件数テキストが表示されない', () => {
      renderRepostButton({ repostCount: 0 });
      expect(screen.queryByText('0')).toBeNull();
    });

    it('repostCount=5 のとき「5」が表示される', () => {
      renderRepostButton({ repostCount: 5 });
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('repostCount=999 のとき「999」が表示される（境界値）', () => {
      renderRepostButton({ repostCount: 999 });
      expect(screen.getByText('999')).toBeTruthy();
    });

    it('isReposted=false のとき accessibilityState.checked が false', () => {
      renderRepostButton({ isReposted: false, repostCount: 3 });
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ checked: false })
      );
    });

    it('isReposted=true のとき accessibilityState.checked が true', () => {
      renderRepostButton({ isReposted: true, repostCount: 3 });
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ checked: true })
      );
    });

    it('未認証のとき accessibilityLabel に「ログインして」が含まれる', () => {
      renderRepostButton({ currentUserId: undefined, repostCount: 3 });
      expect(
        screen.getByRole('button', { name: 'ログインしてリポストする。現在 3 件' })
      ).toBeTruthy();
    });

    it('isReposted=true のとき accessibilityLabel に「リポスト済み」が含まれる', () => {
      renderRepostButton({ isReposted: true, repostCount: 5 });
      expect(
        screen.getByRole('button', { name: 'リポスト済み。現在 5 件。メニューを開く' })
      ).toBeTruthy();
    });

    it('isReposted=false のとき accessibilityLabel に「リポストする」が含まれる', () => {
      renderRepostButton({ isReposted: false, repostCount: 5 });
      expect(
        screen.getByRole('button', { name: 'リポストする。現在 5 件。メニューを開く' })
      ).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 未認証タップ → ログイン遷移
  // -------------------------------------------------------------------------

  describe('未認証タップ', () => {
    it('currentUserId=undefined でタップ → router.push(ROUTE_LOGIN) が呼ばれる', () => {
      renderRepostButton({ currentUserId: undefined, repostCount: 0 });
      fireEvent.press(
        screen.getByRole('button', { name: 'ログインしてリポストする。現在 0 件' })
      );
      expect(mockRouterPush).toHaveBeenCalledWith(ROUTE_LOGIN);
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // メニュー表示（Android: Alert.alert）
  // -------------------------------------------------------------------------

  describe('メニュー選択 (Android)', () => {
    it('タップで Alert.alert が呼ばれる', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderRepostButton({ isReposted: false });
      fireEvent.press(
        screen.getByRole('button', { name: 'リポストする。現在 0 件。メニューを開く' })
      );
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it('isReposted=false のとき Alert のボタンに「リポスト」が含まれる', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderRepostButton({ isReposted: false });
      fireEvent.press(
        screen.getByRole('button', { name: 'リポストする。現在 0 件。メニューを開く' })
      );
      const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
      expect(buttons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'リポスト' }),
          expect.objectContaining({ text: '引用' }),
          expect.objectContaining({ text: 'キャンセル' }),
        ])
      );
    });

    it('isReposted=true のとき Alert のボタンに「リポストを取り消す」が含まれる', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderRepostButton({ isReposted: true, repostCount: 3 });
      fireEvent.press(
        screen.getByRole('button', { name: 'リポスト済み。現在 3 件。メニューを開く' })
      );
      const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
      expect(buttons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'リポストを取り消す' }),
        ])
      );
    });

    it('「リポスト」ボタンを押すと useToggleRepostMutation.mutate が呼ばれる', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderRepostButton({ isReposted: false, postId: 'post-abc' });
      fireEvent.press(
        screen.getByRole('button', { name: 'リポストする。現在 0 件。メニューを開く' })
      );
      const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
      const repostButton = buttons?.find(
        (b) => b.text === 'リポスト'
      );
      act(() => {
        repostButton?.onPress?.();
      });
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        { postId: 'post-abc', reposted: false },
        expect.any(Object)
      );
    });

    it('「引用」ボタンを押すと routePostQuote に遷移する', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderRepostButton({ isReposted: false, postId: 'post-abc' });
      fireEvent.press(
        screen.getByRole('button', { name: 'リポストする。現在 0 件。メニューを開く' })
      );
      const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
      const quoteButton = buttons?.find(
        (b) => b.text === '引用'
      );
      act(() => {
        quoteButton?.onPress?.();
      });
      expect(mockRouterPush).toHaveBeenCalledWith(routePostQuote('post-abc'));
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // オフライン時の挙動
  // -------------------------------------------------------------------------

  describe('オフライン', () => {
    it('オフライン時にリポスト操作 → mutate を呼ばず ERR_OFFLINE_ACTION トーストが表示される', async () => {
      act(() => {
        onlineManager.setOnline(false);
      });
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderRepostButton({ isReposted: false });
      fireEvent.press(
        screen.getByRole('button', { name: 'リポストする。現在 0 件。メニューを開く' })
      );
      const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
      const repostButton = buttons?.find(
        (b) => b.text === 'リポスト'
      );
      act(() => {
        repostButton?.onPress?.();
      });
      expect(mockMutate).not.toHaveBeenCalled();
      expect(await screen.findByText(ERR_OFFLINE_ACTION)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // エラー系トースト
  // -------------------------------------------------------------------------

  describe('エラー時のトースト', () => {
    it('429 RATE_LIMITED → ERR_RATE_LIMIT トーストが表示される', async () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
      });
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(rateLimitError);
        }
      );
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderRepostButton({ isReposted: false });
      fireEvent.press(
        screen.getByRole('button', { name: 'リポストする。現在 0 件。メニューを開く' })
      );
      const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
      const repostButton = buttons?.find(
        (b) => b.text === 'リポスト'
      );
      act(() => {
        repostButton?.onPress?.();
      });
      expect(await screen.findByText(ERR_RATE_LIMIT)).toBeTruthy();
    });

    it('その他の ApiError → ERR_GENERIC トーストが表示される', async () => {
      const serverError = new ApiError({
        code: 'INTERNAL_ERROR',
        status: 500,
        message: 'server error',
      });
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(serverError);
        }
      );
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderRepostButton({ isReposted: false });
      fireEvent.press(
        screen.getByRole('button', { name: 'リポストする。現在 0 件。メニューを開く' })
      );
      const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
      const repostButton = buttons?.find(
        (b) => b.text === 'リポスト'
      );
      act(() => {
        repostButton?.onPress?.();
      });
      expect(await screen.findByText(ERR_GENERIC)).toBeTruthy();
    });
  });
});
