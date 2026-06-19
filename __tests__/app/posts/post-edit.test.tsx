/**
 * app/posts/[id]/edit の画面テスト。
 * id パラメータの型ガードと、不正/空 id でのエラー表示を検証する。
 * usePostQuery / useCurrentUserQuery が TanStack Query を使うため renderWithProviders を使う。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import PostEditScreen from '@/app/posts/[id]/edit/index';
import { ERR_POST_NOT_FOUND } from '@/lib/constants/errors';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: jest.fn(() => ({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock('@/lib/queries/posts', () => ({
  ...jest.requireActual('@/lib/queries/posts'),
  usePostQuery: jest.fn(() => ({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })),
  useCreatePostMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useUpdatePostMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useDeletePostMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

describe('PostEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'post-abc-123' });
  });

  describe('正常系（有効な id）', () => {
    it('ローディング中は「読み込み中」ラベルが表示される', () => {
      renderWithProviders(<PostEditScreen />);
      expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    });
  });

  describe('異常系（不正な id）', () => {
    it('id が空文字の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<PostEditScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('id が配列の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['a', 'b'] });
      renderWithProviders(<PostEditScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('id が undefined の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      renderWithProviders(<PostEditScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('エラー時にエラータイトルが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<PostEditScreen />);
      expect(screen.getByRole('header', { name: '投稿が見つかりません' })).toBeTruthy();
    });

    it('エラー時に再試行ボタンが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<PostEditScreen />);
      expect(screen.getByRole('button', { name: '再試行する' })).toBeTruthy();
    });
  });
});
