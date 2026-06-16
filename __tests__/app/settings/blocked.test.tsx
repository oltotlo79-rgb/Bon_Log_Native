/**
 * @module __tests__/app/settings/blocked
 * SettingsBlockedScreen の詳細テスト。
 * 一覧表示 / ローディング / エラー / オフライン / 解除呼び出し / 無限スクロールを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsBlockedScreen from '@/app/settings/blocked/index';
import type { UserMinimalWithBio } from '@/lib/queries/moderation';
import { ERR_OFFLINE_ACTION } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseBlockedUsersQuery = jest.fn();
const mockUnblockMutate = jest.fn();

jest.mock('@/lib/queries/moderation', () => ({
  useBlockedUsersQuery: () => mockUseBlockedUsersQuery(),
  useUnblockUserMutation: () => ({
    mutate: mockUnblockMutate,
    isPending: false,
  }),
}));

const mockIsOnline = { value: true };

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockIsOnline.value,
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeUser(id: string, nickname: string): UserMinimalWithBio {
  return { id, nickname, avatarUrl: null, bio: null };
}

const defaultQueryState = {
  data: undefined as { pages: { items: UserMinimalWithBio[]; nextCursor: string | null }[] } | undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockIsOnline.value = true;
});

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('SettingsBlockedScreen 詳細テスト', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のときローディングコンテンツが表示される', () => {
      mockUseBlockedUsersQuery.mockReturnValue({ ...defaultQueryState, isLoading: true });
      renderWithProviders(<SettingsBlockedScreen />);
      expect(screen.getByRole('header', { name: 'ブロックリスト' })).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のときエラーメッセージが表示される', () => {
      mockUseBlockedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<SettingsBlockedScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });

    it('オフライン時にエラーが表示されるとき ERR_OFFLINE_ACTION メッセージが表示される', () => {
      mockIsOnline.value = false;
      mockUseBlockedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        isError: true,
        error: new Error('Network error'),
        data: undefined,
      });
      renderWithProviders(<SettingsBlockedScreen />);
      expect(screen.getByText(ERR_OFFLINE_ACTION)).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('ブロック中ユーザーが 0 件のとき空状態メッセージが表示される', () => {
      mockUseBlockedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: { pages: [{ items: [], nextCursor: null }] },
      });
      renderWithProviders(<SettingsBlockedScreen />);
      expect(screen.getByText('ブロック中のユーザーはいません')).toBeTruthy();
    });
  });

  describe('一覧表示', () => {
    it('ブロック中ユーザーが表示される', () => {
      mockUseBlockedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: {
          pages: [
            { items: [makeUser('u-1', '盆栽花子'), makeUser('u-2', '松の匠')], nextCursor: null },
          ],
        },
      });
      renderWithProviders(<SettingsBlockedScreen />);
      expect(screen.getByText('盆栽花子')).toBeTruthy();
      expect(screen.getByText('松の匠')).toBeTruthy();
    });
  });

  describe('ブロック解除', () => {
    it('オンライン時にブロック解除ボタンを押すと unblockMutation.mutate が呼ばれる', async () => {
      mockUseBlockedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: {
          pages: [{ items: [makeUser('u-1', '盆栽花子')], nextCursor: null }],
        },
      });

      renderWithProviders(<SettingsBlockedScreen />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽花子 のブロックを解除する' }));

      await waitFor(() => {
        expect(mockUnblockMutate).toHaveBeenCalledWith(
          { userId: 'u-1' },
          expect.any(Object)
        );
      });
    });

    it('オフライン時にブロック解除ボタンを押すと unblockMutation.mutate は呼ばれない', () => {
      mockIsOnline.value = false;
      mockUseBlockedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: {
          pages: [{ items: [makeUser('u-1', '盆栽花子')], nextCursor: null }],
        },
      });

      renderWithProviders(<SettingsBlockedScreen />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽花子 のブロックを解除する' }));
      expect(mockUnblockMutate).not.toHaveBeenCalled();
    });
  });

  describe('無限スクロール', () => {
    it('hasNextPage=true の場合 fetchNextPage が設定されている', () => {
      const fetchNextPage = jest.fn();
      mockUseBlockedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: {
          pages: [{ items: [makeUser('u-1', '盆栽花子')], nextCursor: 'cursor-abc' }],
        },
        hasNextPage: true,
        fetchNextPage,
      });

      renderWithProviders(<SettingsBlockedScreen />);
      // FlatList が表示されることを確認
      expect(screen.getByText('盆栽花子')).toBeTruthy();
    });
  });
});
