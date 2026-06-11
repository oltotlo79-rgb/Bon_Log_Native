/**
 * components/common/ScreenEmpty のコンポーネントテスト。
 * title 表示、アクションボタン・サブリンクのタップ、未指定時の非表示を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';

describe('ScreenEmpty', () => {
  it('title が表示される', () => {
    render(<ScreenEmpty title="データがありません" />);
    expect(screen.getByText('データがありません')).toBeTruthy();
  });

  it('description が指定されると表示される', () => {
    render(
      <ScreenEmpty title="データがありません" description="フォローするとここに表示されます" />
    );
    expect(screen.getByText('フォローするとここに表示されます')).toBeTruthy();
  });

  it('description が未指定のとき表示されない', () => {
    render(<ScreenEmpty title="データがありません" />);
    expect(screen.queryByText('フォローするとここに表示されます')).toBeNull();
  });

  describe('アクションボタン', () => {
    it('actionLabel と onAction が両方指定されたとき表示される', () => {
      const onAction = jest.fn();
      render(<ScreenEmpty title="空" actionLabel="探す" onAction={onAction} />);
      expect(screen.getByRole('button', { name: '探す' })).toBeTruthy();
    });

    it('actionLabel が未指定のとき表示されない', () => {
      const onAction = jest.fn();
      render(<ScreenEmpty title="空" onAction={onAction} />);
      expect(screen.queryByRole('button', { name: '探す' })).toBeNull();
    });

    it('onAction が未指定のとき表示されない', () => {
      render(<ScreenEmpty title="空" actionLabel="探す" />);
      expect(screen.queryByRole('button', { name: '探す' })).toBeNull();
    });

    it('タップすると onAction が呼ばれる', () => {
      const onAction = jest.fn();
      render(<ScreenEmpty title="空" actionLabel="探す" onAction={onAction} />);
      fireEvent.press(screen.getByRole('button', { name: '探す' }));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('サブリンク', () => {
    it('subLinkLabel と onSubLink が両方指定されたとき表示される', () => {
      const onSubLink = jest.fn();
      render(
        <ScreenEmpty title="空" subLinkLabel="詳しく見る" onSubLink={onSubLink} />
      );
      expect(screen.getByRole('button', { name: '詳しく見る' })).toBeTruthy();
    });

    it('subLinkLabel が未指定のとき表示されない', () => {
      const onSubLink = jest.fn();
      render(<ScreenEmpty title="空" onSubLink={onSubLink} />);
      expect(screen.queryByRole('button', { name: '詳しく見る' })).toBeNull();
    });

    it('onSubLink が未指定のとき表示されない', () => {
      render(<ScreenEmpty title="空" subLinkLabel="詳しく見る" />);
      expect(screen.queryByRole('button', { name: '詳しく見る' })).toBeNull();
    });

    it('タップすると onSubLink が呼ばれる', () => {
      const onSubLink = jest.fn();
      render(
        <ScreenEmpty title="空" subLinkLabel="詳しく見る" onSubLink={onSubLink} />
      );
      fireEvent.press(screen.getByRole('button', { name: '詳しく見る' }));
      expect(onSubLink).toHaveBeenCalledTimes(1);
    });
  });

  it('iconName を変更できる', () => {
    render(<ScreenEmpty title="空" iconName="search-outline" />);
    // モックでアイコンは testID="icon-{name}" として描画される
    // accessibilityElementsHidden が設定されるため includeHiddenElements で検索する
    expect(screen.getByTestId('icon-search-outline', { includeHiddenElements: true })).toBeTruthy();
  });

  it('デフォルトアイコンは leaf-outline', () => {
    render(<ScreenEmpty title="空" />);
    expect(screen.getByTestId('icon-leaf-outline', { includeHiddenElements: true })).toBeTruthy();
  });
});
