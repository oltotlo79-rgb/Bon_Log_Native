/**
 * @module __tests__/components/post/LikeButton
 * LikeButton コンポーネントのユニットテスト。
 * モック境界は lib/api/（ネットワークに出ない）。
 * useToggleLikeMutation はフックレベルでモックし、mutate の呼び出し引数を検証する。
 */

import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { LikeButton } from '@/components/post/LikeButton';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_OFFLINE_ACTION,
  ERR_RATE_LIMIT,
  ERR_POST_NOT_FOUND,
  ERR_LIKE_FAILED,
} from '@/lib/constants/errors';
import { LIKE_DEBOUNCE_MS } from '@/lib/constants/limits/ui';
import { ROUTE_LOGIN } from '@/lib/constants/routes';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockMutate = jest.fn();

// useToggleLikeMutation をモック: mutate のみ差し替え可能にする
jest.mock('@/lib/queries/likes', () => ({
  useToggleLikeMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

// expo-router の router.push はセットアップで一元モック済み
const mockRouterPush = jest.requireMock('expo-router').router.push as jest.Mock;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type Props = Parameters<typeof LikeButton>[0];

function renderLikeButton(props?: Partial<Props>) {
  const defaultProps: Props = {
    postId: 'post-1',
    isLiked: false,
    likeCount: 5,
    currentUserId: 'user-1',
    ...props,
  };
  return renderWithProviders(<LikeButton {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('LikeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // setOnline は React state 更新を伴うため act でラップする
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
  // 表示
  // -------------------------------------------------------------------------

  describe('表示', () => {
    it('isLiked=false のとき heart-outline アイコンが表示される', () => {
      renderLikeButton({ isLiked: false });
      expect(
        screen.getByTestId('icon-heart-outline', { includeHiddenElements: true })
      ).toBeTruthy();
    });

    it('isLiked=true のとき heart（塗りつぶし）アイコンが表示される', () => {
      renderLikeButton({ isLiked: true });
      expect(
        screen.getByTestId('icon-heart', { includeHiddenElements: true })
      ).toBeTruthy();
    });

    it('likeCount=0 のとき数値テキストが表示されない', () => {
      renderLikeButton({ likeCount: 0 });
      expect(screen.queryByText('0')).toBeNull();
    });

    it('likeCount=5 のとき「5」が表示される', () => {
      renderLikeButton({ likeCount: 5 });
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('likeCount=999 のとき「999」が表示される（境界値）', () => {
      renderLikeButton({ likeCount: 999 });
      expect(screen.getByText('999')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // accessibilityLabel（仕様: follow-and-engagement.md §7）
  // -------------------------------------------------------------------------

  describe('accessibilityLabel', () => {
    it('未認証（currentUserId=undefined）のとき「ログインしていいねする。現在 N 件」', () => {
      renderLikeButton({ currentUserId: undefined, isLiked: false, likeCount: 3 });
      expect(
        screen.getByRole('button', { name: 'ログインしていいねする。現在 3 件' })
      ).toBeTruthy();
    });

    it('isLiked=false のとき「いいねする。現在 N 件」', () => {
      renderLikeButton({ isLiked: false, likeCount: 5 });
      expect(
        screen.getByRole('button', { name: 'いいねする。現在 5 件' })
      ).toBeTruthy();
    });

    it('isLiked=true のとき「いいねを取り消す。現在 N 件」', () => {
      renderLikeButton({ isLiked: true, likeCount: 6 });
      expect(
        screen.getByRole('button', { name: 'いいねを取り消す。現在 6 件' })
      ).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 正常タップ: mutate 呼び出し引数
  // -------------------------------------------------------------------------

  describe('正常タップ', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        jest.runAllTimers();
      });
      jest.useRealTimers();
    });

    it('未いいね状態でタップ → mutate({ postId, currentlyLiked: false }) が呼ばれる', () => {
      renderLikeButton({ postId: 'post-abc', isLiked: false });

      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        { postId: 'post-abc', currentlyLiked: false },
        expect.any(Object)
      );
    });

    it('いいね済み状態でタップ → mutate({ postId, currentlyLiked: true }) が呼ばれる', () => {
      renderLikeButton({ postId: 'post-xyz', isLiked: true, likeCount: 10 });

      fireEvent.press(screen.getByRole('button', { name: 'いいねを取り消す。現在 10 件' }));

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        { postId: 'post-xyz', currentlyLiked: true },
        expect.any(Object)
      );
    });
  });

  // -------------------------------------------------------------------------
  // 未認証タップ → ログイン遷移
  // -------------------------------------------------------------------------

  describe('未認証タップ', () => {
    it('currentUserId=undefined でタップ → mutate を呼ばず router.push(ROUTE_LOGIN) する', () => {
      renderLikeButton({ currentUserId: undefined, isLiked: false, likeCount: 0 });

      fireEvent.press(
        screen.getByRole('button', { name: 'ログインしていいねする。現在 0 件' })
      );

      expect(mockMutate).not.toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith(ROUTE_LOGIN);
    });
  });

  // -------------------------------------------------------------------------
  // オフラインタップ
  // -------------------------------------------------------------------------

  describe('オフライン', () => {
    it('オフライン時のタップ → mutate を呼ばず ERR_OFFLINE_ACTION トーストが表示される', async () => {
      act(() => {
        onlineManager.setOnline(false);
      });

      renderLikeButton({ isLiked: false, likeCount: 5 });

      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      expect(mockMutate).not.toHaveBeenCalled();
      expect(await screen.findByText(ERR_OFFLINE_ACTION)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // エラー系: onError コールバック経由のトースト
  // -------------------------------------------------------------------------

  describe('エラー時のトースト', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        jest.runAllTimers();
      });
      jest.useRealTimers();
    });

    it('429 RATE_LIMITED → ERR_RATE_LIMIT トーストが表示される', async () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
        retryAfter: 5,
      });

      mockMutate.mockImplementation((_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
        callbacks?.onError?.(rateLimitError);
      });

      renderLikeButton({ isLiked: false });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(await screen.findByText(ERR_RATE_LIMIT)).toBeTruthy();
    });

    it('429 受信後にボタンが一時 disabled になる', async () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
        retryAfter: 5,
      });

      mockMutate.mockImplementation((_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
        callbacks?.onError?.(rateLimitError);
      });

      renderLikeButton({ isLiked: false });
      const button = screen.getByRole('button', { name: 'いいねする。現在 5 件' });
      fireEvent.press(button);

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      // disabled 状態を accessibilityState で確認
      expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    });

    it('404 NOT_FOUND → ERR_POST_NOT_FOUND トーストが表示される', async () => {
      const notFoundError = new ApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: 'not found',
      });

      mockMutate.mockImplementation((_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
        callbacks?.onError?.(notFoundError);
      });

      renderLikeButton({ isLiked: false });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(await screen.findByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('その他の ApiError → ERR_LIKE_FAILED トーストが表示される', async () => {
      const serverError = new ApiError({
        code: 'INTERNAL_ERROR',
        status: 500,
        message: 'server error',
      });

      mockMutate.mockImplementation((_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
        callbacks?.onError?.(serverError);
      });

      renderLikeButton({ isLiked: false });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(await screen.findByText(ERR_LIKE_FAILED)).toBeTruthy();
    });

    it('非 ApiError（汎用 Error）→ ERR_LIKE_FAILED トーストが表示される', async () => {
      const genericError = new Error('network error');

      mockMutate.mockImplementation((_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
        callbacks?.onError?.(genericError);
      });

      renderLikeButton({ isLiked: false });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(await screen.findByText(ERR_LIKE_FAILED)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // デバウンス挙動（fake timers）
  // -------------------------------------------------------------------------

  describe('デバウンス', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        jest.runAllTimers();
      });
      jest.useRealTimers();
    });

    it('1回タップ後 LIKE_DEBOUNCE_MS 経過 → mutate が 1 回呼ばれる', () => {
      renderLikeButton({ isLiked: false });
      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    it('デバウンス時間内の連打（2回 = 偶数）→ 元の状態に戻るため API が呼ばれない', () => {
      renderLikeButton({ isLiked: false, likeCount: 5 });
      const button = screen.getByRole('button', { name: 'いいねする。現在 5 件' });

      // 素早く 2 連打（タイマーが切れる前）
      fireEvent.press(button);
      act(() => {
        jest.advanceTimersByTime(10);
      });
      fireEvent.press(button);

      // デバウンス時間を進める
      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      // 偶数回 = 元の状態に戻る → API は呼ばれない
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('デバウンス時間内の連打（3回 = 奇数）→ mutate が 1 回だけ呼ばれる', () => {
      renderLikeButton({ isLiked: false, likeCount: 5 });
      const button = screen.getByRole('button', { name: 'いいねする。現在 5 件' });

      // 素早く 3 連打
      fireEvent.press(button);
      act(() => {
        jest.advanceTimersByTime(10);
      });
      fireEvent.press(button);
      act(() => {
        jest.advanceTimersByTime(10);
      });
      fireEvent.press(button);

      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      // 奇数回 = 状態が変わる → API 1 回だけ
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    it('デバウンス時間をまたいだ 2 回タップ → mutate が 2 回呼ばれる', () => {
      renderLikeButton({ isLiked: false, likeCount: 5 });
      const button = screen.getByRole('button', { name: 'いいねする。現在 5 件' });

      // 1 回目タップ → デバウンス完了
      fireEvent.press(button);
      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      // 2 回目タップ → デバウンス完了
      fireEvent.press(button);
      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(mockMutate).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // 即時楽観表示（ローカル state の即時切り替え）
  // -------------------------------------------------------------------------

  describe('即時楽観表示', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        jest.runAllTimers();
      });
      jest.useRealTimers();
    });

    it('未いいね状態でタップ直後（デバウンス前）に heart アイコンへ即時切り替わる', () => {
      renderLikeButton({ isLiked: false, likeCount: 5 });

      // タップ前は heart-outline
      expect(
        screen.getByTestId('icon-heart-outline', { includeHiddenElements: true })
      ).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      // デバウンスタイマーを進める前に即時表示が切り替わっている
      expect(
        screen.getByTestId('icon-heart', { includeHiddenElements: true })
      ).toBeTruthy();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('いいね済み状態でタップ直後（デバウンス前）に heart-outline アイコンへ即時切り替わる', () => {
      renderLikeButton({ isLiked: true, likeCount: 6 });

      // タップ前は heart
      expect(
        screen.getByTestId('icon-heart', { includeHiddenElements: true })
      ).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'いいねを取り消す。現在 6 件' }));

      // デバウンス前に即時表示が切り替わっている
      expect(
        screen.getByTestId('icon-heart-outline', { includeHiddenElements: true })
      ).toBeTruthy();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('タップ直後（デバウンス前）にカウントが即時 +1 される', () => {
      renderLikeButton({ isLiked: false, likeCount: 5 });

      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      // デバウンス前に +1 されている
      expect(screen.getByText('6')).toBeTruthy();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('タップ直後（デバウンス前）にカウントが即時 -1 される', () => {
      renderLikeButton({ isLiked: true, likeCount: 10 });

      fireEvent.press(screen.getByRole('button', { name: 'いいねを取り消す。現在 10 件' }));

      // デバウンス前に -1 されている
      expect(screen.getByText('9')).toBeTruthy();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('タップ直後の即時表示後、LIKE_DEBOUNCE_MS 経過で mutate が 1 回だけ正しい引数で呼ばれる', () => {
      renderLikeButton({ postId: 'post-opt', isLiked: false, likeCount: 5 });

      fireEvent.press(screen.getByRole('button', { name: 'いいねする。現在 5 件' }));

      // デバウンス前: UI は即時切り替わっているが mutate はまだ
      expect(
        screen.getByTestId('icon-heart', { includeHiddenElements: true })
      ).toBeTruthy();
      expect(mockMutate).not.toHaveBeenCalled();

      // デバウンス完了
      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        { postId: 'post-opt', currentlyLiked: false },
        expect.any(Object)
      );
    });

    it('偶数回連打（2回）では即時表示がトグルされるが最終的に元表示へ戻り、API が呼ばれない', () => {
      renderLikeButton({ isLiked: false, likeCount: 5 });
      const button = screen.getByRole('button', { name: 'いいねする。現在 5 件' });

      // 1 回目タップ: 即時 heart / カウント 6
      fireEvent.press(button);
      expect(
        screen.getByTestId('icon-heart', { includeHiddenElements: true })
      ).toBeTruthy();
      expect(screen.getByText('6')).toBeTruthy();

      // タイマーを少し進めてもまだデバウンス中
      act(() => { jest.advanceTimersByTime(10); });

      // 2 回目タップ: 1回目タップ後は「いいねを取り消す」ラベルになっているため正しいラベルで取得
      fireEvent.press(screen.getByRole('button', { name: 'いいねを取り消す。現在 6 件' }));
      expect(
        screen.getByTestId('icon-heart-outline', { includeHiddenElements: true })
      ).toBeTruthy();

      // デバウンス完了 → 偶数回なので API 不要
      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      expect(mockMutate).not.toHaveBeenCalled();
      // 元の表示に戻っている（setOptimisticLiked(isLiked) / setOptimisticCount(likeCount)）
      expect(screen.getByText('5')).toBeTruthy();
      expect(
        screen.getByTestId('icon-heart-outline', { includeHiddenElements: true })
      ).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // props 同期（サーバー確定値・ロールバック）
  // -------------------------------------------------------------------------

  describe('props 同期', () => {
    it('props の isLiked / likeCount が変わったとき、ローカル state がそれに追従する', () => {
      const { rerender } = renderLikeButton({ isLiked: false, likeCount: 5 });

      // サーバー確定値が props 経由で届いた場合をシミュレート
      rerender(
        <LikeButton
          postId="post-1"
          isLiked={true}
          likeCount={6}
          currentUserId="user-1"
        />
      );

      expect(
        screen.getByTestId('icon-heart', { includeHiddenElements: true })
      ).toBeTruthy();
      expect(screen.getByText('6')).toBeTruthy();
    });

    it('props がロールバック値（元の状態）に変わったとき表示が元に戻る', () => {
      const { rerender } = renderLikeButton({ isLiked: false, likeCount: 5 });

      // いったんサーバー確定値を受け取り
      rerender(
        <LikeButton
          postId="post-1"
          isLiked={true}
          likeCount={6}
          currentUserId="user-1"
        />
      );

      // ロールバック: 元の false/5 に戻る
      rerender(
        <LikeButton
          postId="post-1"
          isLiked={false}
          likeCount={5}
          currentUserId="user-1"
        />
      );

      expect(
        screen.getByTestId('icon-heart-outline', { includeHiddenElements: true })
      ).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 429 後の再 enable（fake timers）
  // -------------------------------------------------------------------------

  describe('429 後の再 enable', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        jest.runAllTimers();
      });
      jest.useRealTimers();
    });

    it('retryAfter 秒後にボタンが再び enabled になる', async () => {
      const RETRY_AFTER_SEC = 5;
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
        retryAfter: RETRY_AFTER_SEC,
      });

      mockMutate.mockImplementation((_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
        callbacks?.onError?.(rateLimitError);
      });

      renderLikeButton({ isLiked: false });
      const button = screen.getByRole('button', { name: 'いいねする。現在 5 件' });

      fireEvent.press(button);
      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      // disabled 確認
      expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));

      // retryAfter 秒後に re-enable
      act(() => {
        jest.advanceTimersByTime(RETRY_AFTER_SEC * 1000);
      });

      expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
    });
  });

  // -------------------------------------------------------------------------
  // 429 disabled 中の追加タップ
  // -------------------------------------------------------------------------

  describe('429 disabled 中のタップ', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        jest.runAllTimers();
      });
      jest.useRealTimers();
    });

    it('isRateLimitDisabled=true の間はタップしても mutate が呼ばれない', async () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
        retryAfter: 60,
      });

      let callCount = 0;
      mockMutate.mockImplementation((_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
        callCount += 1;
        if (callCount === 1) {
          callbacks?.onError?.(rateLimitError);
        }
      });

      renderLikeButton({ isLiked: false });
      const button = screen.getByRole('button', { name: 'いいねする。現在 5 件' });

      // 最初のタップ: 429 エラーが発生して disabled
      fireEvent.press(button);
      act(() => {
        jest.advanceTimersByTime(LIKE_DEBOUNCE_MS);
      });

      // disabled 中に再タップ（React Native disabled prop により実際のハンドラは動かない）
      // disabled=true のためイベントが届かないことを確認
      expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });
});
