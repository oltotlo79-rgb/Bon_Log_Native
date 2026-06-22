/**
 * app/scheduled-posts/[id]/edit/index の予約投稿編集フォームテスト。
 * ローディング・正常表示・バリデーション・キャンセルを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import ScheduledPostEditScreen from '@/app/scheduled-posts/[id]/edit/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseScheduledPostDetailQuery = jest.fn();
const mockUseUpdateScheduledPostMutation = jest.fn();
const mockUseCurrentUserQuery = jest.fn();

jest.mock('@/lib/queries/scheduled-posts', () => ({
  useScheduledPostDetailQuery: (...args: unknown[]) => mockUseScheduledPostDetailQuery(...args),
  useUpdateScheduledPostMutation: () => mockUseUpdateScheduledPostMutation(),
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/lib/queries/upload', () => ({
  uploadImage: jest.fn(),
  uploadVideo: jest.fn(),
}));

jest.mock('@/hooks/use-post-composer', () => ({
  usePostComposer: jest.fn(() => ({
    content: '予約投稿の内容',
    setContent: jest.fn(),
    selectedGenres: [],
    setSelectedGenres: jest.fn(),
    images: [],
    videoUri: null,
    videoFileSize: null,
    isDirty: false,
    maxImages: 4,
    handleAddImage: jest.fn(),
    handleRemoveImage: jest.fn(),
    handleAddVideo: jest.fn(),
    handleRemoveVideo: jest.fn(),
  })),
}));

jest.mock('@/components/post/PostBodyInput', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PostBodyInput: ({ value }: { value: string }) => React.createElement(Text, null, value),
  };
});

jest.mock('@/components/post/GenreSelector', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    GenreSelector: () => React.createElement(Text, null, 'ジャンル選択'),
  };
});

jest.mock('@/components/post/ImageAttachmentGrid', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ImageAttachmentGrid: () => React.createElement(Text, null, '画像添付'),
  };
});

jest.mock('@/components/post/VideoAttachmentArea', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    VideoAttachmentArea: () => React.createElement(Text, null, '動画添付'),
  };
});

jest.mock('@/components/post/ComposerFormError', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ComposerFormError: ({ message }: { message: string | null }) =>
      message ? React.createElement(Text, null, message) : null,
  };
});

jest.mock('@/lib/api/errors', () => ({
  isApiError: jest.fn(() => false),
}));

function makeScheduledPost(overrides = {}) {
  return {
    id: 'sp-1',
    content: '予約投稿の内容',
    scheduledAt: '2025-09-01T10:00:00Z',
    status: 'pending',
    genres: [],
    media: [],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeCurrentUser(overrides = {}) {
  return {
    id: 'user-1',
    nickname: 'テストユーザー',
    isPremium: true,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ id: 'sp-1' });
  mockUseScheduledPostDetailQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
  });
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
  mockUseUpdateScheduledPostMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe('ScheduledPostEditScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のときローディング表示になる（フォームは表示されない）', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: undefined, isLoading: true });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      // FormBody がマウントされないため「予約投稿を編集」は表示されない
      expect(screen.queryByText('予約投稿を編集')).toBeNull();
    });

    it('post=undefined のときローディング表示になる', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      expect(screen.queryByText('予約投稿を編集')).toBeNull();
    });

    it('currentUser=undefined のときローディング表示になる', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      renderWithProviders(<ScheduledPostEditScreen />);
      expect(screen.queryByText('予約投稿を編集')).toBeNull();
    });
  });

  describe('フォーム表示', () => {
    beforeEach(() => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
    });

    it('「予約投稿を編集」ヘッダーが表示される', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      expect(screen.getByText('予約投稿を編集')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「保存する」ボタンが表示される', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    });

    it('公開予定年の入力フィールドが表示される', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      expect(screen.getByLabelText('公開予定年')).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('isDirty=false でキャンセルすると router.back が呼ばれる', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('date/time フィールド入力', () => {
    beforeEach(() => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
    });

    it('年フィールドが表示される', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      expect(screen.getByLabelText('公開予定年')).toBeTruthy();
    });

    it('月フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '6');
      expect(screen.getByLabelText('公開予定月')).toBeTruthy();
    });

    it('日フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '15');
      expect(screen.getByLabelText('公開予定日')).toBeTruthy();
    });

    it('時フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '10');
      expect(screen.getByLabelText('公開予定時')).toBeTruthy();
    });

    it('分フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '30');
      expect(screen.getByLabelText('公開予定分')).toBeTruthy();
    });
  });

  describe('handleSave — 過去日時エラー', () => {
    it('コンテンツと過去の日時を入力して保存すると「現在より未来」エラーが表示される', () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '更新された内容',
        setContent: jest.fn(),
        selectedGenres: [],
        setSelectedGenres: jest.fn(),
        images: [],
        videoUri: null,
        videoFileSize: null,
        isDirty: false,
        maxImages: 4,
        handleAddImage: jest.fn(),
        handleRemoveImage: jest.fn(),
        handleAddVideo: jest.fn(),
        handleRemoveVideo: jest.fn(),
      });
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      // 過去の日時を設定
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '0');
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '0');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(screen.getByText('公開予定日時は現在より未来に設定してください。')).toBeTruthy();
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が配列のとき空文字として扱いローディング状態になる', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['sp-1', 'sp-2'] });
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: undefined, isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
      renderWithProviders(<ScheduledPostEditScreen />);
      // ローディング状態なのでフォームは非表示
      expect(screen.queryByText('予約投稿を編集')).toBeNull();
    });
  });

  describe('handleCancel — isDirty=true', () => {
    it('isDirty=true のときキャンセルすると Alert が表示される', () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '変更済みコンテンツ',
        setContent: jest.fn(),
        selectedGenres: [],
        setSelectedGenres: jest.fn(),
        images: [],
        videoUri: null,
        videoFileSize: null,
        isDirty: true,
        maxImages: 4,
        handleAddImage: jest.fn(),
        handleRemoveImage: jest.fn(),
        handleAddVideo: jest.fn(),
        handleRemoveVideo: jest.fn(),
      });
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons, options) => {
        alertCalls.push([title, message, buttons, options]);
      });
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertCalls.length).toBeGreaterThan(0);
      expect(alertCalls[0]?.[0]).toBe('変更を破棄しますか？');
      jest.restoreAllMocks();
    });

    it('Alert の「破棄する」で router.back が呼ばれる', () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '変更済みコンテンツ',
        setContent: jest.fn(),
        selectedGenres: [],
        setSelectedGenres: jest.fn(),
        images: [],
        videoUri: null,
        videoFileSize: null,
        isDirty: true,
        maxImages: 4,
        handleAddImage: jest.fn(),
        handleRemoveImage: jest.fn(),
        handleAddVideo: jest.fn(),
        handleRemoveVideo: jest.fn(),
      });
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons, options) => {
        alertCalls.push([title, message, buttons, options]);
      });
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      const options = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const discardOption = options?.find((o) => o.text === '破棄する');
      discardOption?.onPress?.();
      expect(mockRouter.back).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe('handleSave — オフライン', () => {
    it('オフライン時に保存するとエラーが表示される', async () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      // 未来の日時を設定
      fireEvent.changeText(screen.getByLabelText('公開予定年'), '2030');
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '6');
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '10');
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '0');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      await waitFor(() => {
        expect(screen.getByText('現在オフライン中のため、この操作はできません。接続を確認してください。')).toBeTruthy();
      });
    });
  });

  describe('handleSave — 無効な月（buildScheduledAtISO null）', () => {
    it('無効な月を入力した場合 ISO が null でエラーが表示される', async () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), '2030');
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '13');
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '10');
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '0');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      await waitFor(() => {
        expect(screen.getByText(/正しく入力/)).toBeTruthy();
      });
    });
  });
});
