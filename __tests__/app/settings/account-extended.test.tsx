/**
 * @module __tests__/app/settings/account-extended
 * SettingsAccountScreen の追加テスト。
 * アカウント削除フロー（警告ダイアログ → 確認ダイアログ）と
 * エラーハンドリングを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import SettingsAccountScreen from '@/app/settings/account/index';
import { ERR_ACCOUNT_DELETE_FAILED } from '@/lib/constants/errors';

const mockApiDelete = jest.fn();
const mockApiGet = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiGet(...args),
    POST: jest.fn(() => Promise.resolve({ data: undefined, error: undefined })),
    DELETE: (...args: unknown[]) => mockApiDelete(...args),
    PATCH: jest.fn(() => Promise.resolve({ data: undefined, error: undefined })),
  },
  isApiError: () => false,
}));

jest.mock('@/lib/auth/auth', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiGet.mockResolvedValue({
    data: { id: 'user-1', email: 'test@bon-log.com', nickname: '松の匠', avatarUrl: null, isPremium: false },
    error: undefined,
  });
  mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
});

// 警告ダイアログを開くヘルパー
async function openWarningDialog() {
  fireEvent.press(screen.getByRole('button', { name: 'アカウントを削除する' }));
  await waitFor(() => expect(screen.getByText('アカウントを削除しますか？')).toBeTruthy());
}

// 確認ダイアログまで進むヘルパー
async function openConfirmDialog() {
  await openWarningDialog();
  fireEvent.press(screen.getByRole('button', { name: '削除に進む' }));
  await waitFor(() => expect(screen.getByText('本当にアカウントを削除しますか？')).toBeTruthy());
}

describe('SettingsAccountScreen - アカウント削除フロー', () => {
  it('「アカウントを削除する」を押すと警告ダイアログが開く', async () => {
    renderWithProviders(<SettingsAccountScreen />);
    await openWarningDialog();
    expect(screen.getByText(/この操作は取り消せません/)).toBeTruthy();
  });

  it('警告ダイアログでキャンセルを押すとダイアログが閉じる', async () => {
    renderWithProviders(<SettingsAccountScreen />);
    await openWarningDialog();

    fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));

    await waitFor(() => {
      expect(screen.queryByText('アカウントを削除しますか？')).toBeNull();
    });
  });

  it('警告ダイアログで「削除に進む」を押すと確認ダイアログが開く', async () => {
    renderWithProviders(<SettingsAccountScreen />);
    await openConfirmDialog();
    expect(screen.getByText(/「削除する」と入力してください/)).toBeTruthy();
  });

  it('確認ダイアログでキャンセルを押すとダイアログが閉じる', async () => {
    renderWithProviders(<SettingsAccountScreen />);
    await openConfirmDialog();

    fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));

    await waitFor(() => {
      expect(screen.queryByText('本当にアカウントを削除しますか？')).toBeNull();
    });
  });

  it('確認テキストを入力しないと削除ボタンが無効', async () => {
    renderWithProviders(<SettingsAccountScreen />);
    await openConfirmDialog();

    const deleteBtn = screen.getByRole('button', { name: '削除する' });
    const isDisabled =
      deleteBtn.props.disabled === true ||
      deleteBtn.props.accessibilityState?.disabled === true;
    expect(isDisabled).toBe(true);
  });

  it('「削除する」を入力すると削除ボタンが有効になる', async () => {
    renderWithProviders(<SettingsAccountScreen />);
    await openConfirmDialog();

    const input = screen.getByPlaceholderText('削除する');
    fireEvent.changeText(input, '削除する');

    await waitFor(() => {
      const deleteBtn = screen.getByRole('button', { name: '削除する' });
      const isDisabled =
        deleteBtn.props.disabled === true ||
        deleteBtn.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
    });
  });

  it('削除APIが失敗したときはダイアログを維持して再試行できる', async () => {
    mockApiDelete.mockResolvedValue({ data: undefined, error: undefined });
    renderWithProviders(<SettingsAccountScreen />);
    await openConfirmDialog();

    fireEvent.changeText(screen.getByPlaceholderText('削除する'), '削除する');
    fireEvent.press(screen.getByRole('button', { name: '削除する' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_ACCOUNT_DELETE_FAILED)).toBeTruthy();
    });
    expect(screen.getByText('本当にアカウントを削除しますか？')).toBeTruthy();
    expect(screen.getByRole('button', { name: '削除する' })).toBeEnabled();
  });

  it('確認ダイアログに削除することを確認するフィールドが表示される', async () => {
    renderWithProviders(<SettingsAccountScreen />);
    await openConfirmDialog();

    // 削除確認入力フィールドが表示される
    expect(screen.getByPlaceholderText('削除する')).toBeTruthy();
    expect(screen.getByText(/「削除する」と入力してください/)).toBeTruthy();
  });
});
