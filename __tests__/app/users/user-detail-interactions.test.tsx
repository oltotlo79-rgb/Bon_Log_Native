/**
 * @module __tests__/app/users/user-detail-interactions
 * UserDetailScreen のインタラクションテスト。
 * メニューボタン / 戻るボタン / data=undefined 状態 / エラー状態 を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import UserDetailScreen from '@/app/users/[id]/index';
import { makeUserProfile } from '@/__tests__/utils/data-factories';
import { ApiError } from '@/lib/api/errors';
import { routeMessageThread } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

// UserActionMenu をモックして副作用を排除する
jest.mock('@/components/user/UserActionMenu', () => ({
  UserActionMenu: ({
    targetUserNickname,
    onClose,
  }: {
    targetUserNickname: string;
    onClose: () => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock ファクトリ内では ESM import が使えないため require を使用する（Jest 制約）
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="user-action-menu">
        <Text>{targetUserNickname}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="メニューを閉じる">
          <Text>閉じる</Text>
        </Pressable>
      </View>
    );
  },
}));

const mockUseUserProfileQuery = jest.fn();
jest.mock('@/lib/queries/users', () => ({
  useUserProfileQuery: () => mockUseUserProfileQuery(),
}));

const mockUseCurrentUserQuery = jest.fn();
jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

const mockStartConversationMutate = jest.fn();
jest.mock('@/lib/queries/messages', () => ({
  useStartConversationMutation: () => ({
    mutate: (...args: unknown[]) => mockStartConversationMutate(...args),
    isPending: false,
  }),
}));

const mockRefetch = jest.fn();

const defaultProfileState = {
  data: undefined as ReturnType<typeof makeUserProfile> | undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: mockRefetch,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'user-xyz-456' });
  mockUseCurrentUserQuery.mockReturnValue({
    data: { id: 'me-1', nickname: '自分', avatarUrl: null, bio: null, isPremium: false },
  });
});

describe('UserDetailContent - 戻るボタン', () => {
  it('ヘッダーの戻るボタンを押すと router.back が呼ばれる（ローディング中）', () => {
    mockUseUserProfileQuery.mockReturnValue({ ...defaultProfileState, isLoading: true });
    renderWithProviders(<UserDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('ヘッダーの戻るボタンを押すと router.back が呼ばれる（エラー状態）', () => {
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      isError: true,
      error: new Error('Network error'),
    });
    renderWithProviders(<UserDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('ヘッダーの戻るボタンを押すと router.back が呼ばれる（正常表示）', () => {
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      data: makeUserProfile({ nickname: '松の匠' }),
    });
    renderWithProviders(<UserDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('UserDetailContent - メニューボタン', () => {
  it('メニューボタンを押すと UserActionMenu が表示される', async () => {
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      data: makeUserProfile({ isSelf: false, nickname: 'ターゲット' }),
    });
    renderWithProviders(<UserDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'メニューを開く' }));

    await waitFor(() => {
      expect(screen.getByTestId('user-action-menu')).toBeTruthy();
    });
  });

  it('UserActionMenu の閉じるボタンを押すとメニューが閉じる', async () => {
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      data: makeUserProfile({ isSelf: false, nickname: 'ターゲット' }),
    });
    renderWithProviders(<UserDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'メニューを開く' }));

    await waitFor(() => {
      expect(screen.getByTestId('user-action-menu')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'メニューを閉じる' }));

    await waitFor(() => {
      expect(screen.queryByTestId('user-action-menu')).toBeNull();
    });
  });

  it('自分のプロフィール（isSelf=true）ではメニューボタンが表示されない', () => {
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      data: makeUserProfile({ isSelf: true }),
    });
    renderWithProviders(<UserDetailScreen />);
    expect(screen.queryByRole('button', { name: 'メニューを開く' })).toBeNull();
  });
});

describe('UserDetailContent - data=undefined 状態', () => {
  it('data が undefined のときエラー画面が表示される（isLoading=false, isError=false）', () => {
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      data: undefined,
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<UserDetailScreen />);
    expect(screen.getByText('読み込めませんでした')).toBeTruthy();
  });
});

describe('UserDetailContent - エラー refetch', () => {
  it('エラー状態で再試行ボタンを押すと refetch が呼ばれる', async () => {
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      isError: true,
      error: new Error('Network error'),
    });
    renderWithProviders(<UserDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: '再試行' }));

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('NOT_FOUND エラーで再試行ボタンを押すと refetch が呼ばれる', async () => {
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      isError: true,
      error: new ApiError({ code: 'NOT_FOUND', status: 404, message: 'Not found' }),
    });
    renderWithProviders(<UserDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: '再試行' }));

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});

describe('UserDetailContent - メッセージボタン', () => {
  it('メッセージボタンタップで startConversation が targetUserId を引数に呼ばれる', async () => {
    const profile = makeUserProfile({
      isSelf: false,
      nickname: '松の匠',
      avatarUrl: null,
    });
    mockUseUserProfileQuery.mockReturnValue({
      ...defaultProfileState,
      data: profile,
    });

    mockStartConversationMutate.mockImplementation(
      (_args: unknown, { onSuccess }: { onSuccess: (r: { conversationId: string }) => void }) => {
        onSuccess({ conversationId: 'conv-new' });
      }
    );

    renderWithProviders(<UserDetailScreen />);

    const msgButton = screen.getByLabelText('松の匠にメッセージを送る');
    fireEvent.press(msgButton);

    await waitFor(() => {
      expect(mockStartConversationMutate).toHaveBeenCalledWith(
        { targetUserId: 'user-xyz-456' },
        expect.any(Object)
      );
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      routeMessageThread('conv-new', {
        nickname: '松の匠',
        avatarUrl: null,
        userId: 'user-xyz-456',
      })
    );
  });
});

describe('UserDetailScreen - 無効な id（トップレベル renderHeader）', () => {
  it('空の id のとき「戻る」ボタンが表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '' });
    renderWithProviders(<UserDetailScreen />);
    // ヘッダーの戻るボタンと本文の戻るボタンの両方が表示される
    expect(screen.getAllByRole('button', { name: '戻る' }).length).toBeGreaterThan(0);
  });

  it('空の id のとき戻るボタンを押すと router.back が呼ばれる', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '' });
    renderWithProviders(<UserDetailScreen />);
    const backBtn = screen.getAllByRole('button', { name: '戻る' })[0];
    fireEvent.press(backBtn);
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
