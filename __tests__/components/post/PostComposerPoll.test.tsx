/**
 * @module __tests__/components/post/PostComposerPoll
 * PostComposer コンポーネントのアンケート機能テスト。
 * アンケート追加・削除・選択肢バリデーション・送信時の poll 引数を検証する。
 * モック境界: useCreatePostMutation / useUpdatePostMutation / uploadImage / uploadVideo をモック。
 */

import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { onlineManager } from '@tanstack/react-query';
import { PostComposer } from '@/components/post/PostComposer';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();

jest.mock('@/lib/queries/posts', () => ({
  useCreatePostMutation: jest.fn(() => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  })),
  useUpdatePostMutation: jest.fn(() => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  })),
}));

jest.mock('@/lib/queries/upload', () => ({
  uploadImage: jest.fn().mockResolvedValue('https://example.com/uploaded.jpg'),
  uploadVideo: jest.fn().mockResolvedValue('https://example.com/uploaded.mp4'),
}));

// usePostComposer の内部で expo-image-picker を使うためモック
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
}));

// expo-router は setup.ts で一元モック済み。dismiss をセットアップ後に追加する。
const mockRouterDismiss = jest.fn();
const mockPostComposerRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
  navigate: jest.Mock;
  dismiss?: jest.Mock;
};
beforeAll(() => {
  mockPostComposerRouter.dismiss = mockRouterDismiss;
});

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type Props = React.ComponentProps<typeof PostComposer>;

function renderPostComposer(props?: Partial<Props>) {
  const defaultProps: Props = {
    mode: 'create',
    currentUserId: 'user-1',
    isPremium: false,
    ...props,
  };
  return renderWithProviders(<PostComposer {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('PostComposer アンケート機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-post' });
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
  // アンケートなしの通常投稿
  // -------------------------------------------------------------------------

  describe('アンケートなしの通常投稿', () => {
    it('初期状態で「アンケートを追加」ボタンが表示される', () => {
      renderPostComposer();
      expect(
        screen.getByRole('button', { name: 'アンケートを追加' })
      ).toBeTruthy();
    });

    it('アンケートなしで投稿すると poll を含まずに mutateAsync が呼ばれる', async () => {
      renderPostComposer();
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '通常投稿のテスト');
      });
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      });
      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            content: '通常投稿のテスト',
            poll: undefined,
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // アンケートの追加
  // -------------------------------------------------------------------------

  describe('アンケートの追加', () => {
    it('「アンケートを追加」を押すと PollAttachment が表示される', async () => {
      renderPostComposer();
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを追加' })
        );
      });
      await waitFor(() => {
        expect(screen.getByText('アンケート')).toBeTruthy();
      });
    });

    it('PollAttachment が表示されると「アンケートを追加」ボタンが非表示になる', async () => {
      renderPostComposer();
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを追加' })
        );
      });
      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: 'アンケートを追加' })
        ).toBeNull();
      });
    });

    it('「アンケートを削除」を押すと PollAttachment が非表示になる', async () => {
      renderPostComposer();
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを追加' })
        );
      });
      await waitFor(() => {
        expect(screen.getByText('アンケート')).toBeTruthy();
      });
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを削除' })
        );
      });
      await waitFor(() => {
        expect(screen.queryByText('アンケート')).toBeNull();
        expect(
          screen.getByRole('button', { name: 'アンケートを追加' })
        ).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // アンケートのバリデーション
  // -------------------------------------------------------------------------

  describe('アンケートのバリデーション', () => {
    it('アンケートの選択肢が空のとき「投稿する」ボタンが disabled', async () => {
      renderPostComposer();
      // 本文を入力
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '本文');
      });
      // アンケートを追加（選択肢は空のまま）
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを追加' })
        );
      });
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: '投稿する' });
        expect(submitButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: true })
        );
      });
    });

    it('選択肢をすべて入力すると「投稿する」ボタンが enabled になる', async () => {
      renderPostComposer();
      // 本文を入力
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '本文');
      });
      // アンケートを追加
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを追加' })
        );
      });
      await waitFor(() => {
        expect(screen.getByText('アンケート')).toBeTruthy();
      });
      // アンケート選択肢を個別の act で入力（state 更新を確実に同期させる）
      await act(async () => {
        fireEvent.changeText(
          screen.getByLabelText('アンケート選択肢 1'),
          '松柏類'
        );
      });
      await act(async () => {
        fireEvent.changeText(
          screen.getByLabelText('アンケート選択肢 2'),
          '雑木類'
        );
      });
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: '投稿する' });
        expect(submitButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: false })
        );
      });
    });

    it('選択肢の一部が空のとき「投稿する」ボタンが disabled のまま', async () => {
      renderPostComposer();
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '本文');
      });
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを追加' })
        );
      });
      await waitFor(() => {
        expect(screen.getByText('アンケート')).toBeTruthy();
      });
      // 全入力フィールドを再取得
      const allInputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      // 選択肢1のみ入力、選択肢2は空のまま
      if (allInputs.length >= 2) {
        act(() => {
          fireEvent.changeText(allInputs[1], '松柏類');
          // allInputs[2] は空のまま（デフォルト ''）
        });
        await waitFor(() => {
          const submitButton = screen.getByRole('button', { name: '投稿する' });
          expect(submitButton.props.accessibilityState).toEqual(
            expect.objectContaining({ disabled: true })
          );
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  // 送信時の poll 引数
  // -------------------------------------------------------------------------

  describe('送信時の poll 引数', () => {
    it('アンケート付きで送信すると poll フィールドが mutateAsync に渡される', async () => {
      renderPostComposer();
      // 本文入力
      const inputs = screen.root.findAll(
        (node: ReactTestInstance) => String(node.type) === 'TextInput'
      );
      act(() => {
        fireEvent.changeText(inputs[0], '本文');
      });
      // アンケート追加
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを追加' })
        );
      });
      await waitFor(() => {
        expect(screen.getByText('アンケート')).toBeTruthy();
      });
      // 選択肢入力（accessibilityLabel で特定、個別 act で state 更新を確実に同期）
      await act(async () => {
        fireEvent.changeText(
          screen.getByLabelText('アンケート選択肢 1'),
          '松柏類'
        );
      });
      await act(async () => {
        fireEvent.changeText(
          screen.getByLabelText('アンケート選択肢 2'),
          '雑木類'
        );
      });
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: '投稿する' });
        expect(submitButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: false })
        );
      });
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      });
      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            poll: expect.objectContaining({
              options: ['松柏類', '雑木類'],
              durationSeconds: expect.any(Number),
            }),
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // edit モードではアンケートセクションが非表示
  // -------------------------------------------------------------------------

  describe('edit モード', () => {
    it('mode=edit のときアンケートセクションが表示されない', () => {
      renderPostComposer({ mode: 'edit', postId: 'post-1' });
      expect(
        screen.queryByRole('button', { name: 'アンケートを追加' })
      ).toBeNull();
    });
  });
});
