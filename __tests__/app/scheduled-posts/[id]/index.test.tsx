/**
 * app/scheduled-posts/[id]/index の予約投稿詳細画面テスト。
 * ローディング・エラー・正常表示（pending/published）・メニュー表示を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import ScheduledPostDetailScreen from '@/app/scheduled-posts/[id]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

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
    content: '予約中の投稿テキスト',
    scheduledAt: '2025-09-01T10:00:00Z',
    status: 'pending',
    genreIds: [],
    media: [],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
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
    isError: false,
    refetch: jest.fn(),
  });
  mockUseCancelScheduledPostMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteScheduledPostMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe('ScheduledPostDetailScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のとき「予約投稿の詳細」ヘッダーが表示される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByText('予約投稿の詳細')).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('正常表示', () => {
    it('投稿内容が表示される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByText('予約中の投稿テキスト')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('ステータスが「予約中」の場合バッジが表示される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost({ status: 'pending' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByText('予約中')).toBeTruthy();
    });

    it('ステータスが「公開済み」の場合バッジが表示される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost({ status: 'published' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByText('公開済み')).toBeTruthy();
    });
  });

  describe('メニューボタン', () => {
    it('status=pending のときメニューボタンが表示される', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost({ status: 'pending' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByRole('button', { name: '操作メニューを開く' })).toBeTruthy();
    });

    it('status=published のときメニューボタンが表示されない', () => {
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost({ status: 'published' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.queryByRole('button', { name: '操作メニューを開く' })).toBeNull();
    });
  });

  describe('メニュー操作', () => {
    it('メニューボタンタップで Alert が呼ばれる', () => {
      const AlertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: makeScheduledPost({ status: 'pending' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '操作メニューを開く' }));
      expect(AlertSpy).toHaveBeenCalled();
      AlertSpy.mockRestore();
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が配列のとき isError になる（空文字 id でエラーが出る）', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['sp-1', 'sp-2'] });
      mockUseScheduledPostDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
      });
      renderWithProviders(<ScheduledPostDetailScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });
});
