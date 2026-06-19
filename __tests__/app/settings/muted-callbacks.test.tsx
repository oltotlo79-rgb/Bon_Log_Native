/**
 * @module __tests__/app/settings/muted-callbacks
 * SettingsMutedScreen のコールバック詳細テスト。
 * handleLoadMore / onError / onSettled / FlatList レンダリングを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsMutedScreen from '@/app/settings/muted/index';
import type { UserMinimalWithBio } from '@/lib/queries/moderation';
import { ERR_UNMUTE_FAILED } from '@/lib/constants/errors';

const mockUseMutedUsersQuery = jest.fn();
const mockUnmuteMutate = jest.fn();
const mockFetchNextPage = jest.fn();

jest.mock('@/lib/queries/moderation', () => ({
  useMutedUsersQuery: () => mockUseMutedUsersQuery(),
  useUnmuteUserMutation: () => ({
    mutate: mockUnmuteMutate,
    isPending: false,
  }),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

function makeUser(id: string, nickname: string): UserMinimalWithBio {
  return { id, nickname, avatarUrl: null, bio: null };
}

const defaultQueryState = {
  data: undefined as { pages: { items: UserMinimalWithBio[]; nextCursor: string | null }[] } | undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: mockFetchNextPage,
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SettingsMutedScreen - handleLoadMore', () => {
  it('hasNextPage=true かつ isFetchingNextPage=false のとき FlatList が表示される', () => {
    mockUseMutedUsersQuery.mockReturnValue({
      ...defaultQueryState,
      data: {
        pages: [{ items: [makeUser('u-1', 'ミュートユーザー')], nextCursor: 'cursor-abc' }],
      },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    renderWithProviders(<SettingsMutedScreen />);
    expect(screen.getByText('ミュートユーザー')).toBeTruthy();
  });

  it('hasNextPage=false のとき fetchNextPage は呼ばれない', () => {
    mockUseMutedUsersQuery.mockReturnValue({
      ...defaultQueryState,
      data: {
        pages: [{ items: [makeUser('u-1', 'ミュートユーザー')], nextCursor: null }],
      },
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    renderWithProviders(<SettingsMutedScreen />);
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });
});

describe('SettingsMutedScreen - unmute onError / onSettled', () => {
  it('ミュート解除が成功した後、onSettled が呼ばれる', async () => {
    mockUnmuteMutate.mockImplementation((_params, { onSettled }) => {
      onSettled?.();
    });

    mockUseMutedUsersQuery.mockReturnValue({
      ...defaultQueryState,
      data: {
        pages: [{ items: [makeUser('u-1', 'ミュートユーザー')], nextCursor: null }],
      },
    });

    renderWithProviders(<SettingsMutedScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'ミュートユーザー のミュートを解除する' }));

    await waitFor(() => {
      expect(mockUnmuteMutate).toHaveBeenCalledTimes(1);
    });
  });

  it('ミュート解除が失敗した場合にエラートーストが表示される（onError）', async () => {
    mockUnmuteMutate.mockImplementation((_params, { onError, onSettled }) => {
      onError?.(new Error('Unmute failed'));
      onSettled?.();
    });

    mockUseMutedUsersQuery.mockReturnValue({
      ...defaultQueryState,
      data: {
        pages: [{ items: [makeUser('u-1', 'ミュートユーザー')], nextCursor: null }],
      },
    });

    renderWithProviders(<SettingsMutedScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'ミュートユーザー のミュートを解除する' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_UNMUTE_FAILED)).toBeTruthy();
    });
  });
});

describe('SettingsMutedScreen - FlatList フッター', () => {
  it('isFetchingNextPage=true のとき「読み込み中...」が表示される', () => {
    mockUseMutedUsersQuery.mockReturnValue({
      ...defaultQueryState,
      data: {
        pages: [{ items: [makeUser('u-1', 'ミュートユーザー')], nextCursor: 'cursor-abc' }],
      },
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    renderWithProviders(<SettingsMutedScreen />);
    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('hasNextPage=false かつユーザーが存在するとき「これ以上ありません」が表示される', () => {
    mockUseMutedUsersQuery.mockReturnValue({
      ...defaultQueryState,
      data: {
        pages: [{ items: [makeUser('u-1', 'ミュートユーザー')], nextCursor: null }],
      },
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderWithProviders(<SettingsMutedScreen />);
    expect(screen.getByText('これ以上ありません')).toBeTruthy();
  });
});
