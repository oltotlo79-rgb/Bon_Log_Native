/**
 * @module __tests__/app/settings/profile-extended
 * SettingsProfileScreen の追加テスト。
 * プロフィール編集フォームのフィールド表示・エラー状態・保存ボタン制御を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsProfileScreen from '@/app/settings/profile/index';

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

jest.mock('@/lib/queries/upload', () => ({
  useUploadImageMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
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

describe('SettingsProfileScreen - フォーム表示', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // users/me → users/{id} の順に解決する
    mockApiGet
      .mockResolvedValueOnce({ data: PROFILE_DATA, error: undefined })
      .mockResolvedValueOnce({ data: PROFILE_DETAIL, error: undefined });
  });

  it('ローディング中にスクリーンが表示される', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'プロフィールを編集' })).toBeTruthy();
    });
  });

  it('プロフィール読み込み後にニックネームフィールドが表示される', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('ニックネーム（必須）')).toBeTruthy();
    });
  });

  it('プロフィール取得後に戻るボタンが表示される', async () => {
    renderWithProviders(<SettingsProfileScreen />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });
  });

  it('初期状態では保存ボタンが無効（isDirty=false）', async () => {
    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('ニックネーム（必須）')).toBeTruthy();
    });

    const saveBtn = screen.getByLabelText('プロフィールを保存する');
    const isDisabled =
      saveBtn.props.disabled === true ||
      saveBtn.props.accessibilityState?.disabled === true;
    expect(isDisabled).toBe(true);
  });

  it('ニックネームを変更すると保存ボタンが有効になる', async () => {
    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('ニックネーム（必須）')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('ニックネーム（必須）'), '新しいニックネーム');

    await waitFor(() => {
      const saveBtn = screen.getByLabelText('プロフィールを保存する');
      const isDisabled =
        saveBtn.props.disabled === true ||
        saveBtn.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
    });
  });

  it('ニックネームを空にするとバリデーションエラーが表示される', async () => {
    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('ニックネーム（必須）')).toBeTruthy();
    });

    const nicknameField = screen.getByLabelText('ニックネーム（必須）');
    fireEvent.changeText(nicknameField, '');
    fireEvent(nicknameField, 'blur');

    await waitFor(() => {
      expect(screen.queryByText(/ニックネームを入力/)).toBeTruthy();
    });
  });
});

describe('SettingsProfileScreen - 保存ボタン制御', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiGet
      .mockResolvedValueOnce({ data: PROFILE_DATA, error: undefined })
      .mockResolvedValueOnce({ data: PROFILE_DETAIL, error: undefined });
    mockApiPatch.mockResolvedValue({ data: undefined, error: undefined });
  });

  it('50文字を超えるニックネームでは保存ボタンが無効', async () => {
    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('ニックネーム（必須）')).toBeTruthy();
    });

    // 51文字のニックネーム
    const longName = 'あ'.repeat(51);
    fireEvent.changeText(screen.getByLabelText('ニックネーム（必須）'), longName);
    fireEvent(screen.getByLabelText('ニックネーム（必須）'), 'blur');

    await waitFor(() => {
      const saveBtn = screen.getByLabelText('プロフィールを保存する');
      const isDisabled =
        saveBtn.props.disabled === true ||
        saveBtn.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(true);
    });
  });

  it('自己紹介フィールドが表示される', async () => {
    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('自己紹介（任意）')).toBeTruthy();
    });
  });

  it('居住地フィールドが表示される', async () => {
    renderWithProviders(<SettingsProfileScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('居住地（任意）')).toBeTruthy();
    });
  });
});
