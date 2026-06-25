/**
 * components/common/ScreenEmpty のコンポーネントテスト。
 * variant 指定時の墨絵イラスト表示、variant 未指定時のアイコン円（後方互換）、
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

  // ---------------------------------------------------------------------------
  // variant: 墨絵イラスト表示
  // setup.ts の expo-image モックは accessibilityElementsHidden を破棄するため
  // includeHiddenElements なしで accessibilityLabel 検索が可能。
  // ---------------------------------------------------------------------------

  describe('variant 指定 — 墨絵イラストが表示される', () => {
    const variants = ['feed', 'bookmark', 'notification', 'search'] as const;

    variants.forEach((variant) => {
      it(`variant="${variant}" のとき accessibilityLabel="空状態のイラスト" の Image が描画される`, () => {
        render(<ScreenEmpty variant={variant} title="空" />);
        expect(
          screen.getByLabelText('空状態のイラスト', { includeHiddenElements: true })
        ).toBeTruthy();
      });

      it(`variant="${variant}" のとき Ionicons アイコン円は描画されない`, () => {
        render(<ScreenEmpty variant={variant} title="空" />);
        expect(
          screen.queryByTestId('icon-leaf-outline', { includeHiddenElements: true })
        ).toBeNull();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // variant 未指定 — 後方互換（Ionicons アイコン円）
  // ---------------------------------------------------------------------------

  describe('variant 未指定 — Ionicons アイコン円が表示される（後方互換）', () => {
    it('variant 未指定のとき墨絵 Image は描画されない', () => {
      render(<ScreenEmpty title="空" />);
      expect(
        screen.queryByLabelText('空状態のイラスト', { includeHiddenElements: true })
      ).toBeNull();
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

  // ---------------------------------------------------------------------------
  // アクションボタン
  // ---------------------------------------------------------------------------

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

    it('variant 指定時もアクションボタンが表示される', () => {
      const onAction = jest.fn();
      render(
        <ScreenEmpty
          variant="feed"
          title="空"
          actionLabel="フィードへ"
          onAction={onAction}
        />
      );
      const button = screen.getByRole('button', { name: 'フィードへ' });
      expect(button).toBeTruthy();
      fireEvent.press(button);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // サブリンク
  // ---------------------------------------------------------------------------

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
});
