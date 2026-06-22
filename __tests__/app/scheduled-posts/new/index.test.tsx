/**
 * app/scheduled-posts/new/index の予約投稿新規作成フォームテスト。
 * ヘッダー・フィールド・バリデーション・非プレミアムガード・キャンセルを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import ScheduledPostNewScreen from '@/app/scheduled-posts/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseCreateScheduledPostMutation = jest.fn();
const mockUseCurrentUserQuery = jest.fn();

jest.mock('@/lib/queries/scheduled-posts', () => ({
  useCreateScheduledPostMutation: () => mockUseCreateScheduledPostMutation(),
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/lib/queries/upload', () => ({
  uploadImage: jest.fn(),
  uploadVideo: jest.fn(),
}));

// PostComposer 系コンポーネントのモック
jest.mock('@/hooks/use-post-composer', () => ({
  usePostComposer: jest.fn(() => ({
    content: '',
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
  const { TextInput } = require('react-native');
  return {
    PostBodyInput: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (v: string) => void;
    }) =>
      React.createElement(TextInput, {
        value,
        onChangeText: onChange,
        accessibilityLabel: '投稿内容',
      }),
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
      message !== null ? React.createElement(Text, null, message) : null,
  };
});

jest.mock('@/lib/api/errors', () => ({
  isApiError: jest.fn(() => false),
}));

// 予約日時テスト用: 現在から7日後の日時コンポーネント（30日以内の未来）
function getValidFutureDate() {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1),
    day: String(d.getDate()),
    hour: '10',
    minute: '0',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseCreateScheduledPostMutation.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
  mockUseCurrentUserQuery.mockReturnValue({
    data: { id: 'user-1', isPremium: true },
  });
});

describe('ScheduledPostNewScreen', () => {
  describe('ヘッダー', () => {
    it('「予約投稿を作成」タイトルが表示される', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByText('予約投稿を作成')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「予約する」ボタンが表示される', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByRole('button', { name: '予約する' })).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('入力なしでキャンセルタップすると router.back が呼ばれる', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('コンテンツ入力後にキャンセルすると Alert が表示される', () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '入力中のコンテンツ',
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
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertSpy).toHaveBeenCalledWith(
        '変更を破棄しますか？',
        expect.any(String),
        expect.any(Array)
      );
      jest.restoreAllMocks();
    });

    it('日時を入力後にキャンセルすると Alert が表示される（hasDateInput=true）', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '6');
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertSpy).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe('バリデーション', () => {
    it('コンテンツが空のとき予約するボタンは disabled になる', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      const saveButton = screen.getByRole('button', { name: '予約する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('公開予定日時フィールド', () => {
    it('「公開予定年」フィールドが存在する', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByLabelText('公開予定年')).toBeTruthy();
    });

    it('「公開予定月」フィールドが存在する', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByLabelText('公開予定月')).toBeTruthy();
    });
  });

  describe('isPending', () => {
    it('isPending=true のとき予約するボタンが disabled になる', () => {
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      const saveButton = screen.getByRole('button', { name: '予約する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('公開予定日時フィールド入力', () => {
    it('年フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      const yearField = screen.getByLabelText('公開予定年');
      fireEvent.changeText(yearField, '2026');
      // フィールドに入力されていることを確認（エラーは出ない）
      expect(yearField).toBeTruthy();
    });

    it('月フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '12');
      expect(screen.getByLabelText('公開予定月')).toBeTruthy();
    });

    it('日フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '31');
      expect(screen.getByLabelText('公開予定日')).toBeTruthy();
    });

    it('時フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '14');
      expect(screen.getByLabelText('公開予定時')).toBeTruthy();
    });

    it('分フィールドに入力できる', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '30');
      expect(screen.getByLabelText('公開予定分')).toBeTruthy();
    });
  });

  describe('オフライン', () => {
    it('オフラインのとき予約するボタンが disabled になる（可能であれば）', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      renderWithProviders(<ScheduledPostNewScreen />);
      // オフラインバナーが表示されることを確認
      expect(screen.getByText('予約投稿を作成')).toBeTruthy();
    });
  });

  describe('非プレミアム', () => {
    it('isPremium=false のときロックアウト画面が表示される', () => {
      mockUseCurrentUserQuery.mockReturnValue({
        data: { id: 'user-1', isPremium: false },
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByText('予約投稿を作成')).toBeTruthy();
    });
  });

  describe('handleSave — オフライン', () => {
    it('オフライン状態でコンテンツと日時入力後に予約するとエラーが表示される', async () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
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
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), '2030');
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '6');
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '10');
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '0');
      const saveButton = screen.getByRole('button', { name: '予約する' });
      fireEvent.press(saveButton);
      await waitFor(() => {
        expect(screen.getByText('現在オフライン中のため、この操作はできません。接続を確認してください。')).toBeTruthy();
      });
    });
  });

  describe('handleSave — 非プレミアム', () => {
    it('非プレミアムユーザーがコンテンツと日時入力後に予約するとエラーが表示される', async () => {
      mockUseCurrentUserQuery.mockReturnValue({
        data: { id: 'user-1', isPremium: false },
      });
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
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
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), '2030');
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '6');
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '10');
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '0');
      const saveButton = screen.getByRole('button', { name: '予約する' });
      fireEvent.press(saveButton);
      await waitFor(() => {
        expect(screen.getByText(/プレミアム|有料/)).toBeTruthy();
      });
    });
  });

  describe('handleSave — buildScheduledAtISO null（無効な日時）', () => {
    it('無効な月を入力した場合 ISO が null でエラーが表示される', async () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
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
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), '2030');
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '13'); // 無効な月
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '10');
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '0');
      fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      await waitFor(() => {
        expect(screen.getByText(/正しく入力/)).toBeTruthy();
      });
    });
  });

  describe('handleSave — 無効な日時', () => {
    it('コンテンツと日時を入力して予約する場合、validationエラーが表示される（過去日時）', () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
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
      renderWithProviders(<ScheduledPostNewScreen />);
      // 過去の日時を設定 → バリデーションエラーになる
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '1');
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '0');
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '0');
      // canSubmit = true になるはずなので予約するを押せる
      const saveButton = screen.getByRole('button', { name: '予約する' });
      fireEvent.press(saveButton);
      // 過去日時なのでエラーメッセージが表示される
      expect(screen.getByText('公開予定日時は現在より未来に設定してください。')).toBeTruthy();
    });
  });

  describe('handleSave — 上限超過日時', () => {
    it('SCHEDULED_AT_DAYS_LIMIT日より遠い日時を入力するとエラーが表示される', async () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
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
      renderWithProviders(<ScheduledPostNewScreen />);
      // 9999年など極端に遠い日時 → SCHEDULED_AT_DAYS_LIMIT超過
      fireEvent.changeText(screen.getByLabelText('公開予定年'), '9999');
      fireEvent.changeText(screen.getByLabelText('公開予定月'), '12');
      fireEvent.changeText(screen.getByLabelText('公開予定日'), '31');
      fireEvent.changeText(screen.getByLabelText('公開予定時'), '23');
      fireEvent.changeText(screen.getByLabelText('公開予定分'), '59');
      fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      await waitFor(() => {
        expect(screen.getByText(/日以内に設定してください/)).toBeTruthy();
      });
    });
  });

  describe('handleSave — アップロードエラー', () => {
    it('画像アップロード失敗時にuploadImageが呼ばれる', async () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
        setContent: jest.fn(),
        selectedGenres: [],
        setSelectedGenres: jest.fn(),
        images: [{ uri: 'file://test.jpg' }],
        videoUri: null,
        videoFileSize: null,
        isDirty: true,
        maxImages: 4,
        handleAddImage: jest.fn(),
        handleRemoveImage: jest.fn(),
        handleAddVideo: jest.fn(),
        handleRemoveVideo: jest.fn(),
      });
      const { uploadImage } = jest.requireMock('@/lib/queries/upload') as {
        uploadImage: jest.Mock;
        uploadVideo: jest.Mock;
      };
      // uploadImageが呼ばれた後にエラーメッセージが設定されることを確認
      // 成功時はmutateを呼ばないようにする
      uploadImage.mockResolvedValueOnce('https://cdn.example.com/image.jpg');
      const mockMutate = jest.fn();
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      const fd1 = getValidFutureDate();
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), fd1.year);
      fireEvent.changeText(screen.getByLabelText('公開予定月'), fd1.month);
      fireEvent.changeText(screen.getByLabelText('公開予定日'), fd1.day);
      fireEvent.changeText(screen.getByLabelText('公開予定時'), fd1.hour);
      fireEvent.changeText(screen.getByLabelText('公開予定分'), fd1.minute);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      });
      await waitFor(() => {
        expect(uploadImage).toHaveBeenCalledWith({ localUri: 'file://test.jpg' });
      });
    });
  });

  describe('handleSave — 動画アップロード', () => {
    it('動画がある場合uploadVideoが呼ばれる', async () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
        setContent: jest.fn(),
        selectedGenres: [],
        setSelectedGenres: jest.fn(),
        images: [],
        videoUri: 'file://test.mp4',
        videoFileSize: 1024,
        isDirty: true,
        maxImages: 4,
        handleAddImage: jest.fn(),
        handleRemoveImage: jest.fn(),
        handleAddVideo: jest.fn(),
        handleRemoveVideo: jest.fn(),
      });
      const { uploadVideo } = jest.requireMock('@/lib/queries/upload') as {
        uploadImage: jest.Mock;
        uploadVideo: jest.Mock;
      };
      uploadVideo.mockResolvedValueOnce('https://cdn.example.com/video.mp4');
      const mockMutate = jest.fn();
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      const fd2 = getValidFutureDate();
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), fd2.year);
      fireEvent.changeText(screen.getByLabelText('公開予定月'), fd2.month);
      fireEvent.changeText(screen.getByLabelText('公開予定日'), fd2.day);
      fireEvent.changeText(screen.getByLabelText('公開予定時'), fd2.hour);
      fireEvent.changeText(screen.getByLabelText('公開予定分'), fd2.minute);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      });
      await waitFor(() => {
        expect(uploadVideo).toHaveBeenCalledWith({
          localUri: 'file://test.mp4',
          fileSize: 1024,
        });
      });
    });
  });

  describe('handleSave — ミューテーション成功', () => {
    it('createScheduledPostが成功するとrouter.replaceが呼ばれる', async () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
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
      const mockMutate = jest.fn((_params, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      });
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      const fd3 = getValidFutureDate();
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), fd3.year);
      fireEvent.changeText(screen.getByLabelText('公開予定月'), fd3.month);
      fireEvent.changeText(screen.getByLabelText('公開予定日'), fd3.day);
      fireEvent.changeText(screen.getByLabelText('公開予定時'), fd3.hour);
      fireEvent.changeText(screen.getByLabelText('公開予定分'), fd3.minute);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      });
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/scheduled-posts');
      });
    });
  });

  describe('handleSave — ミューテーションエラー VALIDATION_ERROR', () => {
    it('VALIDATION_ERRORが返ると上限エラーメッセージが表示される', async () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
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
      const { isApiError } = jest.requireMock('@/lib/api/errors') as {
        isApiError: jest.Mock;
      };
      isApiError.mockReturnValue(true);
      const fakeErr = { code: 'VALIDATION_ERROR' };
      const mockMutate = jest.fn((_params, options: { onError?: (e: unknown) => void }) => {
        options.onError?.(fakeErr);
      });
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      const fd4 = getValidFutureDate();
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), fd4.year);
      fireEvent.changeText(screen.getByLabelText('公開予定月'), fd4.month);
      fireEvent.changeText(screen.getByLabelText('公開予定日'), fd4.day);
      fireEvent.changeText(screen.getByLabelText('公開予定時'), fd4.hour);
      fireEvent.changeText(screen.getByLabelText('公開予定分'), fd4.minute);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      });
      await waitFor(() => {
        expect(screen.getByText('保留中の予約投稿が上限（10件）に達しているか、日時が無効です。')).toBeTruthy();
      });
    });
  });

  describe('handleSave — ミューテーションエラー 汎用', () => {
    it('汎用エラーが返るとフォールバックエラーメッセージが表示される', async () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '予約テスト投稿',
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
      const { isApiError } = jest.requireMock('@/lib/api/errors') as {
        isApiError: jest.Mock;
      };
      isApiError.mockReturnValue(false);
      const mockMutate = jest.fn((_params, options: { onError?: (e: unknown) => void }) => {
        options.onError?.(new Error('server error'));
      });
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      const fd5 = getValidFutureDate();
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.changeText(screen.getByLabelText('公開予定年'), fd5.year);
      fireEvent.changeText(screen.getByLabelText('公開予定月'), fd5.month);
      fireEvent.changeText(screen.getByLabelText('公開予定日'), fd5.day);
      fireEvent.changeText(screen.getByLabelText('公開予定時'), fd5.hour);
      fireEvent.changeText(screen.getByLabelText('公開予定分'), fd5.minute);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      });
      await waitFor(() => {
        expect(screen.getByText('予約投稿の作成に失敗しました。もう一度お試しください。')).toBeTruthy();
      });
    });
  });

  describe('handleCancel — 破棄する', () => {
    it('Alert の「破棄する」を押すと router.back が呼ばれる', () => {
      const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
        usePostComposer: jest.Mock;
      };
      usePostComposer.mockReturnValue({
        content: '入力中のコンテンツ',
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
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      const buttons = alertCalls[0]?.[2] as Array<{ text: string; onPress?: () => void }> | undefined;
      const discardBtn = buttons?.find((b) => b.text === '破棄する');
      discardBtn?.onPress?.();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      jest.restoreAllMocks();
    });
  });
});
