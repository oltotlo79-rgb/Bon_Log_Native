/**
 * components/post/ComposerFormError のユニットテスト。
 * エラーメッセージ表示・非表示を検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ComposerFormError } from '@/components/post/ComposerFormError';

describe('ComposerFormError', () => {
  describe('非表示状態', () => {
    it('message=null のとき何も表示されない', () => {
      render(<ComposerFormError message={null} />);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('message=undefined のとき何も表示されない', () => {
      render(<ComposerFormError message={undefined} />);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('message="" のとき何も表示されない', () => {
      render(<ComposerFormError message="" />);
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('エラー表示', () => {
    it('message がある場合エラーメッセージが表示される', () => {
      render(<ComposerFormError message="エラーが発生しました" />);
      expect(screen.getByText('エラーが発生しました')).toBeTruthy();
    });

    it('エラーメッセージのテキストが表示される', () => {
      render(<ComposerFormError message="投稿に失敗しました" />);
      expect(screen.getByText('投稿に失敗しました')).toBeTruthy();
    });

    it('長いエラーメッセージが表示される', () => {
      const longMsg = 'オフラインのため投稿できません。ネットワーク接続を確認してから再度お試しください。';
      render(<ComposerFormError message={longMsg} />);
      expect(screen.getByText(longMsg)).toBeTruthy();
    });
  });
});
