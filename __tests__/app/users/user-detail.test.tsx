/**
 * app/users/[id] の画面テスト。
 * id パラメータの型ガードと、不正/空 id でのエラーメッセージ表示を検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import UserDetailScreen from '@/app/users/[id]/index';
import { ERR_USER_NOT_FOUND } from '@/lib/constants/errors';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

describe('UserDetailScreen', () => {
  describe('正常系（有効な id）', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'user-xyz-456' });
    });

    it('ユーザープロフィール画面が表示される', () => {
      render(<UserDetailScreen />);
      expect(screen.getByText('ユーザープロフィール画面（実装予定）')).toBeTruthy();
    });

    it('ユーザー ID が画面に表示される', () => {
      render(<UserDetailScreen />);
      expect(screen.getByText('ユーザーID: user-xyz-456')).toBeTruthy();
    });

    it('ヘッダーに「プロフィール」と表示される', () => {
      render(<UserDetailScreen />);
      expect(screen.getByRole('header', { name: 'プロフィール' })).toBeTruthy();
    });

    it('戻るボタンが表示される', () => {
      render(<UserDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('ブロック・通報へのメニューボタンが表示される（UGC 審査要件）', () => {
      render(<UserDetailScreen />);
      expect(
        screen.getByRole('button', { name: 'メニューを開く（ブロック・通報）' })
      ).toBeTruthy();
    });
  });

  describe('異常系（不正な id）', () => {
    it('id が空文字の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      render(<UserDetailScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });

    it('id が配列の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['x', 'y'] });
      render(<UserDetailScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });

    it('id が undefined の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      render(<UserDetailScreen />);
      expect(screen.getByText(ERR_USER_NOT_FOUND)).toBeTruthy();
    });

    it('エラー時に戻るボタンが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      render(<UserDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });
  });
});
