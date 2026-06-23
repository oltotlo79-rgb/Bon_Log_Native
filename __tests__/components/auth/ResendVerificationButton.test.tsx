/**
 * components/auth/ResendVerificationButton のユニットテスト。
 * useResendVerificationMutation は mock 境界（lib/queries/auth）。
 * タイマー動作は fake timers で制御する。
 */

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ResendVerificationButton } from '@/components/auth/ResendVerificationButton';
import { ERR_RATE_LIMIT } from '@/lib/constants/errors';
import { ApiError } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockMutate = jest.fn();
let mockIsPending = false;

jest.mock('@/lib/queries/auth', () => ({
  useResendVerificationMutation: () => ({
    mutate: (...args: Parameters<typeof mockMutate>) => mockMutate(...args),
    get isPending() {
      return mockIsPending;
    },
  }),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function renderButton(
  props?: Partial<React.ComponentProps<typeof ResendVerificationButton>>
) {
  const onError = jest.fn();
  const onSuccess = jest.fn();
  renderWithProviders(
    <ResendVerificationButton
      email="test@example.com"
      onError={onError}
      onSuccess={onSuccess}
      {...props}
    />
  );
  return { onError, onSuccess };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockIsPending = false;
  jest.useRealTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('ResendVerificationButton', () => {
  describe('初期状態', () => {
    it('「確認メールを再送する」ラベルが表示される', () => {
      renderButton();
      expect(screen.getByText('確認メールを再送する')).toBeTruthy();
    });

    it('ボタンが有効な状態', () => {
      renderButton();
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  describe('成功', () => {
    it('ボタン押下で mutate が email を引数に呼ばれる', () => {
      mockMutate.mockImplementation((_vars: unknown, _opts?: unknown) => undefined);
      renderButton();

      fireEvent.press(screen.getByRole('button'));

      expect(mockMutate).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('onSuccess コールバックが呼ばれる', async () => {
      mockMutate.mockImplementation(
        (_vars: unknown, opts?: { onSuccess?: () => void }) => {
          opts?.onSuccess?.();
        }
      );
      const onSuccess = jest.fn();
      renderWithProviders(
        <ResendVerificationButton
          email="test@example.com"
          onError={jest.fn()}
          onSuccess={onSuccess}
        />
      );

      fireEvent.press(screen.getByRole('button'));

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    });

    it('成功後にクールダウンカウントダウンが開始する', async () => {
      jest.useFakeTimers();
      mockMutate.mockImplementation(
        (_vars: unknown, opts?: { onSuccess?: () => void }) => {
          opts?.onSuccess?.();
        }
      );
      renderWithProviders(
        <ResendVerificationButton
          email="test@example.com"
          onError={jest.fn()}
          cooldownMs={3000}
        />
      );

      fireEvent.press(screen.getByRole('button'));

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      expect(screen.queryByText(/残り \d+ 秒/)).toBeTruthy();
    });

    it('クールダウン中はボタンが無効化される', async () => {
      jest.useFakeTimers();
      mockMutate.mockImplementation(
        (_vars: unknown, opts?: { onSuccess?: () => void }) => {
          opts?.onSuccess?.();
        }
      );
      renderWithProviders(
        <ResendVerificationButton
          email="test@example.com"
          onError={jest.fn()}
          cooldownMs={3000}
        />
      );

      fireEvent.press(screen.getByRole('button'));

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      const button = screen.getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('クールダウン完了後にボタンが再び有効化される', async () => {
      jest.useFakeTimers();
      mockMutate.mockImplementation(
        (_vars: unknown, opts?: { onSuccess?: () => void }) => {
          opts?.onSuccess?.();
        }
      );
      renderWithProviders(
        <ResendVerificationButton
          email="test@example.com"
          onError={jest.fn()}
          cooldownMs={3000}
        />
      );

      fireEvent.press(screen.getByRole('button'));

      await act(async () => {
        jest.advanceTimersByTime(3500);
      });

      expect(screen.getByText('確認メールを再送する')).toBeTruthy();
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  describe('429 レート制限エラー', () => {
    it('429 RATE_LIMITED エラーで onError が ERR_RATE_LIMIT メッセージの Error を受け取る', async () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
      });
      mockMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(rateLimitError);
        }
      );
      const onError = jest.fn();
      renderWithProviders(
        <ResendVerificationButton
          email="test@example.com"
          onError={onError}
        />
      );

      fireEvent.press(screen.getByRole('button'));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      const receivedError = onError.mock.calls[0][0] as Error;
      expect(receivedError.message).toBe(ERR_RATE_LIMIT);
    });
  });

  describe('汎用エラー', () => {
    it('429 以外のエラーで onError がそのまま error を受け取る', async () => {
      const genericError = new ApiError({
        code: 'INTERNAL_ERROR',
        status: 500,
        message: 'server error',
      });
      mockMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(genericError);
        }
      );
      const onError = jest.fn();
      renderWithProviders(
        <ResendVerificationButton
          email="test@example.com"
          onError={onError}
        />
      );

      fireEvent.press(screen.getByRole('button'));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(onError.mock.calls[0][0]).toBe(genericError);
    });
  });

  describe('isPending 状態', () => {
    it('isPending=true のとき accessibilityState.busy が true', () => {
      mockIsPending = true;
      renderButton();
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState?.busy).toBe(true);
    });

    it('isPending=true のとき「確認メールを再送する」テキストが非表示', () => {
      mockIsPending = true;
      renderButton();
      expect(screen.queryByText('確認メールを再送する')).toBeNull();
    });
  });
});
