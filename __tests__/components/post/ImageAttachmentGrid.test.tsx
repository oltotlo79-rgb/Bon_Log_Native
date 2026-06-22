/**
 * components/post/ImageAttachmentGrid のユニットテスト。
 * 追加ボタン・サムネイル表示・削除ボタン・disabled 状態を検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ImageAttachmentGrid } from '@/components/post/ImageAttachmentGrid';

function makeImage(localId: string, uri = `https://example.com/${localId}.jpg`) {
  return { localId, uri };
}

describe('ImageAttachmentGrid', () => {
  describe('追加ボタン', () => {
    it('画像が上限未満のとき「画像を追加」ボタンが表示される', () => {
      render(
        <ImageAttachmentGrid
          images={[]}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          maxCount={4}
          isDisabled={false}
        />
      );
      expect(screen.getByRole('button', { name: '画像を追加' })).toBeTruthy();
    });

    it('画像が上限に達したとき「画像を追加」ボタンが非表示になる', () => {
      const images = [
        makeImage('img-1'),
        makeImage('img-2'),
        makeImage('img-3'),
        makeImage('img-4'),
      ];
      render(
        <ImageAttachmentGrid
          images={images}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          maxCount={4}
          isDisabled={false}
        />
      );
      expect(screen.queryByRole('button', { name: '画像を追加' })).toBeNull();
    });

    it('「画像を追加」ボタンタップで onAdd が呼ばれる', () => {
      const onAdd = jest.fn();
      render(
        <ImageAttachmentGrid
          images={[]}
          onAdd={onAdd}
          onRemove={jest.fn()}
          maxCount={4}
          isDisabled={false}
        />
      );
      fireEvent.press(screen.getByRole('button', { name: '画像を追加' }));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('isDisabled=true のとき「画像を追加」ボタンは押せない', () => {
      const onAdd = jest.fn();
      render(
        <ImageAttachmentGrid
          images={[]}
          onAdd={onAdd}
          onRemove={jest.fn()}
          maxCount={4}
          isDisabled={true}
        />
      );
      const addButton = screen.getByRole('button', { name: '画像を追加' });
      expect(addButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('サムネイル', () => {
    it('画像がある場合はサムネイルが表示される', () => {
      render(
        <ImageAttachmentGrid
          images={[makeImage('img-1')]}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          maxCount={4}
          isDisabled={false}
        />
      );
      expect(screen.getByLabelText('添付画像1枚目')).toBeTruthy();
    });

    it('複数画像があるとき複数のサムネイルが表示される', () => {
      const images = [makeImage('img-1'), makeImage('img-2')];
      render(
        <ImageAttachmentGrid
          images={images}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          maxCount={4}
          isDisabled={false}
        />
      );
      expect(screen.getByLabelText('添付画像1枚目')).toBeTruthy();
      expect(screen.getByLabelText('添付画像2枚目')).toBeTruthy();
    });
  });

  describe('削除ボタン', () => {
    it('画像の削除ボタンが表示される', () => {
      render(
        <ImageAttachmentGrid
          images={[makeImage('img-1')]}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          maxCount={4}
          isDisabled={false}
        />
      );
      expect(screen.getByRole('button', { name: 'この画像を削除' })).toBeTruthy();
    });

    it('削除ボタンタップで onRemove が呼ばれる', () => {
      const onRemove = jest.fn();
      render(
        <ImageAttachmentGrid
          images={[makeImage('img-1')]}
          onAdd={jest.fn()}
          onRemove={onRemove}
          maxCount={4}
          isDisabled={false}
        />
      );
      fireEvent.press(screen.getByRole('button', { name: 'この画像を削除' }));
      expect(onRemove).toHaveBeenCalledWith('img-1');
    });
  });

  describe('ラベル表示', () => {
    it('maxCount が表示される（「画像（最大4枚）」）', () => {
      render(
        <ImageAttachmentGrid
          images={[]}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          maxCount={4}
          isDisabled={false}
        />
      );
      expect(screen.getByText('画像（最大4枚）')).toBeTruthy();
    });

    it('maxCount=6 のとき「画像（最大6枚）」が表示される', () => {
      render(
        <ImageAttachmentGrid
          images={[]}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          maxCount={6}
          isDisabled={false}
        />
      );
      expect(screen.getByText('画像（最大6枚）')).toBeTruthy();
    });
  });
});
