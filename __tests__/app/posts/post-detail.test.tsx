/**
 * app/posts/[id] の画面テスト。
 * id パラメータの型ガードと、不正/空 id でのエラーメッセージ表示を検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PostDetailScreen from '@/app/posts/[id]/index';
import { ERR_POST_NOT_FOUND } from '@/lib/constants/errors';

// useLocalSearchParams のモックを各テストで上書きするためのヘルパー
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

describe('PostDetailScreen', () => {
  describe('正常系（有効な id）', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'post-abc-123' });
    });

    it('投稿詳細画面が表示される', () => {
      render(<PostDetailScreen />);
      expect(screen.getByText('投稿詳細画面（実装予定）')).toBeTruthy();
    });

    it('投稿 ID が画面に表示される', () => {
      render(<PostDetailScreen />);
      expect(screen.getByText('投稿ID: post-abc-123')).toBeTruthy();
    });

    it('ヘッダーに「投稿」と表示される', () => {
      render(<PostDetailScreen />);
      expect(screen.getByRole('header', { name: '投稿' })).toBeTruthy();
    });

    it('戻るボタンが表示される', () => {
      render(<PostDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });
  });

  describe('異常系（不正な id）', () => {
    it('id が空文字の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      render(<PostDetailScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('id が配列の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['a', 'b'] });
      render(<PostDetailScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('id が undefined の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      render(<PostDetailScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('エラー時に戻るボタンが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      render(<PostDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });
  });
});
