/**
 * @module __tests__/components/post/QuoteComposer
 * QuoteComposer コンポーネントのユニットテスト。
 * モック境界: useQuotePostMutation をモック。ネットワークに出ない。
 * 引用元表示、テキスト入力、送信、送信中の無効化、エラー表示を検証する。
 */

import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { onlineManager } from '@tanstack/react-query';
import { QuoteComposer } from '@/components/post/QuoteComposer';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_POST_CREATE_FAILED,
  ERR_POST_CONTENT_TOO_LONG,
  ERR_RATE_LIMIT_DAILY_POSTS,
  ERR_FORBIDDEN,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';
import { MAX_POST_CONTENT_FREE, MAX_POST_CONTENT_PREMIUM } from '@/lib/constants/limits/post';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import type { QuotedPostCardProps } from '@/components/post/QuotedPostCard';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockMutateAsync = jest.fn();

jest.mock('@/lib/queries/posts', () => ({
  useQuotePostMutation: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

// expo-router の router.dismiss はセットアップで一元モック済みの router に dismiss を追加して使う。
// jest.requireActual は expo-router の ESM 依存で使えないため、セットアップモックの router を直接参照する。
const mockRouterDismiss = jest.fn();
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
  navigate: jest.Mock;
  dismiss?: jest.Mock;
};
// セットアップのモックに dismiss を追加する
beforeAll(() => {
  mockRouter.dismiss = mockRouterDismiss;
});

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

const QUOTED_CONTENT = '引用元の投稿本文';
const QUOTED_NICKNAME = '松の匠';

const quotedPost: QuotedPostCardProps['post'] = {
  id: 'original-post-1',
  content: QUOTED_CONTENT,
  user: {
    id: 'user-original',
    nickname: QUOTED_NICKNAME,
    avatarUrl: null,
  },
  media: [],
};

type Props = React.ComponentProps<typeof QuoteComposer>;

function renderQuoteComposer(props?: Partial<Props>) {
  const defaultProps: Props = {
    quotedPostId: 'original-post-1',
    quotedPost,
    currentUserId: 'user-1',
    isPremium: false,
    ...props,
  };
  return renderWithProviders(<QuoteComposer {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('QuoteComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ id: 'new-quote-post' });
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
  // 引用元の表示
  // -------------------------------------------------------------------------

  describe('引用元の表示', () => {
    it('引用元の投稿本文が表示される', () => {
      renderQuoteComposer();
      expect(screen.getByText(QUOTED_CONTENT)).toBeTruthy();
    });

    it('引用元のユーザー名が表示される', () => {
      renderQuoteComposer();
      expect(screen.getByText(QUOTED_NICKNAME)).toBeTruthy();
    });

    it('ヘッダーに「引用投稿」タイトルが表示される', () => {
      renderQuoteComposer();
      expect(screen.getByText('引用投稿')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderQuoteComposer();
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // テキスト入力と送信ボタンの状態
  // -------------------------------------------------------------------------

  describe('テキスト入力と送信ボタン', () => {
    it('初期状態で「投稿する」ボタンが disabled', () => {
      renderQuoteComposer();
      const submitButton = screen.getByRole('button', {
        name: '引用して投稿する',
      });
      expect(submitButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('テキストを入力すると「投稿する」ボタンが enabled になる', async () => {
      renderQuoteComposer();
      // PostBodyInput のテキスト入力フィールドを特定する
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      expect(inputs.length).toBeGreaterThan(0);
      act(() => {
        fireEvent.changeText(inputs[0], '引用コメントを入力');
      });
      await waitFor(() => {
        const submitButton = screen.getByRole('button', {
          name: '引用して投稿する',
        });
        expect(submitButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: false })
        );
      });
    });

    it('テキストがスペースのみのとき「投稿する」ボタンが disabled のまま', async () => {
      renderQuoteComposer();
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '   ');
      });
      await waitFor(() => {
        const submitButton = screen.getByRole('button', {
          name: '引用して投稿する',
        });
        expect(submitButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: true })
        );
      });
    });

    it('文字数上限超過のとき「投稿する」ボタンが disabled', async () => {
      renderQuoteComposer({ isPremium: false });
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      const overLimitText = 'あ'.repeat(MAX_POST_CONTENT_FREE + 1);
      act(() => {
        fireEvent.changeText(inputs[0], overLimitText);
      });
      await waitFor(() => {
        const submitButton = screen.getByRole('button', {
          name: '引用して投稿する',
        });
        expect(submitButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: true })
        );
      });
    });

    it('プレミアムユーザーは MAX_POST_CONTENT_PREMIUM まで入力でき送信可能', async () => {
      renderQuoteComposer({ isPremium: true });
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      // プレミアムの上限ぴったりの文字数
      const premiumMaxText = 'あ'.repeat(MAX_POST_CONTENT_PREMIUM);
      act(() => {
        fireEvent.changeText(inputs[0], premiumMaxText);
      });
      await waitFor(() => {
        const submitButton = screen.getByRole('button', {
          name: '引用して投稿する',
        });
        expect(submitButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: false })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // 送信処理
  // -------------------------------------------------------------------------

  describe('送信', () => {
    it('送信成功 → mutateAsync が正しい引数で呼ばれ router.dismiss が実行される', async () => {
      renderQuoteComposer({ quotedPostId: 'original-post-1' });
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '引用コメント');
      });
      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: '引用して投稿する' })
        );
      });
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          quotedPostId: 'original-post-1',
          content: '引用コメント',
        });
        expect(mockRouterDismiss).toHaveBeenCalledTimes(1);
      });
    });

    it('送信中は「投稿する」ボタンが disabled になる', async () => {
      let resolvePromise: (value: unknown) => void;
      mockMutateAsync.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );
      renderQuoteComposer();
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '引用コメント');
      });
      // 送信ボタンを押す
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: '引用して投稿する' })
        );
      });
      // 送信中は disabled
      await waitFor(() => {
        const submitButton = screen.getByRole('button', {
          name: '引用して投稿する',
        });
        expect(submitButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: true })
        );
      });
      // クリーンアップ
      await act(async () => {
        resolvePromise!({ id: 'new-quote' });
      });
    });
  });

  // -------------------------------------------------------------------------
  // オフライン
  // -------------------------------------------------------------------------

  describe('オフライン', () => {
    it('オフライン時に送信 → mutateAsync を呼ばず ERR_OFFLINE_ACTION が表示される', async () => {
      act(() => {
        onlineManager.setOnline(false);
      });
      renderQuoteComposer();
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '引用コメント');
      });
      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: '引用して投稿する' })
        );
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(await screen.findByText(ERR_OFFLINE_ACTION)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // エラー表示
  // -------------------------------------------------------------------------

  describe('エラー表示', () => {
    it('RATE_LIMITED エラー → ERR_RATE_LIMIT_DAILY_POSTS が表示される', async () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
      });
      mockMutateAsync.mockRejectedValue(rateLimitError);
      renderQuoteComposer();
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '引用コメント');
      });
      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: '引用して投稿する' })
        );
      });
      expect(await screen.findByText(ERR_RATE_LIMIT_DAILY_POSTS)).toBeTruthy();
    });

    it('VALIDATION_ERROR → ERR_POST_CONTENT_TOO_LONG が表示される', async () => {
      const validationError = new ApiError({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'content too long',
      });
      mockMutateAsync.mockRejectedValue(validationError);
      renderQuoteComposer({ isPremium: false });
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '引用コメント');
      });
      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: '引用して投稿する' })
        );
      });
      expect(
        await screen.findByText(ERR_POST_CONTENT_TOO_LONG(MAX_POST_CONTENT_FREE))
      ).toBeTruthy();
    });

    it('GUEST_NOT_ALLOWED → ERR_FORBIDDEN が表示される', async () => {
      const forbiddenError = new ApiError({
        code: 'GUEST_NOT_ALLOWED',
        status: 403,
        message: 'forbidden',
      });
      mockMutateAsync.mockRejectedValue(forbiddenError);
      renderQuoteComposer();
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '引用コメント');
      });
      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: '引用して投稿する' })
        );
      });
      expect(await screen.findByText(ERR_FORBIDDEN)).toBeTruthy();
    });

    it('汎用エラー → ERR_POST_CREATE_FAILED が表示される', async () => {
      mockMutateAsync.mockRejectedValue(new Error('network error'));
      renderQuoteComposer();
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '引用コメント');
      });
      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: '引用して投稿する' })
        );
      });
      expect(await screen.findByText(ERR_POST_CREATE_FAILED)).toBeTruthy();
    });
  });
});
