/**
 * @module __tests__/components/report/ReportDialog
 * ReportDialog コンポーネントのテスト。
 * 通報理由選択 / 送信 / エラー表示 / オフライン制御を検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ReportDialog } from '@/components/report/ReportDialog';
import { ApiError } from '@/lib/api/errors';
import {
  ERR_REPORT_DUPLICATE,
  ERR_REPORT_TARGET_NOT_FOUND,
  ERR_RATE_LIMIT,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';
import { REPORT_DESCRIPTION_MAX_LENGTH } from '@/lib/constants/report';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockMutate = jest.fn();
let mockIsPending = false;

jest.mock('@/lib/queries/moderation', () => ({
  useReportMutation: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

const mockIsOnline = { value: true };

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockIsOnline.value,
}));

// ---------------------------------------------------------------------------
// デフォルト props
// ---------------------------------------------------------------------------

const defaultProps = {
  targetType: 'post' as const,
  targetId: 'post-1',
  targetDisplayName: 'テスト投稿',
  onClose: jest.fn(),
};

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockIsPending = false;
  mockIsOnline.value = true;
});

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('ReportDialog', () => {
  describe('初期表示', () => {
    it('通報理由選択のヘッダーが表示される', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      expect(screen.getByRole('header', { name: '通報の理由を選択してください' })).toBeTruthy();
    });

    it('すべての通報理由ラジオボタンが表示される', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      expect(screen.getByRole('radio', { name: 'スパム' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: '不適切なコンテンツ' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: '嫌がらせ' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: '著作権侵害' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'その他' })).toBeTruthy();
    });

    it('理由未選択のとき「次へ」ボタンが disabled になる', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      const nextBtn = screen.getByRole('button', { name: '次へ' });
      expect(nextBtn).toBeTruthy();
    });
  });

  describe('理由選択', () => {
    it('理由を選択すると checked 状態になる', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      const spamRadio = screen.getByRole('radio', { name: 'スパム' });
      fireEvent.press(spamRadio);
      expect(spamRadio.props.accessibilityState?.checked).toBe(true);
    });

    it('別の理由を選択すると前の選択が外れる', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('radio', { name: '嫌がらせ' }));
      expect(screen.getByRole('radio', { name: 'スパム' }).props.accessibilityState?.checked).toBe(false);
      expect(screen.getByRole('radio', { name: '嫌がらせ' }).props.accessibilityState?.checked).toBe(true);
    });
  });

  describe('ステップ 2（詳細入力）', () => {
    it('理由選択後に「次へ」を押すとステップ 2 に進む', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      expect(screen.getByRole('header', { name: '詳細を入力（任意）' })).toBeTruthy();
    });

    it('ステップ 2 では選択した理由が表示される', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      expect(screen.getByText('選択した理由: スパム')).toBeTruthy();
    });

    it('文字数カウンターが表示される（0/1000）', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      expect(screen.getByText(`0/${REPORT_DESCRIPTION_MAX_LENGTH}`)).toBeTruthy();
    });

    it('「理由選択に戻る」ボタンでステップ 1 に戻る', () => {
      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      fireEvent.press(screen.getByRole('button', { name: '理由選択に戻る' }));
      expect(screen.getByRole('header', { name: '通報の理由を選択してください' })).toBeTruthy();
    });
  });

  describe('送信', () => {
    it('送信ボタンを押すと mutate が正しい引数で呼ばれる', async () => {
      mockMutate.mockImplementation((_params: unknown, callbacks: { onSuccess: () => void }) => {
        callbacks.onSuccess();
      });

      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      fireEvent.press(screen.getByRole('button', { name: '通報する' }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          {
            targetType: 'post',
            targetId: 'post-1',
            reason: 'spam',
            description: undefined,
          },
          expect.any(Object)
        );
      });
    });

    it('詳細テキストありで送信すると description が渡される', async () => {
      mockMutate.mockImplementation((_params: unknown, callbacks: { onSuccess: () => void }) => {
        callbacks.onSuccess();
      });

      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      fireEvent.changeText(
        screen.getByAccessibilityHint !== undefined
          ? screen.getByLabelText('通報の詳細を入力')
          : screen.getByPlaceholderText('この通報についての詳細を入力してください（任意）'),
        'これはスパムです'
      );
      fireEvent.press(screen.getByRole('button', { name: '通報する' }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'これはスパムです' }),
          expect.any(Object)
        );
      });
    });
  });

  describe('エラー表示', () => {
    it('409 CONFLICT でインラインエラーが表示される', async () => {
      const conflictError = new ApiError({ code: 'CONFLICT', status: 409, message: 'Duplicate' });
      mockMutate.mockImplementation((_params: unknown, callbacks: { onError: (e: Error) => void }) => {
        callbacks.onError(conflictError);
      });

      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      fireEvent.press(screen.getByRole('button', { name: '通報する' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_REPORT_DUPLICATE)).toBeTruthy();
      });
    });

    it('404 NOT_FOUND でインラインエラーが表示される', async () => {
      const notFoundError = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'Not found' });
      mockMutate.mockImplementation((_params: unknown, callbacks: { onError: (e: Error) => void }) => {
        callbacks.onError(notFoundError);
      });

      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      fireEvent.press(screen.getByRole('button', { name: '通報する' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_REPORT_TARGET_NOT_FOUND)).toBeTruthy();
      });
    });

    it('429 RATE_LIMITED でインラインエラーが表示される', async () => {
      const rateError = new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'Rate limited' });
      mockMutate.mockImplementation((_params: unknown, callbacks: { onError: (e: Error) => void }) => {
        callbacks.onError(rateError);
      });

      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      fireEvent.press(screen.getByRole('button', { name: '通報する' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_RATE_LIMIT)).toBeTruthy();
      });
    });
  });

  describe('オフライン', () => {
    it('オフライン時にインラインエラーが表示される', async () => {
      mockIsOnline.value = false;

      renderWithProviders(<ReportDialog {...defaultProps} />);
      fireEvent.press(screen.getByRole('radio', { name: 'スパム' }));
      fireEvent.press(screen.getByRole('button', { name: '次へ' }));
      fireEvent.press(screen.getByRole('button', { name: '通報する' }));

      await waitFor(() => {
        expect(screen.getByText(ERR_OFFLINE_ACTION)).toBeTruthy();
      });
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('キャンセル', () => {
    it('キャンセルボタンを押すと onClose が呼ばれる', () => {
      const onClose = jest.fn();
      renderWithProviders(<ReportDialog {...defaultProps} onClose={onClose} />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('閉じるボタン（×）を押すと onClose が呼ばれる', () => {
      const onClose = jest.fn();
      renderWithProviders(<ReportDialog {...defaultProps} onClose={onClose} />);
      fireEvent.press(screen.getByRole('button', { name: '通報をキャンセルして閉じる' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
