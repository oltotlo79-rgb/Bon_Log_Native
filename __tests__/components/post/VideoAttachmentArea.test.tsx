/**
 * components/post/VideoAttachmentArea のユニットテスト。
 * プレミアム・非プレミアム状態、追加・削除ボタンを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VideoAttachmentArea } from '@/components/post/VideoAttachmentArea';

const mockRouterPush = jest.requireMock('expo-router').router.push;

describe('VideoAttachmentArea', () => {
  describe('非プレミアム状態', () => {
    it('「動画投稿はプレミアムプランでご利用いただけます」が表示される', () => {
      render(
        <VideoAttachmentArea
          isPremium={false}
          videoUri={null}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      expect(screen.getByText('動画投稿はプレミアムプランでご利用いただけます')).toBeTruthy();
    });

    it('「プレミアムプランを見る」リンクが表示される', () => {
      render(
        <VideoAttachmentArea
          isPremium={false}
          videoUri={null}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      expect(screen.getByRole('link', { name: 'プレミアムプランを見る' })).toBeTruthy();
    });

    it('「プレミアムプランを見る」タップで router.push が呼ばれる', () => {
      render(
        <VideoAttachmentArea
          isPremium={false}
          videoUri={null}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      fireEvent.press(screen.getByRole('link', { name: 'プレミアムプランを見る' }));
      expect(mockRouterPush).toHaveBeenCalled();
    });

    it('「動画を追加」ボタンが表示されない', () => {
      render(
        <VideoAttachmentArea
          isPremium={false}
          videoUri={null}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      expect(screen.queryByRole('button', { name: '動画を追加' })).toBeNull();
    });
  });

  describe('プレミアム状態 — 動画未添付', () => {
    it('「動画を追加」ボタンが表示される', () => {
      render(
        <VideoAttachmentArea
          isPremium={true}
          videoUri={null}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      expect(screen.getByRole('button', { name: '動画を追加' })).toBeTruthy();
    });

    it('「動画を追加」タップで onAdd が呼ばれる', () => {
      const onAdd = jest.fn();
      render(
        <VideoAttachmentArea
          isPremium={true}
          videoUri={null}
          onAdd={onAdd}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      fireEvent.press(screen.getByRole('button', { name: '動画を追加' }));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('「動画（最大1本）」ラベルが表示される', () => {
      render(
        <VideoAttachmentArea
          isPremium={true}
          videoUri={null}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      expect(screen.getByText('動画（最大1本）')).toBeTruthy();
    });
  });

  describe('プレミアム状態 — 動画添付済み', () => {
    it('「動画を削除」ボタンが表示される', () => {
      render(
        <VideoAttachmentArea
          isPremium={true}
          videoUri="https://example.com/video.mp4"
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      expect(screen.getByRole('button', { name: '動画を削除' })).toBeTruthy();
    });

    it('「動画を削除」タップで onRemove が呼ばれる', () => {
      const onRemove = jest.fn();
      render(
        <VideoAttachmentArea
          isPremium={true}
          videoUri="https://example.com/video.mp4"
          onAdd={jest.fn()}
          onRemove={onRemove}
          isDisabled={false}
        />
      );
      fireEvent.press(screen.getByRole('button', { name: '動画を削除' }));
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('「動画を追加」ボタンが非表示になる', () => {
      render(
        <VideoAttachmentArea
          isPremium={true}
          videoUri="https://example.com/video.mp4"
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          isDisabled={false}
        />
      );
      expect(screen.queryByRole('button', { name: '動画を追加' })).toBeNull();
    });
  });
});
