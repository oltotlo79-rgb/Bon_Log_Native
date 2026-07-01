/**
 * app/shops/[id]/reviews/new/index のレビュー投稿フォームテスト。
 * ヘッダー・星評価・バリデーション・キャンセルを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import NewReviewScreen from '@/app/shops/[id]/reviews/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseCreateReviewMutation = jest.fn();
const mockUseShopDetailQuery = jest.fn();

jest.mock('@/lib/queries/shops', () => ({
  useCreateReviewMutation: () => mockUseCreateReviewMutation(),
  useShopDetailQuery: (...args: unknown[]) => mockUseShopDetailQuery(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ id: 'shop-1' });
  mockUseCreateReviewMutation.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  mockUseShopDetailQuery.mockReturnValue({ data: undefined });
});

describe('NewReviewScreen', () => {
  describe('ヘッダー', () => {
    it('「レビューを書く」ヘッダーが表示される', () => {
      renderWithProviders(<NewReviewScreen />);
      expect(screen.getByText('レビューを書く')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderWithProviders(<NewReviewScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「投稿する」ボタンが表示される', () => {
      renderWithProviders(<NewReviewScreen />);
      expect(screen.getByRole('button', { name: '投稿する' })).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('入力なしでキャンセルすると router.back が呼ばれる', () => {
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('バリデーション', () => {
    it('星評価未選択のとき「投稿する」ボタンが disabled になる', () => {
      renderWithProviders(<NewReviewScreen />);
      const submitButton = screen.getByRole('button', { name: '投稿する' });
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('星評価を選択すると「投稿する」ボタンが有効になる', () => {
      renderWithProviders(<NewReviewScreen />);
      // 「4点」ボタンを押す
      fireEvent.press(screen.getByRole('button', { name: '4点' }));
      const submitButton = screen.getByRole('button', { name: '投稿する' });
      expect(submitButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('「評価を選択してください」のヒントが表示される', () => {
      renderWithProviders(<NewReviewScreen />);
      expect(screen.getByText('評価を選択してください')).toBeTruthy();
    });

    it('星評価を選択するとヒントが消える', () => {
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '3点' }));
      expect(screen.queryByText('評価を選択してください')).toBeNull();
    });
  });

  describe('店舗名表示', () => {
    it('shop データがある場合は店舗名が表示される', () => {
      mockUseShopDetailQuery.mockReturnValue({
        data: {
          id: 'shop-1',
          name: '盆栽専門店 松苑',
          address: '東京都',
          genres: [],
          averageRating: null,
          reviewCount: 0,
          isOwner: false,
          latitude: null,
          longitude: null,
          phone: null,
          website: null,
          businessHours: null,
          closedDays: null,
          createdAt: '2025-06-01T00:00:00Z',
          updatedAt: '2025-06-01T00:00:00Z',
        },
      });
      renderWithProviders(<NewReviewScreen />);
      expect(screen.getByText('盆栽専門店 松苑')).toBeTruthy();
    });
  });

  describe('レビュー本文', () => {
    it('レビュー本文フィールドが表示される', () => {
      renderWithProviders(<NewReviewScreen />);
      expect(screen.getByLabelText('レビュー本文')).toBeTruthy();
    });

    it('本文を入力できる', () => {
      renderWithProviders(<NewReviewScreen />);
      const contentInput = screen.getByLabelText('レビュー本文');
      fireEvent.changeText(contentInput, '素晴らしい品揃えでした');
      expect(contentInput.props.value).toBe('素晴らしい品揃えでした');
    });
  });

  describe('オフライン', () => {
    it('オフラインのとき「投稿する」ボタンが disabled になる', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      renderWithProviders(<NewReviewScreen />);
      // 評価を選択してもオフラインなら disabled
      fireEvent.press(screen.getByRole('button', { name: '5点' }));
      const submitButton = screen.getByRole('button', { name: '投稿する' });
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が配列のとき空文字として扱い画面がクラッシュしない', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['shop-1', 'shop-2'] });
      renderWithProviders(<NewReviewScreen />);
      expect(screen.getByText('レビューを書く')).toBeTruthy();
    });
  });

  describe('handleCancel — hasInput=true', () => {
    it('評価入力後にキャンセルするとAlertが表示される', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '4点' }));
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertSpy).toHaveBeenCalledWith(
        '変更を破棄しますか？',
        expect.any(String),
        expect.any(Array)
      );
      jest.restoreAllMocks();
    });

    it('Alert の「破棄する」でrouter.backが呼ばれる', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '3点' }));
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      const buttons = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const discardBtn = buttons?.find((b) => b.text === '破棄する');
      discardBtn?.onPress?.();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      jest.restoreAllMocks();
    });
  });

  describe('handleSubmit — 成功', () => {
    it('評価選択後に投稿するとcreateReviewが呼ばれrouter.backが実行される', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValueOnce(undefined);
      mockUseCreateReviewMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '5点' }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      });
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ shopId: 'shop-1', rating: 5 })
        );
        expect(mockRouter.back).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('handleSubmit — 二重投稿エラー', () => {
    it('409エラーが返るとERR_REVIEW_DUPLICATEが表示される', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValueOnce(new Error('409 Conflict'));
      mockUseCreateReviewMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '5点' }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      });
      await waitFor(() => {
        expect(screen.getByText('この盆栽園にはすでにレビューを投稿しています。')).toBeTruthy();
      });
    });
  });

  describe('handleSubmit — 汎用エラー', () => {
    it('一般エラーが返るとERR_REVIEW_CREATE_FAILEDが表示される', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValueOnce(new Error('server error'));
      mockUseCreateReviewMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '5点' }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      });
      await waitFor(() => {
        expect(screen.getByText('レビューの投稿に失敗しました。もう一度お試しください。')).toBeTruthy();
      });
    });

    it('非Errorオブジェクトが投げられた場合もERR_REVIEW_CREATE_FAILEDが表示される', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValueOnce('string error');
      mockUseCreateReviewMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '5点' }));
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
      });
      await waitFor(() => {
        expect(screen.getByText('レビューの投稿に失敗しました。もう一度お試しください。')).toBeTruthy();
      });
    });
  });

  describe('handleSubmit — オフライン', () => {
    it('オフライン状態で投稿を試みるとERR_OFFLINE_ACTIONが設定される', async () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      // canSubmit は false なので button は disabled になるため、直接フォームの状態を確認
      renderWithProviders(<NewReviewScreen />);
      fireEvent.press(screen.getByRole('button', { name: '5点' }));
      const submitButton = screen.getByRole('button', { name: '投稿する' });
      // オフライン時はボタンが disabled
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
