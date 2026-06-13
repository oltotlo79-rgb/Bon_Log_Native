/**
 * app/posts/[id]/edit の画面テスト。
 * id パラメータの型ガードと、不正/空 id でのエラー表示、有効 id でのフォーム表示を検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PostEditScreen from '@/app/posts/[id]/edit/index';
import { ERR_POST_NOT_FOUND } from '@/lib/constants/errors';

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;
const mockRouterBack = jest.requireMock('expo-router').router.back;

describe('PostEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'post-abc-123' });
  });

  describe('正常系（有効な id）', () => {
    it('ヘッダーに「投稿を編集」と表示される', () => {
      render(<PostEditScreen />);
      expect(screen.getByRole('header', { name: '投稿を編集' })).toBeTruthy();
    });

    it('キャンセルボタンが表示される', () => {
      render(<PostEditScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('更新ボタンが表示される', () => {
      render(<PostEditScreen />);
      expect(screen.getByRole('button', { name: '更新する' })).toBeTruthy();
    });

    it('投稿 ID がコンテンツに表示される', () => {
      render(<PostEditScreen />);
      expect(screen.getByText('投稿ID: post-abc-123')).toBeTruthy();
    });

    it('キャンセルボタンを押すと router.back が呼ばれる', () => {
      render(<PostEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouterBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系（不正な id）', () => {
    it('id が空文字の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      render(<PostEditScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('id が配列の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['a', 'b'] });
      render(<PostEditScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('id が undefined の場合にエラーメッセージを表示する', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      render(<PostEditScreen />);
      expect(screen.getByText(ERR_POST_NOT_FOUND)).toBeTruthy();
    });

    it('エラー時に戻るボタンが表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      render(<PostEditScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('エラー時の戻るボタンを押すと router.back が呼ばれる', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      render(<PostEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: '戻る' }));
      expect(mockRouterBack).toHaveBeenCalledTimes(1);
    });
  });
});
