/**
 * app/scheduled-posts/[id]/index のメニューハンドラーテスト。
 * handleEdit / handleCancel / handleDelete / isValidStatus / formatScheduledAt を検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import ScheduledPostDetailScreen from '@/app/scheduled-posts/[id]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockCancelPost = jest.fn();
const mockDeletePost = jest.fn();
const mockUseScheduledPostDetailQuery = jest.fn();
const mockUseCancelScheduledPostMutation = jest.fn();
const mockUseDeleteScheduledPostMutation = jest.fn();

jest.mock('@/lib/queries/scheduled-posts', () => ({
  useScheduledPostDetailQuery: (...args: unknown[]) => mockUseScheduledPostDetailQuery(...args),
  useCancelScheduledPostMutation: () => mockUseCancelScheduledPostMutation(),
  useDeleteScheduledPostMutation: () => mockUseDeleteScheduledPostMutation(),
}));

function makeScheduledPost(overrides = {}) {
  return {
    id: 'sp-1',
    content: '予約中の投稿',
    scheduledAt: '2025-09-01T10:00:00Z',
    status: 'pending',
    genreIds: [],
    media: [],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function setupPendingPost() {
  mockUseLocalSearchParams.mockReturnValue({ id: 'sp-1' });
  mockUseScheduledPostDetailQuery.mockReturnValue({
    data: makeScheduledPost({ status: 'pending' }),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseCancelScheduledPostMutation.mockReturnValue({ mutate: mockCancelPost, isPending: false });
  mockUseDeleteScheduledPostMutation.mockReturnValue({ mutate: mockDeletePost, isPending: false });
}

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  setupPendingPost();
});

describe('ScheduledPostDetailScreen - メニューハンドラー', () => {
  describe('handleMenu → handleEdit', () => {
    it('メニューから「編集する」を押すと router.push が呼ばれる', () => {
      let capturedOptions: { text: string; onPress?: () => void }[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation(
        (_title, _msg, options) => {
          capturedOptions = (options ?? []) as typeof capturedOptions;
        }
      );
      renderWithProviders(<ScheduledPostDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '操作メニューを開く' }));
      const editOption = capturedOptions.find((opt) => opt.text === '編集する');
      editOption?.onPress?.();
      expect(mockRouter.push).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe('handleMenu → handleCancel', () => {
    it('メニューから「予約を取り消す」を押すと確認 Alert が表示される', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '操作メニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const cancelOption = menuOptions?.find((opt) => opt.text === '予約を取り消す');
      cancelOption?.onPress?.();
      expect(alertCalls.length).toBeGreaterThanOrEqual(2);
      jest.restoreAllMocks();
    });

    it('handleCancel 内の確認で「取り消す」を押すと cancelPost が呼ばれる', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '操作メニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const cancelScheduleOption = menuOptions?.find((opt) => opt.text === '予約を取り消す');
      cancelScheduleOption?.onPress?.();
      const confirmOptions = alertCalls[1]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const executeOption = confirmOptions?.find((opt) => opt.text === '取り消す');
      executeOption?.onPress?.();
      expect(mockCancelPost).toHaveBeenCalledWith(
        { id: 'sp-1' },
        expect.any(Object)
      );
      jest.restoreAllMocks();
    });
  });

  describe('handleMenu → handleDelete', () => {
    it('メニューから「削除する」を押すと確認 Alert が表示される', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '操作メニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const deleteOption = menuOptions?.find((opt) => opt.text === '削除する');
      deleteOption?.onPress?.();
      expect(alertCalls.length).toBeGreaterThanOrEqual(2);
      jest.restoreAllMocks();
    });

    it('削除確認で「削除する」を押すと deletePost が呼ばれる', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '操作メニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const deleteMenuOption = menuOptions?.find((opt) => opt.text === '削除する');
      deleteMenuOption?.onPress?.();
      const confirmOptions = alertCalls[1]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const executeDelete = confirmOptions?.find((opt) => opt.text === '削除する');
      executeDelete?.onPress?.();
      expect(mockDeletePost).toHaveBeenCalledWith(
        { id: 'sp-1' },
        expect.any(Object)
      );
      jest.restoreAllMocks();
    });
  });

  describe('オフライン時のメニュー操作', () => {
    it('オフライン時に handleCancel を呼ぶとオフライン Alert が表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);

      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '操作メニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const cancelOption = menuOptions?.find((opt) => opt.text === '予約を取り消す');
      cancelOption?.onPress?.();
      expect(alertCalls[1]?.[0]).toBe('エラー');
      jest.restoreAllMocks();
    });
  });

  describe('formatScheduledAt — 公開予定日時の表示', () => {
    it('有効な ISO 日時が日本語表示に変換される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost({ status: 'pending', scheduledAt: '2025-09-15T14:30:00Z' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      // 日本語フォーマット（年月日 HH:MM）が表示される
      expect(screen.getByText(/2025年.*月.*日/)).toBeTruthy();
    });
  });

  describe('isValidStatus — 不明なステータスのガード', () => {
    it('status が不明な値のときエラー表示になる', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost({ status: 'unknown_status' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('mediaItems の表示', () => {
    it('メディアがある場合に添付メディアが表示される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost({
          status: 'pending',
          media: [{ url: 'https://example.com/image.jpg', type: 'image' }],
        }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByLabelText('添付メディア 1')).toBeTruthy();
    });
  });
});
