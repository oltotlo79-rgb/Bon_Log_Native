/**
 * app/posts/[id] の画面テスト。
 * id パラメータの型ガードと、不正/空 id でのエラーメッセージ表示を検証する。
 * usePostQuery / useCommentsQuery（TanStack Query）を使うため QueryClientProvider が必要。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import PostDetailScreen from '@/app/posts/[id]/index';
import { ERR_POST_NOT_FOUND } from '@/lib/constants/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// useLocalSearchParams のモックを各テストで上書きするためのヘルパー
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

// usePostQuery と useCommentsQuery はネットワーク不要なモック
jest.mock('@/lib/queries/posts', () => ({
  usePostQuery: jest.fn(() => ({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })),
  useDeletePostMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/lib/queries/comments', () => ({
  useCommentsQuery: jest.fn(() => ({
    data: undefined,
    isLoading: true,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
  })),
  useCreateCommentMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useDeleteCommentMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
  useRegisterMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

describe('PostDetailScreen', () => {
  describe('正常系（有効な id）', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'post-abc-123' });
    });

    it('ヘッダーにパンくずエリアが表示される（戻るボタンと共有ボタンが両方存在する）', () => {
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByLabelText('戻る')).toBeTruthy();
      expect(screen.getByLabelText('この投稿を共有')).toBeTruthy();
    });

    it('戻るボタンが表示される', () => {
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('共有ボタンが表示される', () => {
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByRole('button', { name: 'この投稿を共有' })).toBeTruthy();
    });
  });

  describe('異常系（不正な id）', () => {
    it('id が空文字の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('id が配列の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['a', 'b'] });
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('id が undefined の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<PostDetailScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('エラー時に戻るボタンが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<PostDetailScreen />);
      // エラー時はヘッダーとフォールバックの2箇所に戻るボタンが存在する
      expect(screen.getAllByRole('button', { name: '戻る' }).length).toBeGreaterThanOrEqual(1);
    });
  });
});
