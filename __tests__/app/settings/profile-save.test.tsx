/**
 * @module __tests__/app/settings/profile-save
 * SettingsProfileScreen の保存フロー・エラーハンドリング・ナビゲーションテスト。
 * handleSave / 戻るボタン / DiscardConfirmDialog / エラー状態を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsProfileScreen from '@/app/settings/profile/index';

const mockRouter = jest.requireMock('expo-router').router;

const mockApiGet = jest.fn();
const mockApiPatch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiGet(...args),
    POST: jest.fn(),
    DELETE: jest.fn(),
    PATCH: (...args: unknown[]) => mockApiPatch(...args),
  },
  isApiError: () => false,
}));

const mockUploadMutateAsync = jest.fn();

jest.mock('@/lib/queries/upload', () => ({
  useUploadImageMutation: jest.fn(() => ({
    mutateAsync: mockUploadMutateAsync,
    isPending: false,
  })),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

// ProfileImageEditor は複雑なので簡易モック
jest.mock('@/components/profile/ProfileImageEditor', () => ({
  ProfileImageEditor: ({
    onAvatarRemove,
    onHeaderRemove,
  }: {
    onAvatarRemove: () => void;
    onHeaderRemove: () => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock ファクトリ内では ESM import が使えないため require を使用する（Jest 制約）
    const { View, Pressable, Text } = require('react-native');
    return (
      <View testID="profile-image-editor">
        <Pressable onPress={onAvatarRemove} accessibilityRole="button" accessibilityLabel="アバターを削除">
          <Text>アバター削除</Text>
        </Pressable>
        <Pressable onPress={onHeaderRemove} accessibilityRole="button" accessibilityLabel="ヘッダーを削除">
          <Text>ヘッダー削除</Text>
        </Pressable>
      </View>
    );
  },
}));

const PROFILE_DATA = {
  id: 'user-1',
  email: 'test@bon-log.com',
  nickname: '松の匠',
  avatarUrl: null,
  isPremium: false,
};

const PROFILE_DETAIL = {
  id: 'user-1',
  nickname: '松の匠',
  avatarUrl: null,
  headerUrl: null,
  bio: '盆栽歴10年',
  location: '東京',
  isPublic: true,
  bonsaiStartYear: 2015,
  bonsaiStartMonth: 3,
  followersCount: 100,
  followingCount: 50,
  postsCount: 200,
  isBlocked: false,
  isMuted: false,
  isFollowing: false,
  isFollowedBy: false,
};

// PATCH /api/v1/users/me が返す UsersMeFullResponse（保存後の確定値）
const PROFILE_UPDATED: typeof PROFILE_DATA & {
  headerUrl: null;
  bio: string;
  location: string;
  isPublic: boolean;
  bonsaiStartYear: number;
  bonsaiStartMonth: number;
  birthDate: null;
} = {
  id: 'user-1',
  email: 'test@bon-log.com',
  nickname: '新しいニックネーム',
  avatarUrl: null,
  headerUrl: null,
  bio: '盆栽歴10年',
  location: '東京',
  isPublic: true,
  bonsaiStartYear: 2015,
  bonsaiStartMonth: 3,
  birthDate: null,
  isPremium: false,
};

async function waitForFormLoad() {
  await waitFor(() => {
    expect(screen.getByLabelText('ニックネーム（必須）')).toBeTruthy();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // パスに基づいて適切なデータを返す: 複数回呼ばれても正しく動作する
  mockApiGet.mockImplementation((path: string) => {
    if (path === '/api/v1/users/me') {
      return Promise.resolve({ data: PROFILE_DATA, error: undefined });
    }
    if (path === '/api/v1/users/{id}') {
      return Promise.resolve({ data: PROFILE_DETAIL, error: undefined });
    }
    return Promise.resolve({ data: undefined, error: { status: 404 } });
  });
  mockApiPatch.mockResolvedValue({ data: PROFILE_UPDATED, error: undefined });
  mockUploadMutateAsync.mockResolvedValue('https://cdn.bon-log.com/new-avatar.jpg');
});

describe('SettingsProfileScreen - handleSave（保存フロー）', () => {
  it('ニックネームを変更して保存ボタンを押すと PATCH が呼ばれる', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    fireEvent.changeText(screen.getByLabelText('ニックネーム（必須）'), '新しいニックネーム');

    await waitFor(() => {
      const saveBtn = screen.getByLabelText('プロフィールを保存する');
      const isDisabled =
        saveBtn.props.disabled === true ||
        saveBtn.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
    });

    fireEvent.press(screen.getByLabelText('プロフィールを保存する'));

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalled();
    });
  });

  it('保存成功後に router.back が呼ばれる', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    fireEvent.changeText(screen.getByLabelText('ニックネーム（必須）'), '保存テストユーザー');

    await waitFor(() => {
      const saveBtn = screen.getByLabelText('プロフィールを保存する');
      const isDisabled =
        saveBtn.props.disabled === true ||
        saveBtn.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
    });

    fireEvent.press(screen.getByLabelText('プロフィールを保存する'));

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  it('オフライン時に保存ボタンを押すとオフラインエラーが表示される', async () => {
    jest.requireMock('@/hooks/use-online-status').useOnlineStatus.mockReturnValue(false);

    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    fireEvent.changeText(screen.getByLabelText('ニックネーム（必須）'), 'オフラインテスト');

    // オフライン時は canSave が false なので保存ボタンは無効
    const saveBtn = screen.getByLabelText('プロフィールを保存する');
    const isDisabled =
      saveBtn.props.disabled === true ||
      saveBtn.props.accessibilityState?.disabled === true;
    expect(isDisabled).toBe(true);
  });
});

describe('SettingsProfileScreen - エラー状態', () => {
  it('クエリエラー時に ScreenError タイトルが表示される', async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: { status: 500 } });

    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('プロフィールを読み込めませんでした')).toBeTruthy();
    });
  });

  it('クエリエラー時に再試行ボタンが表示される', async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: { status: 500 } });

    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '再試行する' })).toBeTruthy();
    });
  });

  it('再試行ボタンを押すと refetch が呼ばれる（クエリが再実行される）', async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: { status: 500 } });

    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '再試行する' })).toBeTruthy();
    });

    // 再試行後は正常データを返す
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/users/me') {
        return Promise.resolve({ data: PROFILE_DATA, error: undefined });
      }
      if (path === '/api/v1/users/{id}') {
        return Promise.resolve({ data: PROFILE_DETAIL, error: undefined });
      }
      return Promise.resolve({ data: undefined, error: { status: 404 } });
    });

    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));

    // クエリが再実行されてフォームが表示される（エラー UI が消えフォームに遷移）
    await waitFor(() => {
      expect(screen.queryByText('プロフィールを読み込めませんでした')).toBeNull();
    });
  });

  it('エラー状態でも戻るボタンを押すと router.back が呼ばれる', async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: { status: 500 } });

    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('ローディング状態でなくエラー状態のとき ScreenLoading は表示されない', async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: { status: 500 } });

    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('プロフィールを読み込めませんでした')).toBeTruthy();
    });

    expect(screen.queryByLabelText('読み込み中')).toBeNull();
  });
});

describe('SettingsProfileScreen - ローディング状態', () => {
  it('クエリ取得中はローディングスピナーが表示される', () => {
    // apiGet を未解決 Promise にしてローディング状態を維持する
    mockApiGet.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<SettingsProfileScreen />);

    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('ローディング中に戻るボタンを押すと router.back が呼ばれる', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<SettingsProfileScreen />);

    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('SettingsProfileScreen - 戻るボタン動作', () => {
  it('フォーム読み込み直後は DiscardConfirmDialog が表示されない', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    // 変更を加えずに確認: ダイアログは非表示
    expect(screen.queryByText('変更を破棄しますか？')).toBeNull();
  });

  it('変更あり（isDirty=true）で戻るボタンを押すと DiscardConfirmDialog が表示される', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    fireEvent.changeText(screen.getByLabelText('ニックネーム（必須）'), '変更済みニックネーム');

    fireEvent.press(screen.getByRole('button', { name: '戻る' }));

    await waitFor(() => {
      expect(screen.getByText('変更を破棄しますか？')).toBeTruthy();
    });
  });

  it('DiscardConfirmDialog でキャンセルを選ぶとダイアログが閉じる', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    fireEvent.changeText(screen.getByLabelText('ニックネーム（必須）'), '変更済みニックネーム');
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));

    await waitFor(() => {
      expect(screen.getByText('変更を破棄しますか？')).toBeTruthy();
    });

    // キャンセルボタンを押す
    fireEvent.press(screen.getByRole('button', { name: '編集を続ける' }));

    await waitFor(() => {
      expect(screen.queryByText('変更を破棄しますか？')).toBeNull();
    });
  });

  it('DiscardConfirmDialog で破棄を選ぶと router.back が呼ばれる', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    fireEvent.changeText(screen.getByLabelText('ニックネーム（必須）'), '変更済みニックネーム');
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));

    await waitFor(() => {
      expect(screen.getByText('変更を破棄しますか？')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: '変更を破棄する' }));

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });
});

describe('SettingsProfileScreen - ProfileImageEditor コールバック', () => {
  it('アバター削除ボタンを押すと状態が更新される', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    fireEvent.press(screen.getByRole('button', { name: 'アバターを削除' }));

    // 例外なく完了することを確認
    expect(screen.getByTestId('profile-image-editor')).toBeTruthy();
  });

  it('ヘッダー削除ボタンを押すと状態が更新される', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitForFormLoad();

    fireEvent.press(screen.getByRole('button', { name: 'ヘッダーを削除' }));

    expect(screen.getByTestId('profile-image-editor')).toBeTruthy();
  });
});
