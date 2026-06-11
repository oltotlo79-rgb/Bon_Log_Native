/**
 * app/posts/new の画面テスト。
 * フィード画面の FAB から遷移する新規投稿モーダル画面の基本要素を確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PostNewScreen from '@/app/posts/new/index';

describe('PostNewScreen', () => {
  it('ヘッダーに「新規投稿」と表示される', () => {
    render(<PostNewScreen />);
    expect(screen.getByRole('header', { name: '新規投稿' })).toBeTruthy();
  });

  it('キャンセルボタンが表示される', () => {
    render(<PostNewScreen />);
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
  });

  it('投稿ボタンが表示される', () => {
    render(<PostNewScreen />);
    expect(screen.getByRole('button', { name: '投稿する' })).toBeTruthy();
  });

  it('新規投稿画面のプレースホルダーが表示される', () => {
    render(<PostNewScreen />);
    expect(screen.getByText('新規投稿画面（実装予定）')).toBeTruthy();
  });
});
