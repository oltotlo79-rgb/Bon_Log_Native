/**
 * app/scheduled-posts/[id]/edit/index の予約投稿編集フォームテスト。
 * ローディング・正常表示・DateTimeField による日時変更・バリデーション・キャンセルを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import ScheduledPostEditScreen from '@/app/scheduled-posts/[id]/edit/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
};

jest.mock('@/hooks/use-post-composer', () => ({
  usePostComposer: jest.fn(() => ({ ...mockDefaultComposer })),
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

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function mockComposer(overrides: Partial<typeof mockDefaultComposer>) {
  const { usePostComposer } = jest.requireMock('@/hooks/use-post-composer') as {
    usePostComposer: jest.Mock;
  };
  usePostComposer.mockReturnValue({ ...mockDefaultComposer, ...overrides });
}

/** 現在時刻から daysAhead 日後（時刻固定）の Date を返す。 */
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

/** scheduledAt はスクリーンが「未来かつ30日以内」検証を通る値をデフォルトに使う。 */
function makeScheduledPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sp-1',
    content: '予約投稿の内容',
    scheduledAt: futureDate(5).toISOString(),
    status: 'pending',
    genres: [],
    media: [],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeCurrentUser(overrides: Record<string, unknown> = {}) {
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
  mockComposer({});
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

    it('公開予定日時フィールドに既存の scheduledAt が反映される', () => {
      const post = makeScheduledPost({ scheduledAt: new Date(2030, 5, 1, 10, 0).toISOString() });
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: post, isLoading: false });
      renderWithProviders(<ScheduledPostEditScreen />);
      expect(screen.getByLabelText(/^公開予定日時 ＊：2030年6月1日/)).toBeTruthy();
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

  describe('公開予定日時フィールドの変更', () => {
    beforeEach(() => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
    });

    it('タップすると日時ピッカー（iOS スピナー）が開く', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      fireEvent.press(screen.getByLabelText(/^公開予定日時 ＊/));
      expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
    });

    it('日時を変更するとフィールドの表示が更新される', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      selectScheduledAt(futureDate(10));
      const expectedLabel = futureDate(10).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(screen.getByLabelText(new RegExp(`^公開予定日時 ＊：${expectedLabel}`))).toBeTruthy();
    });

    it('日時のみ変更（本文は不変）しても保存ボタンが有効になる', () => {
      renderWithProviders(<ScheduledPostEditScreen />);
      selectScheduledAt(futureDate(10));
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('handleSave — 過去日時エラー', () => {
    it('過去の日時に変更して保存すると「現在より未来」エラーが表示される', () => {
      mockComposer({ content: '更新された内容' });
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      selectScheduledAt(futureDate(-1));
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(screen.getByText('公開予定日時は現在より未来に設定してください。')).toBeTruthy();
    });
  });

  describe('handleSave — 上限超過日時エラー', () => {
    it('30日を超える日時に変更して保存すると上限エラーが表示される', async () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      selectScheduledAt(futureDate(40));
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      await waitFor(() => {
        expect(screen.getByText(/日以内に設定してください/)).toBeTruthy();
      });
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
      mockComposer({ content: '変更済みコンテンツ', isDirty: true });
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
      mockComposer({ content: '変更済みコンテンツ', isDirty: true });
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

    it('日時を変更しただけ（isDirty=false）でキャンセルしても Alert が表示される', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons, options) => {
        alertCalls.push([title, message, buttons, options]);
      });
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      selectScheduledAt(futureDate(15));
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertCalls.length).toBeGreaterThan(0);
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
      selectScheduledAt(futureDate(10));
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      await waitFor(() => {
        expect(screen.getByText('現在オフライン中のため、この操作はできません。接続を確認してください。')).toBeTruthy();
      });
    });
  });

  describe('handleSave — 成功', () => {
    it('保存に成功すると updateScheduledPost が id 付きで呼ばれ、router.back が呼ばれる', async () => {
      const mockUpdate = jest.fn((_params, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      });
      mockUseUpdateScheduledPostMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      mockUseScheduledPostDetailQuery.mockReturnValue({ data: makeScheduledPost(), isLoading: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: makeCurrentUser() });
      renderWithProviders(<ScheduledPostEditScreen />);
      selectScheduledAt(futureDate(10));
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'sp-1' }),
          expect.anything()
        );
      });
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });
});
