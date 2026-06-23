/**
 * components/settings/NotificationTypeSettings のユニットテスト。
 * useNotificationSettingsQuery / useUpdateNotificationSettingsMutation は mock 境界。
 */

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { NotificationTypeSettings } from '@/components/settings/NotificationTypeSettings';
import { NOTIFICATION_PREFERENCE_KEYS } from '@/lib/constants/notification-settings';
import {
  ERR_OFFLINE_ACTION,
  ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED,
  ERR_RATE_LIMIT,
} from '@/lib/constants/errors';
import { ApiError } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseNotificationSettingsQuery = jest.fn();
const mockUpdateMutate = jest.fn();
let mockUpdateIsPending = false;

jest.mock('@/lib/queries/notifications', () => ({
  useNotificationSettingsQuery: () => mockUseNotificationSettingsQuery(),
  useUpdateNotificationSettingsMutation: () => ({
    mutate: (...args: Parameters<typeof mockUpdateMutate>) => mockUpdateMutate(...args),
    get isPending() {
      return mockUpdateIsPending;
    },
  }),
  resolveNotificationPreference: (prefs: Record<string, boolean | undefined>, key: string) => {
    const value = prefs[key];
    return value !== false;
  },
}));

// ---------------------------------------------------------------------------
// デフォルト状態
// ---------------------------------------------------------------------------

const defaultSettingsState = {
  data: {
    preferences: {
      like: true,
      comment: true,
      reply: true,
      comment_like: true,
      follow: true,
      quote: true,
      follow_request: true,
      follow_request_approved: true,
      mention: true,
      message: true,
      repost: true,
    },
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateIsPending = false;
  mockUseNotificationSettingsQuery.mockReturnValue(defaultSettingsState);
});

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('NotificationTypeSettings', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のときスケルトンが表示される（accessibilityElementsHidden）', () => {
      mockUseNotificationSettingsQuery.mockReturnValue({
        ...defaultSettingsState,
        isLoading: true,
        data: undefined,
      });
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);
      // ローディング時はトグルが表示されない
      expect(screen.queryByRole('switch')).toBeNull();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のときエラーメッセージが表示される', () => {
      mockUseNotificationSettingsQuery.mockReturnValue({
        ...defaultSettingsState,
        isError: true,
        data: undefined,
        error: new Error('load error'),
      });
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);
      expect(screen.getByText('設定を読み込めませんでした')).toBeTruthy();
    });

    it('エラー状態で「再試行」ボタンが表示される', () => {
      mockUseNotificationSettingsQuery.mockReturnValue({
        ...defaultSettingsState,
        isError: true,
        data: undefined,
        error: new Error('load error'),
      });
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);
      expect(screen.getByRole('button', { name: '再試行' })).toBeTruthy();
    });
  });

  describe('正常状態 — トグル表示', () => {
    it('11 種の通知キー分のスイッチが表示される', () => {
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);
      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(NOTIFICATION_PREFERENCE_KEYS.length);
    });

    it('system と subscription_expiring のスイッチは表示されない', () => {
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);
      expect(screen.queryByRole('switch', { name: /システム/ })).toBeNull();
      expect(screen.queryByRole('switch', { name: /subscription_expiring/ })).toBeNull();
    });

    it('value=true のとき Switch が有効状態', () => {
      mockUseNotificationSettingsQuery.mockReturnValue({
        ...defaultSettingsState,
        data: { preferences: { like: true } },
      });
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);
      const likeSwitch = screen.getByTestId('notification-setting-like');
      expect(likeSwitch.props.value).toBe(true);
    });

    it('value=false のとき Switch が無効状態', () => {
      mockUseNotificationSettingsQuery.mockReturnValue({
        ...defaultSettingsState,
        data: { preferences: { like: false } },
      });
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);
      const likeSwitch = screen.getByTestId('notification-setting-like');
      expect(likeSwitch.props.value).toBe(false);
    });
  });

  describe('トグル操作', () => {
    it('スイッチ ON → OFF の変更で mutate が呼ばれる', async () => {
      mockUpdateMutate.mockImplementation(() => undefined);
      mockUseNotificationSettingsQuery.mockReturnValue({
        ...defaultSettingsState,
        data: { preferences: { like: true } },
      });
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);

      const likeSwitch = screen.getByTestId('notification-setting-like');
      await act(async () => {
        fireEvent(likeSwitch, 'valueChange', false);
      });

      expect(mockUpdateMutate).toHaveBeenCalledWith(
        { like: false },
        expect.objectContaining({ onError: expect.any(Function) })
      );
    });

    it('スイッチ OFF → ON の変更で mutate が呼ばれる', async () => {
      mockUpdateMutate.mockImplementation(() => undefined);
      mockUseNotificationSettingsQuery.mockReturnValue({
        ...defaultSettingsState,
        data: { preferences: { comment: false } },
      });
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);

      const commentSwitch = screen.getByTestId('notification-setting-comment');
      await act(async () => {
        fireEvent(commentSwitch, 'valueChange', true);
      });

      expect(mockUpdateMutate).toHaveBeenCalledWith(
        { comment: true },
        expect.objectContaining({ onError: expect.any(Function) })
      );
    });
  });

  describe('オフライン状態', () => {
    it('isOnline=false のときオフライン案内が表示される', () => {
      renderWithProviders(<NotificationTypeSettings isOnline={false} />);
      expect(screen.getByText(/インターネット接続が必要です/)).toBeTruthy();
    });

    it('isOnline=false のときトグル操作でエラートーストが表示される（実際に操作は行わない）', async () => {
      mockUpdateMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          // isOffline=true のとき mutate は呼ばれず、showToast が直接呼ばれる
          // テストではオンライン判定を false にして表示確認
          void opts;
        }
      );
      renderWithProviders(<NotificationTypeSettings isOnline={false} />);

      const likeSwitch = screen.getByTestId('notification-setting-like');
      await act(async () => {
        fireEvent(likeSwitch, 'valueChange', false);
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_OFFLINE_ACTION)).toBeTruthy();
      });
    });
  });

  describe('エラーハンドリング（mutate 失敗）', () => {
    it('更新失敗でエラートーストが表示される', async () => {
      const genericError = new Error('update failed');
      mockUpdateMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(genericError);
        }
      );
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);

      const likeSwitch = screen.getByTestId('notification-setting-like');
      await act(async () => {
        fireEvent(likeSwitch, 'valueChange', false);
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED)).toBeTruthy();
      });
    });

    it('429 RATE_LIMITED でレート制限トーストが表示される', async () => {
      const rateLimitError = new ApiError({
        code: 'RATE_LIMITED',
        status: 429,
        message: 'rate limited',
      });
      mockUpdateMutate.mockImplementation(
        (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
          opts?.onError?.(rateLimitError);
        }
      );
      renderWithProviders(<NotificationTypeSettings isOnline={true} />);

      const likeSwitch = screen.getByTestId('notification-setting-like');
      await act(async () => {
        fireEvent(likeSwitch, 'valueChange', false);
      });

      await waitFor(() => {
        expect(screen.queryByText(ERR_RATE_LIMIT)).toBeTruthy();
      });
    });
  });
});
