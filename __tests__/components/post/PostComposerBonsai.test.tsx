/**
 * @module __tests__/components/post/PostComposerBonsai
 * PostComposer コンポーネントの bonsaiId 分岐テスト。
 * 新規投稿時のみ BonsaiSelector が表示されること、作成ミューテーションへの bonsaiId 伝播、
 * 作成時 NOT_FOUND での messageForPostBonsaiError 表示、編集時は BonsaiSelector が
 * 表示されず bonsaiId を一切送らないことを検証する。
 * モック境界: useCreatePostMutation / useUpdatePostMutation / useGenresQuery /
 * useBonsaiListQuery / uploadImage / uploadVideo。
 */

import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { onlineManager } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { PostComposer } from '@/components/post/PostComposer';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ERR_BONSAI_NOT_FOUND, ERR_POST_CREATE_FAILED } from '@/lib/constants/errors';

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

jest.mock('@/lib/queries/shops', () => ({
  useGenresQuery: jest.fn(() => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

const MOCK_BONSAI_ITEM = {
  id: 'bonsai-1',
  name: '黒松の盆栽',
  species: '黒松',
  acquiredAt: null,
  description: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  recordCount: 3,
  latestRecord: null,
};

jest.mock('@/lib/queries/bonsai', () => ({
  useBonsaiListQuery: jest.fn(() => ({
    data: { pages: [{ items: [MOCK_BONSAI_ITEM], nextCursor: null }], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
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

function typeContent(text: string) {
  const inputs = screen.root.findAll(
    (node: ReactTestInstance) => String(node.type) === 'TextInput'
  );
  act(() => {
    fireEvent.changeText(inputs[0], text);
  });
}

async function submit() {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
  });
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('PostComposer bonsaiId 分岐', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-post' });
    mockUpdateMutateAsync.mockResolvedValue({ id: 'post-1' });
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
  // 表示の分岐
  // -------------------------------------------------------------------------

  describe('BonsaiSelector の表示分岐', () => {
    it('mode=create のとき BonsaiSelector（「選択しない」トリガー）が表示される', () => {
      renderPostComposer({ mode: 'create' });
      expect(screen.getByText('選択しない')).toBeTruthy();
      expect(screen.getByText('関連する盆栽（任意）')).toBeTruthy();
    });

    it('mode=edit のとき BonsaiSelector が表示されない', () => {
      renderPostComposer({ mode: 'edit', postId: 'post-1' });
      expect(screen.queryByText('選択しない')).toBeNull();
      expect(screen.queryByText('関連する盆栽（任意）')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 作成ミューテーションへの bonsaiId 伝播
  // -------------------------------------------------------------------------

  describe('作成時の bonsaiId 伝播', () => {
    it('盆栽を選択せずに投稿すると bonsaiId=null で mutateAsync が呼ばれる', async () => {
      renderPostComposer({ mode: 'create' });
      typeContent('本文');

      await submit();

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ bonsaiId: null })
        );
      });
    });

    it('盆栽を選択して投稿すると選択した盆栽の id が bonsaiId として mutateAsync に渡る', async () => {
      renderPostComposer({ mode: 'create' });
      typeContent('本文');

      // BonsaiSelector のトリガーを開いて盆栽を選択する
      fireEvent.press(screen.getByRole('button', { name: '選択しない' }));
      fireEvent.press(screen.getByRole('radio', { name: '黒松の盆栽 (黒松)' }));

      await waitFor(() => {
        expect(screen.getByText('黒松の盆栽 (黒松)')).toBeTruthy();
      });

      await submit();

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ bonsaiId: 'bonsai-1' })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // 作成時の NOT_FOUND エラー表示
  // -------------------------------------------------------------------------

  describe('作成時の盆栽エラー表示', () => {
    it('盆栽を選択した投稿が 404 NOT_FOUND で失敗すると ERR_BONSAI_NOT_FOUND が表示される', async () => {
      mockCreateMutateAsync.mockRejectedValueOnce(
        new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' })
      );
      renderPostComposer({ mode: 'create' });
      typeContent('本文');

      fireEvent.press(screen.getByRole('button', { name: '選択しない' }));
      fireEvent.press(screen.getByRole('radio', { name: '黒松の盆栽 (黒松)' }));
      await waitFor(() => {
        expect(screen.getByText('黒松の盆栽 (黒松)')).toBeTruthy();
      });

      await submit();

      await waitFor(() => {
        expect(screen.getByText(ERR_BONSAI_NOT_FOUND)).toBeTruthy();
      });
    });

    it('盆栽を選択していない投稿が 404 NOT_FOUND で失敗しても盆栽エラー文言は出ない（通常の投稿失敗文言）', async () => {
      mockCreateMutateAsync.mockRejectedValueOnce(
        new ApiError({ code: 'NOT_FOUND', status: 404, message: 'not found' })
      );
      renderPostComposer({ mode: 'create' });
      typeContent('本文');

      await submit();

      await waitFor(() => {
        expect(screen.getByText(ERR_POST_CREATE_FAILED)).toBeTruthy();
      });
      expect(screen.queryByText(ERR_BONSAI_NOT_FOUND)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 編集時は bonsaiId を送らない
  // -------------------------------------------------------------------------

  describe('編集時は bonsaiId を送らない', () => {
    it('mode=edit で保存すると mutateAsync の引数に bonsaiId キー自体が含まれない', async () => {
      renderPostComposer({
        mode: 'edit',
        postId: 'post-1',
        initialValues: { content: '既存の内容', genreIds: [], imageUris: [], videoUri: null },
      });
      typeContent('編集後の内容');

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '変更を保存する' }));
      });

      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalled();
      });
      expect(mockUpdateMutateAsync.mock.calls[0]?.[0]).not.toHaveProperty('bonsaiId');
    });
  });
});
