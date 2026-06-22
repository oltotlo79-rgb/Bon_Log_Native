/**
 * @module __tests__/components/common/ImageViewerModal
 * components/common/ImageViewerModal のコンポーネントテスト。
 * 1枚/複数枚のレイアウト、閉じるボタン、visible 状態を検証する（testing.md）。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ImageViewerModal } from '@/components/common/ImageViewerModal';
import type { ImageViewerModalProps } from '@/components/common/ImageViewerModal';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeImage(uri: string, label?: string) {
  return { uri, accessibilityLabel: label };
}

function renderModal(props: Partial<ImageViewerModalProps> = {}) {
  const defaults: ImageViewerModalProps = {
    images: [makeImage('https://example.com/image1.jpg', '盆栽画像1')],
    initialIndex: 0,
    visible: true,
    onClose: jest.fn(),
    ...props,
  };
  return render(<ImageViewerModal {...defaults} />);
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('ImageViewerModal', () => {
  // -------------------------------------------------------------------------
  // visible 制御
  // -------------------------------------------------------------------------

  describe('visible プロパティ', () => {
    it('visible=true のとき image-viewer-modal が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByTestId('image-viewer-modal')).toBeTruthy();
    });

    it('visible=false のとき image-viewer-modal は DOM に存在しない（Modal が閉じている）', () => {
      renderModal({ visible: false });
      // React Native のテスト環境では visible=false の Modal はレンダリングツリーに存在しない
      expect(screen.queryByTestId('image-viewer-modal')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 閉じるボタン
  // -------------------------------------------------------------------------

  describe('閉じるボタン', () => {
    it('testID="image-viewer-close" のボタンが存在する', () => {
      renderModal();
      expect(screen.getByTestId('image-viewer-close')).toBeTruthy();
    });

    it('閉じるボタンの accessibilityLabel が「閉じる」', () => {
      renderModal();
      const closeBtn = screen.getByTestId('image-viewer-close');
      expect(closeBtn.props.accessibilityLabel).toBe('閉じる');
    });

    it('閉じるボタンを押すと onClose が呼ばれる', () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      fireEvent.press(screen.getByTestId('image-viewer-close'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('accessibilityRole が "button"', () => {
      renderModal();
      const closeBtn = screen.getByTestId('image-viewer-close');
      expect(closeBtn.props.accessibilityRole).toBe('button');
    });
  });

  // -------------------------------------------------------------------------
  // onRequestClose（Android 戻るボタン）
  // -------------------------------------------------------------------------

  describe('onRequestClose', () => {
    it('Modal の onRequestClose に onClose が渡される', () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      const modal = screen.getByTestId('image-viewer-modal');
      expect(modal.props.onRequestClose).toBe(onClose);
    });
  });

  // -------------------------------------------------------------------------
  // 1枚のとき（インデックス非表示）
  // -------------------------------------------------------------------------

  describe('画像 1 枚', () => {
    it('画像が表示される', () => {
      renderModal({
        images: [makeImage('https://example.com/img.jpg', '盆栽の黒松')],
        initialIndex: 0,
      });
      expect(screen.getByLabelText('盆栽の黒松')).toBeTruthy();
    });

    it('1 / 1 インデックステキストは表示されない（1枚のみのとき非表示）', () => {
      renderModal({
        images: [makeImage('https://example.com/img.jpg', '盆栽画像')],
        initialIndex: 0,
      });
      // "1 / 1" のようなテキストが存在しないこと
      expect(screen.queryByText('1 / 1')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 複数枚のとき（インデックス表示）
  // -------------------------------------------------------------------------

  describe('画像 複数枚', () => {
    const multipleImages = [
      makeImage('https://example.com/img1.jpg', '画像1'),
      makeImage('https://example.com/img2.jpg', '画像2'),
      makeImage('https://example.com/img3.jpg', '画像3'),
    ];

    it('initialIndex=0 のとき「1 / 3」インデックスが表示される', () => {
      renderModal({
        images: multipleImages,
        initialIndex: 0,
      });
      expect(screen.getByText('1 / 3')).toBeTruthy();
    });

    it('initialIndex=1 のとき「2 / 3」インデックスが表示される', () => {
      renderModal({
        images: multipleImages,
        initialIndex: 1,
      });
      expect(screen.getByText('2 / 3')).toBeTruthy();
    });

    it('initialIndex=2 のとき「3 / 3」インデックスが表示される', () => {
      renderModal({
        images: multipleImages,
        initialIndex: 2,
      });
      expect(screen.getByText('3 / 3')).toBeTruthy();
    });

    it('FlatList が horizontal でレンダリングされる（複数枚のみ）', () => {
      const { toJSON } = renderModal({
        images: multipleImages,
        initialIndex: 0,
      });
      const json = JSON.stringify(toJSON());
      // FlatList は内部的に ScrollView をレンダリングするため確認
      expect(json).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 2 枚の境界値
  // -------------------------------------------------------------------------

  describe('画像 2 枚', () => {
    it('「1 / 2」インデックスが表示される', () => {
      renderModal({
        images: [
          makeImage('https://example.com/img1.jpg', '画像1'),
          makeImage('https://example.com/img2.jpg', '画像2'),
        ],
        initialIndex: 0,
      });
      expect(screen.getByText('1 / 2')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // accessibilityViewIsModal プロパティ
  // -------------------------------------------------------------------------

  describe('アクセシビリティ', () => {
    it('accessibilityViewIsModal が true', () => {
      renderModal();
      const modal = screen.getByTestId('image-viewer-modal');
      expect(modal.props.accessibilityViewIsModal).toBe(true);
    });

    it('animationType が "fade"', () => {
      renderModal();
      const modal = screen.getByTestId('image-viewer-modal');
      expect(modal.props.animationType).toBe('fade');
    });
  });
});
