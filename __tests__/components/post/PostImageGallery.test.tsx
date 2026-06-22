/**
 * components/post/PostImageGallery のコンポーネントテスト。
 * 1〜4 枚の各レイアウト、media=[] で null を確認する。
 * サムネイルタップで ImageViewerModal が表示されることも検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PostImageGallery } from '@/components/post/PostImageGallery';
import { makeMedia } from '@/__tests__/utils/post-card-factory';

describe('PostImageGallery', () => {
  it('media=[] のとき何もレンダリングしない（null）', () => {
    const { toJSON } = render(
      <PostImageGallery media={[]} authorNickname="松の匠" />
    );
    expect(toJSON()).toBeNull();
  });

  it('動画のみのとき何もレンダリングしない（null）', () => {
    const videoMedia = makeMedia({ type: 'video' });
    const { toJSON } = render(
      <PostImageGallery media={[videoMedia]} authorNickname="松の匠" />
    );
    expect(toJSON()).toBeNull();
  });

  describe('画像 1 枚', () => {
    it('accessibilityLabel「2枚中 1枚目」などを含む画像が 1 件表示される', () => {
      const media = [makeMedia({ id: 'img-1', sortOrder: 0 })];
      render(<PostImageGallery media={media} authorNickname="松の匠" />);
      // accessibilityLabel: "松の匠の投稿画像 1枚中 1枚目"
      expect(screen.getByLabelText('松の匠の投稿画像 1枚中 1枚目')).toBeTruthy();
    });
  });

  describe('画像 2 枚', () => {
    it('2 件の画像が表示される', () => {
      const media = [
        makeMedia({ id: 'img-1', sortOrder: 0 }),
        makeMedia({ id: 'img-2', sortOrder: 1 }),
      ];
      render(<PostImageGallery media={media} authorNickname="盆栽家" />);
      expect(screen.getByLabelText('盆栽家の投稿画像 2枚中 1枚目')).toBeTruthy();
      expect(screen.getByLabelText('盆栽家の投稿画像 2枚中 2枚目')).toBeTruthy();
    });
  });

  describe('画像 3 枚', () => {
    it('3 件の画像が表示される', () => {
      const media = [
        makeMedia({ id: 'img-1', sortOrder: 0 }),
        makeMedia({ id: 'img-2', sortOrder: 1 }),
        makeMedia({ id: 'img-3', sortOrder: 2 }),
      ];
      render(<PostImageGallery media={media} authorNickname="師匠" />);
      expect(screen.getByLabelText('師匠の投稿画像 3枚中 1枚目')).toBeTruthy();
      expect(screen.getByLabelText('師匠の投稿画像 3枚中 2枚目')).toBeTruthy();
      expect(screen.getByLabelText('師匠の投稿画像 3枚中 3枚目')).toBeTruthy();
    });
  });

  describe('画像 4 枚', () => {
    it('4 件の画像が表示される', () => {
      const media = [
        makeMedia({ id: 'img-1', sortOrder: 0 }),
        makeMedia({ id: 'img-2', sortOrder: 1 }),
        makeMedia({ id: 'img-3', sortOrder: 2 }),
        makeMedia({ id: 'img-4', sortOrder: 3 }),
      ];
      render(<PostImageGallery media={media} authorNickname="園主" />);
      expect(screen.getByLabelText('園主の投稿画像 4枚中 1枚目')).toBeTruthy();
      expect(screen.getByLabelText('園主の投稿画像 4枚中 4枚目')).toBeTruthy();
    });
  });

  describe('5 枚以上は 4 枚にカット', () => {
    it('5 件渡しても 4 件目までの画像しか表示されない', () => {
      const media = [
        makeMedia({ id: 'img-1', sortOrder: 0 }),
        makeMedia({ id: 'img-2', sortOrder: 1 }),
        makeMedia({ id: 'img-3', sortOrder: 2 }),
        makeMedia({ id: 'img-4', sortOrder: 3 }),
        makeMedia({ id: 'img-5', sortOrder: 4 }),
      ];
      render(<PostImageGallery media={media} authorNickname="名人" />);
      expect(screen.getByLabelText('名人の投稿画像 4枚中 4枚目')).toBeTruthy();
      expect(screen.queryByLabelText('名人の投稿画像 5枚中 5枚目')).toBeNull();
    });
  });

  describe('sortOrder による並び替え', () => {
    it('sortOrder が逆順でも正しく並び替えられる', () => {
      const media = [
        makeMedia({ id: 'img-b', sortOrder: 1 }),
        makeMedia({ id: 'img-a', sortOrder: 0 }),
      ];
      render(<PostImageGallery media={media} authorNickname="職人" />);
      expect(screen.getByLabelText('職人の投稿画像 2枚中 1枚目')).toBeTruthy();
      expect(screen.getByLabelText('職人の投稿画像 2枚中 2枚目')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // サムネイルタップ → ImageViewerModal の visible 制御
  // -------------------------------------------------------------------------

  describe('サムネイルタップで ImageViewerModal が開く', () => {
    it('1 枚目をタップすると ImageViewerModal が visible=true で表示される', () => {
      const media = [makeMedia({ id: 'img-1', sortOrder: 0 })];
      render(<PostImageGallery media={media} authorNickname="松の匠" />);

      // 初期状態: ビューアは非表示
      expect(screen.queryByTestId('image-viewer-modal')).toBeNull();

      // サムネイルをタップ
      fireEvent.press(screen.getByLabelText('松の匠の投稿画像 1枚中 1枚目'));

      // ビューアが表示される
      expect(screen.getByTestId('image-viewer-modal')).toBeTruthy();
    });

    it('2 枚のうち 2 枚目をタップすると ImageViewerModal が開く', () => {
      const media = [
        makeMedia({ id: 'img-1', sortOrder: 0 }),
        makeMedia({ id: 'img-2', sortOrder: 1 }),
      ];
      render(<PostImageGallery media={media} authorNickname="盆栽家" />);

      // 2 枚目をタップ
      fireEvent.press(screen.getByLabelText('盆栽家の投稿画像 2枚中 2枚目'));

      expect(screen.getByTestId('image-viewer-modal')).toBeTruthy();
    });

    it('ビューアの閉じるボタンを押すと ImageViewerModal が非表示になる', () => {
      const media = [makeMedia({ id: 'img-1', sortOrder: 0 })];
      render(<PostImageGallery media={media} authorNickname="松の匠" />);

      // サムネイルをタップしてビューアを開く
      fireEvent.press(screen.getByLabelText('松の匠の投稿画像 1枚中 1枚目'));
      expect(screen.getByTestId('image-viewer-modal')).toBeTruthy();

      // 閉じるボタンを押す
      fireEvent.press(screen.getByTestId('image-viewer-close'));

      // ビューアが非表示になる
      expect(screen.queryByTestId('image-viewer-modal')).toBeNull();
    });

    it('複数枚のとき正しい index でビューアが開く（1 / N インデックス表示）', () => {
      const media = [
        makeMedia({ id: 'img-1', sortOrder: 0 }),
        makeMedia({ id: 'img-2', sortOrder: 1 }),
        makeMedia({ id: 'img-3', sortOrder: 2 }),
      ];
      render(<PostImageGallery media={media} authorNickname="師匠" />);

      // 1 枚目タップ → 「1 / 3」
      fireEvent.press(screen.getByLabelText('師匠の投稿画像 3枚中 1枚目'));
      expect(screen.getByText('1 / 3')).toBeTruthy();
    });
  });
});
