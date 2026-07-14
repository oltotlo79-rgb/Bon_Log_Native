/**
 * @module __tests__/components/post/PostComposerBonsai
 * PostComposer コンポーネントの bonsaiId と重要な送信・異常系分岐テスト。
 * 新規投稿時のみ BonsaiSelector が表示されること、作成ミューテーションへの bonsaiId 伝播、
 * 作成時 NOT_FOUND での messageForPostBonsaiError 表示、編集時は BonsaiSelector が
 * 表示されず bonsaiId を一切送らないことに加え、エラー変換、オフライン、未保存キャンセル、
 * 既存・ローカルメディアの送信契約を検証する。
 * モック境界: useCreatePostMutation / useUpdatePostMutation / useGenresQuery /
 * useBonsaiListQuery / uploadImage / uploadVideo。
 */

import React from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { onlineManager } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { PostComposer } from '@/components/post/PostComposer';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import {
  ERR_BONSAI_NOT_FOUND,
  ERR_FORBIDDEN,
  ERR_MEDIA_UPLOAD_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_POST_CONTENT_TOO_LONG,
  ERR_POST_CREATE_FAILED,
  ERR_POST_UPDATE_FAILED,
  ERR_RATE_LIMIT_DAILY_POSTS,
  ERR_SERVER,
} from '@/lib/constants/errors';
import {
  MAX_POST_CONTENT_FREE,
  MAX_POST_CONTENT_PREMIUM,
} from '@/lib/constants/limits/post';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();
const mockUploadImage = jest.fn().mockResolvedValue('https://example.com/uploaded.jpg');
const mockUploadVideo = jest.fn().mockResolvedValue('https://example.com/uploaded.mp4');

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
  uploadImage: (params: unknown) => mockUploadImage(params),
  uploadVideo: (params: unknown) => mockUploadVideo(params),
}));

// usePostComposer の内部で expo-image-picker を使うためモック
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
}));

// expo-router は setup.ts で一元モック済み。dismiss をセットアップ後に追加する。
const mockRouterDismiss = jest.fn();
const originalPlatformOS = Platform.OS;
beforeAll(() => {
  Object.defineProperty(router, 'dismiss', {
    configurable: true,
    value: mockRouterDismiss,
  });
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

async function submitEdit() {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: '変更を保存する' }));
  });
}

type ApiErrorMessageCase = {
  code: MobileApiErrorCode;
  status: number;
  expectedMessage: string;
  isPremium?: boolean;
};

const CREATE_API_ERROR_CASES = [
  {
    code: 'RATE_LIMITED',
    status: 429,
    expectedMessage: ERR_RATE_LIMIT_DAILY_POSTS,
  },
  {
    code: 'VALIDATION_ERROR',
    status: 400,
    expectedMessage: ERR_POST_CONTENT_TOO_LONG(MAX_POST_CONTENT_PREMIUM),
    isPremium: true,
  },
  {
    code: 'GUEST_NOT_ALLOWED',
    status: 403,
    expectedMessage: ERR_FORBIDDEN,
  },
  {
    code: 'ACCOUNT_SUSPENDED',
    status: 403,
    expectedMessage: ERR_FORBIDDEN,
  },
  {
    code: 'INTERNAL_ERROR',
    status: 500,
    expectedMessage: ERR_SERVER,
  },
  {
    code: 'SERVER_MISCONFIGURED',
    status: 500,
    expectedMessage: ERR_SERVER,
  },
] satisfies readonly ApiErrorMessageCase[];

const UPDATE_API_ERROR_CASES = [
  {
    code: 'VALIDATION_ERROR',
    status: 400,
    expectedMessage: ERR_POST_CONTENT_TOO_LONG(MAX_POST_CONTENT_FREE),
  },
  {
    code: 'GUEST_NOT_ALLOWED',
    status: 403,
    expectedMessage: ERR_FORBIDDEN,
  },
  {
    code: 'ACCOUNT_SUSPENDED',
    status: 403,
    expectedMessage: ERR_FORBIDDEN,
  },
  {
    code: 'INTERNAL_ERROR',
    status: 500,
    expectedMessage: ERR_SERVER,
  },
  {
    code: 'SERVER_MISCONFIGURED',
    status: 500,
    expectedMessage: ERR_SERVER,
  },
  {
    code: 'RATE_LIMITED',
    status: 429,
    expectedMessage: ERR_POST_UPDATE_FAILED,
  },
] satisfies readonly ApiErrorMessageCase[];

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('PostComposer bonsaiId・送信分岐', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-post' });
    mockUpdateMutateAsync.mockResolvedValue({ id: 'post-1' });
    mockUploadImage.mockResolvedValue('https://example.com/uploaded.jpg');
    mockUploadVideo.mockResolvedValue('https://example.com/uploaded.mp4');
    act(() => {
      onlineManager.setOnline(true);
    });
  });

  afterEach(() => {
    act(() => {
      onlineManager.setOnline(true);
    });
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
    jest.restoreAllMocks();
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
  // 作成・編集エラーのユーザー向けメッセージ
  // -------------------------------------------------------------------------

  describe('作成時の API エラー表示', () => {
    it.each(CREATE_API_ERROR_CASES)(
      '$code を対応するメッセージへ変換する',
      async ({ code, status, expectedMessage, isPremium = false }) => {
        mockCreateMutateAsync.mockRejectedValueOnce(
          new ApiError({ code, status, message: code })
        );
        renderPostComposer({ mode: 'create', isPremium });
        typeContent('本文');

        await submit();

        await waitFor(() => {
          expect(screen.getByText(expectedMessage)).toBeTruthy();
        });
      }
    );

    it('画像アップロード失敗を専用メッセージで表示し、投稿 API を呼ばない', async () => {
      mockUploadImage.mockRejectedValueOnce(new Error(ERR_MEDIA_UPLOAD_FAILED));
      renderPostComposer({
        mode: 'create',
        initialValues: {
          content: '画像付き投稿',
          genreIds: [],
          imageUris: ['file:///local-image.jpg'],
          videoUri: null,
        },
      });

      await submit();

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith({ localUri: 'file:///local-image.jpg' });
      });
      await waitFor(() => {
        expect(screen.getByText(ERR_MEDIA_UPLOAD_FAILED)).toBeTruthy();
      });
      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('編集時の API エラー表示', () => {
    it.each(UPDATE_API_ERROR_CASES)(
      '$code を対応するメッセージへ変換する',
      async ({ code, status, expectedMessage }) => {
        mockUpdateMutateAsync.mockRejectedValueOnce(
          new ApiError({ code, status, message: code })
        );
        renderPostComposer({
          mode: 'edit',
          postId: 'post-1',
          initialValues: {
            content: '既存の内容',
            genreIds: [],
            imageUris: [],
            videoUri: null,
          },
        });
        typeContent('編集後の内容');

        await submitEdit();

        await waitFor(() => {
          expect(screen.getByText(expectedMessage)).toBeTruthy();
        });
      }
    );

    it('編集時の画像アップロード失敗を専用メッセージで表示し、更新 API を呼ばない', async () => {
      mockUploadImage.mockRejectedValueOnce(new Error(ERR_MEDIA_UPLOAD_FAILED));
      renderPostComposer({
        mode: 'edit',
        postId: 'post-1',
        initialValues: {
          content: '既存の内容',
          genreIds: [],
          imageUris: ['file:///edit-image.jpg'],
          videoUri: null,
        },
      });
      typeContent('編集後の内容');

      await submitEdit();

      await waitFor(() => {
        expect(screen.getByText(ERR_MEDIA_UPLOAD_FAILED)).toBeTruthy();
      });
      expect(mockUploadImage).toHaveBeenCalledWith({ localUri: 'file:///edit-image.jpg' });
      expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    });

    it('未知の例外を通常の更新失敗メッセージへフォールバックする', async () => {
      mockUpdateMutateAsync.mockRejectedValueOnce(new Error('unexpected'));
      renderPostComposer({
        mode: 'edit',
        postId: 'post-1',
        initialValues: {
          content: '既存の内容',
          genreIds: [],
          imageUris: [],
          videoUri: null,
        },
      });
      typeContent('編集後の内容');

      await submitEdit();

      await waitFor(() => {
        expect(screen.getByText(ERR_POST_UPDATE_FAILED)).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // オフライン・キャンセル
  // -------------------------------------------------------------------------

  describe('送信前のガード', () => {
    it('オフラインではエラーを表示し、投稿 API を呼ばない', async () => {
      act(() => {
        onlineManager.setOnline(false);
      });
      renderPostComposer({ mode: 'create' });
      typeContent('本文');

      await submit();

      await waitFor(() => {
        expect(screen.getByText(ERR_OFFLINE_ACTION)).toBeTruthy();
      });
      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('キャンセル', () => {
    it('未変更なら確認ダイアログなしで閉じる', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      renderPostComposer({ mode: 'create' });

      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));

      expect(mockRouterDismiss).toHaveBeenCalledTimes(1);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('iOS で変更済みなら destructive な破棄確認を表示し、確定後に閉じる', () => {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      renderPostComposer({ mode: 'create' });
      typeContent('未保存の本文');

      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));

      expect(alertSpy.mock.calls[0]?.[0]).toBe('投稿を破棄しますか？');
      const buttons = alertSpy.mock.calls[0]?.[2];
      const discardButton = buttons?.find((button) => button.text === '破棄する');
      expect(discardButton?.style).toBe('destructive');
      expect(mockRouterDismiss).not.toHaveBeenCalled();

      act(() => {
        discardButton?.onPress?.();
      });
      expect(mockRouterDismiss).toHaveBeenCalledTimes(1);
    });

    it('Android で変更済みなら破棄確認を表示し、確定後に閉じる', () => {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      renderPostComposer({ mode: 'create' });
      typeContent('未保存の本文');

      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));

      const buttons = alertSpy.mock.calls[0]?.[2];
      const discardButton = buttons?.find((button) => button.text === '破棄する');
      expect(discardButton?.style).toBeUndefined();

      act(() => {
        discardButton?.onPress?.();
      });
      expect(mockRouterDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 既存・ローカルメディアの送信
  // -------------------------------------------------------------------------

  describe('メディア送信', () => {
    it('既存画像は維持し、ローカル画像と動画だけをアップロードして順序どおり送る', async () => {
      renderPostComposer({
        mode: 'create',
        isPremium: true,
        initialValues: {
          content: 'メディア付き投稿',
          genreIds: [],
          imageUris: ['https://example.com/existing.jpg', 'file:///local-image.jpg'],
          videoUri: 'file:///local-video.mp4',
        },
      });

      await submit();

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            mediaUrls: [
              'https://example.com/existing.jpg',
              'https://example.com/uploaded.jpg',
              'https://example.com/uploaded.mp4',
            ],
            mediaTypes: ['image', 'image', 'video'],
          })
        );
      });
      expect(mockUploadImage).toHaveBeenCalledTimes(1);
      expect(mockUploadImage).toHaveBeenCalledWith({ localUri: 'file:///local-image.jpg' });
      expect(mockUploadVideo).toHaveBeenCalledWith({
        localUri: 'file:///local-video.mp4',
        fileSize: 0,
      });
    });

    it('既存の動画 URL は再アップロードせずそのまま送る', async () => {
      renderPostComposer({
        mode: 'create',
        isPremium: true,
        initialValues: {
          content: '既存動画付き投稿',
          genreIds: [],
          imageUris: [],
          videoUri: 'https://example.com/existing.mp4',
        },
      });

      await submit();

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            mediaUrls: ['https://example.com/existing.mp4'],
            mediaTypes: ['video'],
          })
        );
      });
      expect(mockUploadVideo).not.toHaveBeenCalled();
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
