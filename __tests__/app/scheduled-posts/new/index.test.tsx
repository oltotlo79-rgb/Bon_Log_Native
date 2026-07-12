/**
 * app/scheduled-posts/new/index の予約投稿新規作成フォームテスト。
 * ヘッダー・DateTimeField による日時選択・バリデーション・非プレミアムガード・
 * 送信条件（本文またはメディア）・キャンセルを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import ScheduledPostNewScreen from '@/app/scheduled-posts/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

type MockComposerState = {
  content: string;
  setContent: jest.Mock;
  selectedGenres: string[];
  setSelectedGenres: jest.Mock;
  images: { uri: string; localId: string }[];
  videoUri: string | null;
  videoFileSize: number | null;
  isDirty: boolean;
  maxImages: number;
  handleAddImage: jest.Mock;
  handleRemoveImage: jest.Mock;
  handleAddVideo: jest.Mock;
  handleRemoveVideo: jest.Mock;
};

const mockDefaultComposer: MockComposerState = {
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
};

// PostComposer 系コンポーネントのモック
jest.mock('@/hooks/use-post-composer', () => ({
  usePostComposer: jest.fn(() => ({ ...mockDefaultComposer })),
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

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function mockComposer(overrides: Partial<typeof mockDefaultComposer>) {
  const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
    usePostComposer: jest.Mock;
  };
  usePostComposer.mockReturnValue({ ...mockDefaultComposer, ...overrides });
}

/** 現在時刻から daysAhead 日後（時刻固定）の Date を返す。境界値テストでの再現性のため分単位まで固定する。 */
function futureDate(daysAhead: number, hour = 10, minute = 0): Date {
  const d = new Date(Date.now() + daysAhead * MS_PER_DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** 公開予定日時フィールドを開き、iOS スピナーモックへ date を渡して確定する。 */
function selectScheduledAt(date: Date) {
  fireEvent.press(screen.getByLabelText(/^公開予定日時 ＊/));
  const picker = screen.getByTestId('mock-datetimepicker');
  fireEvent(picker, 'change', {}, date);
  fireEvent.press(screen.getByLabelText('公開予定日時 ＊の選択を完了'));
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
  mockComposer({});
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
      mockComposer({ content: '入力中のコンテンツ', isDirty: true });
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

    it('日時を選択後にキャンセルすると Alert が表示される（hasScheduledAt=true）', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
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

    it('本文があっても日時未選択のときは予約するボタンが disabled になる', () => {
      mockComposer({ content: '予約したい内容' });
      renderWithProviders(<ScheduledPostNewScreen />);
      const saveButton = screen.getByRole('button', { name: '予約する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('本文と日時の両方があると予約するボタンが有効になる', () => {
      mockComposer({ content: '予約したい内容' });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
      const saveButton = screen.getByRole('button', { name: '予約する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('本文が空でも画像があれば予約するボタンが有効になる（送信条件は本文またはメディア）', () => {
      mockComposer({ images: [{ uri: 'file://test.jpg', localId: 'img-1' }] });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
      const saveButton = screen.getByRole('button', { name: '予約する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('本文が空でも動画があれば予約するボタンが有効になる（送信条件は本文またはメディア）', () => {
      mockComposer({ videoUri: 'file://test.mp4', videoFileSize: 1024 });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
      const saveButton = screen.getByRole('button', { name: '予約する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('公開予定日時フィールド', () => {
    it('「公開予定日時 ＊」フィールドが存在する', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByLabelText(/^公開予定日時 ＊：日時を選択/)).toBeTruthy();
    });

    it('タップすると日時ピッカー（iOS スピナー）が開く', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.press(screen.getByLabelText(/^公開予定日時 ＊/));
      expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
    });

    it('日時を選択するとフィールドの表示が更新される', () => {
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(new Date(2030, 5, 1, 10, 0));
      expect(screen.getByLabelText(/^公開予定日時 ＊：2030年6月1日/)).toBeTruthy();
    });

    it('クリアボタンで日時を削除すると予約するボタンが再び disabled になる', () => {
      mockComposer({ content: '予約したい内容' });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
      expect(screen.getByRole('button', { name: '予約する' }).props.accessibilityState?.disabled).toBe(false);
      fireEvent.press(screen.getByLabelText('公開予定日時を削除'));
      expect(screen.getByRole('button', { name: '予約する' }).props.accessibilityState?.disabled).toBe(true);
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

  describe('オフライン', () => {
    it('オフラインのときも画面自体は表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByText('予約投稿を作成')).toBeTruthy();
    });
  });

  describe('非プレミアム', () => {
    it('isPremium=false のときも画面自体は表示される', () => {
      mockUseCurrentUserQuery.mockReturnValue({
        data: { id: 'user-1', isPremium: false },
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.getByText('予約投稿を作成')).toBeTruthy();
    });

    it('isPremium=false のとき動画添付エリアが表示されない', () => {
      mockUseCurrentUserQuery.mockReturnValue({
        data: { id: 'user-1', isPremium: false },
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      expect(screen.queryByText('動画添付')).toBeNull();
    });
  });

  describe('handleSave — オフライン', () => {
    it('オフライン状態でコンテンツと日時入力後に予約するとエラーが表示される', async () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      mockComposer({ content: '予約テスト投稿', isDirty: true });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
      fireEvent.press(screen.getByRole('button', { name: '予約する' }));
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
      mockComposer({ content: '予約テスト投稿', isDirty: true });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
      fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      await waitFor(() => {
        expect(screen.getByText(/プレミアム|有料/)).toBeTruthy();
      });
    });
  });

  describe('handleSave — 無効な日時', () => {
    it('過去の日時を選択すると「未来に設定してください」エラーが表示される', () => {
      mockComposer({ content: '予約テスト投稿' });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(-1));
      fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      expect(screen.getByText('公開予定日時は現在より未来に設定してください。')).toBeTruthy();
    });

    it('SCHEDULED_AT_DAYS_LIMIT（30日）を超える日時を選択すると上限エラーが表示される', async () => {
      mockComposer({ content: '予約テスト投稿', isDirty: true });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(40));
      fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      await waitFor(() => {
        expect(screen.getByText(/日以内に設定してください/)).toBeTruthy();
      });
    });
  });

  describe('handleSave — アップロードエラー', () => {
    it('画像がある場合、送信時に uploadImage が呼ばれる', async () => {
      mockComposer({
        content: '予約テスト投稿',
        images: [{ uri: 'file://test.jpg', localId: 'img-1' }],
        isDirty: true,
      });
      const { uploadImage } = jest.requireMock('@/lib/queries/upload') as {
        uploadImage: jest.Mock;
        uploadVideo: jest.Mock;
      };
      uploadImage.mockResolvedValueOnce('https://cdn.example.com/image.jpg');
      const mockMutate = jest.fn();
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
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
      mockComposer({
        content: '予約テスト投稿',
        videoUri: 'file://test.mp4',
        videoFileSize: 1024,
        isDirty: true,
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
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
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
      mockComposer({ content: '予約テスト投稿', isDirty: true });
      const mockMutate = jest.fn((_params, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      });
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      });
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/scheduled-posts');
      });
    });

    it('createScheduledPostに content・genreIds・mediaUrls・mediaTypes・scheduledAt が渡される', async () => {
      mockComposer({ content: '予約テスト投稿', selectedGenres: ['genre-1'], isDirty: true });
      const mockMutate = jest.fn();
      mockUseCreateScheduledPostMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '予約する' }));
      });
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            content: '予約テスト投稿',
            genreIds: ['genre-1'],
            mediaUrls: [],
            mediaTypes: [],
          }),
          expect.anything()
        );
      });
    });
  });

  describe('handleSave — ミューテーションエラー VALIDATION_ERROR', () => {
    it('VALIDATION_ERRORが返ると上限エラーメッセージが表示される', async () => {
      mockComposer({ content: '予約テスト投稿', isDirty: true });
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
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
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
      mockComposer({ content: '予約テスト投稿', isDirty: true });
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
      renderWithProviders(<ScheduledPostNewScreen />);
      selectScheduledAt(futureDate(7));
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
      mockComposer({ content: '入力中のコンテンツ', isDirty: true });
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<ScheduledPostNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      const buttons = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const discardBtn = buttons?.find((b) => b.text === '破棄する');
      discardBtn?.onPress?.();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      jest.restoreAllMocks();
    });
  });
});
