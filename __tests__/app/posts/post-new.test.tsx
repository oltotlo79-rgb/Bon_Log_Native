/**
 * app/posts/new の画面テスト。
 * フィード画面の FAB から遷移する新規投稿モーダル画面の基本要素を確認する。
 * useCurrentUserQuery が TanStack Query を使うため renderWithProviders を使う。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import PostNewScreen from '@/app/posts/new/index';

const mockUseCurrentUserQuery = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

// PostComposer は複雑なので表示確認だけモックする
jest.mock('@/components/post/PostComposer', () => ({
  PostComposer: ({ mode, currentUserId, isPremium }: { mode: string; currentUserId: string; isPremium: boolean }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock ファクトリ内では ESM import が使えないため require を使用する（Jest 制約）
    const { View, Text } = require('react-native');
    return (
      <View>
        <Text testID="post-composer">{`PostComposer mode=${mode} userId=${currentUserId} premium=${String(isPremium)}`}</Text>
      </View>
    );
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCurrentUserQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  });
});

describe('PostNewScreen', () => {
  it('ローディング中は「読み込み中」ラベルが表示される', () => {
    renderWithProviders(<PostNewScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('ユーザーデータ取得エラー時はエラー画面が表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });
    renderWithProviders(<PostNewScreen />);
    expect(screen.getByText('ログインが必要です')).toBeTruthy();
  });

  it('me が undefined（非認証）のときエラー画面が表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<PostNewScreen />);
    expect(screen.getByText('ログインが必要です')).toBeTruthy();
  });

  it('認証成功時に PostComposer が create モードで表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: { id: 'user-1', email: 'test@bon-log.com', nickname: '松の匠', isPremium: false },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<PostNewScreen />);
    expect(screen.getByTestId('post-composer')).toBeTruthy();
    expect(screen.getByText(/mode=create/)).toBeTruthy();
    expect(screen.getByText(/userId=user-1/)).toBeTruthy();
  });

  it('エラー時に再試行ボタンを押すと refetch が呼ばれる', () => {
    const mockRefetch = jest.fn();
    mockUseCurrentUserQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });
    renderWithProviders(<PostNewScreen />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('プレミアムユーザーの場合 isPremium=true で PostComposer が表示される', () => {
    mockUseCurrentUserQuery.mockReturnValue({
      data: { id: 'user-prem', email: 'prem@bon-log.com', nickname: 'プレミアム匠', isPremium: true },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<PostNewScreen />);
    expect(screen.getByText(/premium=true/)).toBeTruthy();
  });
});
