/**
 * @module __tests__/app/settings/muted
 * SettingsMutedScreen の詳細テスト。
 * 一覧表示 / ローディング / エラー / オフライン / 解除呼び出し / 無限スクロールを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsMutedScreen from '@/app/settings/muted/index';
import type { UserMinimalWithBio } from '@/lib/queries/moderation';
import { ERR_OFFLINE_ACTION } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseMutedUsersQuery = jest.fn();
const mockUnmuteMutate = jest.fn();

jest.mock('@/lib/queries/moderation', () => ({
  useMutedUsersQuery: () => mockUseMutedUsersQuery(),
  useUnmuteUserMutation: () => ({
    mutate: mockUnmuteMutate,
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

describe('SettingsMutedScreen 詳細テスト', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のときヘッダーが表示される', () => {
      mockUseMutedUsersQuery.mockReturnValue({ ...defaultQueryState, isLoading: true });
      renderWithProviders(<SettingsMutedScreen />);
      expect(screen.getByRole('header', { name: 'ミュートリスト' })).toBeTruthy();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のときエラーメッセージが表示される', () => {
      mockUseMutedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<SettingsMutedScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });

    it('オフライン時にエラーが表示されるとき ERR_OFFLINE_ACTION メッセージが表示される', () => {
      mockIsOnline.value = false;
      mockUseMutedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        isError: true,
        error: new Error('Network error'),
        data: undefined,
      });
      renderWithProviders(<SettingsMutedScreen />);
      expect(screen.getByText(ERR_OFFLINE_ACTION)).toBeTruthy();
    });
  });

  describe('空状態', () => {
    it('ミュート中ユーザーが 0 件のとき空状態メッセージが表示される', () => {
      mockUseMutedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: { pages: [{ items: [], nextCursor: null }] },
      });
      renderWithProviders(<SettingsMutedScreen />);
      expect(screen.getByText('ミュート中のユーザーはいません')).toBeTruthy();
    });
  });

  describe('一覧表示', () => {
    it('ミュート中ユーザーが表示される', () => {
      mockUseMutedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: {
          pages: [
            { items: [makeUser('u-1', '盆栽花子'), makeUser('u-2', '松の匠')], nextCursor: null },
          ],
        },
      });
      renderWithProviders(<SettingsMutedScreen />);
      expect(screen.getByText('盆栽花子')).toBeTruthy();
      expect(screen.getByText('松の匠')).toBeTruthy();
    });
  });

  describe('ミュート解除', () => {
    it('オンライン時にミュート解除ボタンを押すと unmuteMutation.mutate が呼ばれる', async () => {
      mockUseMutedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: {
          pages: [{ items: [makeUser('u-1', '盆栽花子')], nextCursor: null }],
        },
      });

      renderWithProviders(<SettingsMutedScreen />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽花子 のミュートを解除する' }));

      await waitFor(() => {
        expect(mockUnmuteMutate).toHaveBeenCalledWith(
          { userId: 'u-1' },
          expect.any(Object)
        );
      });
    });

    it('オフライン時にミュート解除ボタンを押すと unmuteMutation.mutate は呼ばれない', () => {
      mockIsOnline.value = false;
      mockUseMutedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: {
          pages: [{ items: [makeUser('u-1', '盆栽花子')], nextCursor: null }],
        },
      });

      renderWithProviders(<SettingsMutedScreen />);
      fireEvent.press(screen.getByRole('button', { name: '盆栽花子 のミュートを解除する' }));
      expect(mockUnmuteMutate).not.toHaveBeenCalled();
    });
  });

  describe('無限スクロール', () => {
    it('hasNextPage=true の場合 FlatList が表示される', () => {
      const fetchNextPage = jest.fn();
      mockUseMutedUsersQuery.mockReturnValue({
        ...defaultQueryState,
        data: {
          pages: [{ items: [makeUser('u-1', '盆栽花子')], nextCursor: 'cursor-abc' }],
        },
        hasNextPage: true,
        fetchNextPage,
      });

      renderWithProviders(<SettingsMutedScreen />);
      expect(screen.getByText('盆栽花子')).toBeTruthy();
    });
  });
});
