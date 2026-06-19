/**
 * @module __tests__/components/settings/DeletionWarningDialog
 * DeletionWarningDialog コンポーネントのテスト。
 * isPremium フラグによる Google Play リンク表示・削除データ一覧・ボタン動作を検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DeletionWarningDialog } from '@/components/settings/DeletionWarningDialog';

const onConfirm = jest.fn();
const onCancel = jest.fn();

const DEFAULT_PROPS = {
  isVisible: true,
  isPremium: false,
  onConfirm,
  onCancel,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DeletionWarningDialog', () => {
  describe('基本表示（isVisible: true）', () => {
    it('タイトルが表示される', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} />);
      expect(screen.getByText('アカウントを削除しますか？')).toBeTruthy();
    });

    it('取り消せない旨の警告文が表示される', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} />);
      expect(screen.getByText(/この操作は取り消せません/)).toBeTruthy();
    });

    it('削除されるデータのリストが表示される', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} />);
      expect(screen.getByText(/投稿とコメント/)).toBeTruthy();
      expect(screen.getByText(/フォロー/)).toBeTruthy();
      expect(screen.getByText(/いいね/)).toBeTruthy();
      expect(screen.getByText(/アカウント情報/)).toBeTruthy();
    });

    it('キャンセルボタンが表示される', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('キャンセル')).toBeTruthy();
    });

    it('削除に進むボタンが表示される', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('削除に進む')).toBeTruthy();
    });
  });

  describe('ボタン動作', () => {
    it('キャンセルボタンを押すと onCancel が呼ばれる', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} />);

      fireEvent.press(screen.getByLabelText('キャンセル'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('削除に進むボタンを押すと onConfirm が呼ばれる', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} />);

      fireEvent.press(screen.getByLabelText('削除に進む'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('isPremium: false（非プレミアム）', () => {
    it('Google Play リンクが表示されない', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} isPremium={false} />);

      expect(screen.queryByText('Google Play 定期購入の管理')).toBeNull();
    });

    it('プレミアム向け注意喚起が表示されない', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} isPremium={false} />);

      expect(screen.queryByText('プレミアムプランをご利用中の方へ')).toBeNull();
    });
  });

  describe('isPremium: true（プレミアムユーザー）', () => {
    it('プレミアム向け注意喚起が表示される', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} isPremium={true} />);

      expect(screen.getByText('プレミアムプランをご利用中の方へ')).toBeTruthy();
    });

    it('自動解約されない旨の説明文が表示される', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} isPremium={true} />);

      expect(screen.getByText(/プレミアムプランは自動的には解約されません/)).toBeTruthy();
    });

    it('Google Play 定期購入の管理リンクが表示される', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} isPremium={true} />);

      expect(screen.getByText('Google Play 定期購入の管理')).toBeTruthy();
    });

    it('Google Play リンクは link ロールを持つ', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} isPremium={true} />);

      const link = screen.getByLabelText('Google Play 定期購入の管理（外部リンク）');
      expect(link.props.accessibilityRole).toBe('link');
    });
  });

  describe('isVisible: false（非表示）', () => {
    it('isVisible が false のときダイアログが表示されない', () => {
      render(<DeletionWarningDialog {...DEFAULT_PROPS} isVisible={false} />);

      // Modal が非表示のためタイトルが見えない
      expect(screen.queryByText('アカウントを削除しますか？')).toBeNull();
    });
  });
});
