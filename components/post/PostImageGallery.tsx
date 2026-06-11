/**
 * @module components/post/PostImageGallery
 * 投稿に添付された 1〜4 件の画像グリッド表示。
 * 画像タップは PM 判断でフルスクリーンビューア実装前のため暫定無効（PM 決定事項）。
 * 仕様: docs/design/post-card.md §7
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import {
  colorSurfaceMuted,
  spacing5,
  durationFast,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** セル間溝（仕様: 固定 2pt）*/
const CELL_GAP = 2;

/** カード左右パディングを打ち消して画面端まで広げるためのネガティブマージン */
const GALLERY_NEGATIVE_MARGIN = -spacing5;

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type PostImageMedia = {
  id: string;
  url: string;
  type: 'image' | 'video';
  sortOrder: number;
};

export type PostImageGalleryProps = {
  media: readonly PostImageMedia[];
  /** 投稿者名（accessibilityLabel に使用）*/
  authorNickname: string;
};

// ---------------------------------------------------------------------------
// 画像セルコンポーネント
// ---------------------------------------------------------------------------

type ImageCellProps = {
  item: PostImageMedia;
  label: string;
  width: number;
  height: number;
};

const ImageCell = React.memo(function ImageCell({
  item,
  label,
  width,
  height,
}: ImageCellProps) {
  return (
    <Image
      source={{ uri: item.url }}
      style={[styles.imageCell, { width, height }]}
      contentFit="cover"
      transition={durationFast}
      recyclingKey={item.id}
      accessibilityLabel={label}
      // 画像タップは暫定無効（フルスクリーンビューア未実装）
      accessibilityRole="image"
    />
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostImageGallery({ media, authorNickname }: PostImageGalleryProps) {
  const { width: screenWidth } = useWindowDimensions();

  // 画像のみを対象とし、sortOrder でソートして最大 4 枚に絞る
  const images = useMemo(
    () =>
      media
        .filter((m) => m.type === 'image')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 4),
    [media]
  );

  if (images.length === 0) return null;

  const galleryWidth = screenWidth - spacing5 * 2;

  function makeLabel(index: number): string {
    return `${authorNickname}の投稿画像 ${images.length}枚中 ${index + 1}枚目`;
  }

  if (images.length === 1) {
    const item = images[0];
    if (item === undefined) return null;
    const height = Math.round(galleryWidth * (9 / 16));
    return (
      <View style={styles.gallery}>
        <ImageCell
          item={item}
          label={makeLabel(0)}
          width={galleryWidth}
          height={height}
        />
      </View>
    );
  }

  if (images.length === 2) {
    const cellWidth = Math.floor((galleryWidth - CELL_GAP) / 2);
    const cellHeight = cellWidth;
    return (
      <View style={[styles.gallery, styles.row]}>
        {images.map((item, i) => (
          <ImageCell
            key={item.id}
            item={item}
            label={makeLabel(i)}
            width={cellWidth}
            height={cellHeight}
          />
        ))}
      </View>
    );
  }

  if (images.length === 3) {
    const rightWidth = Math.floor((galleryWidth - CELL_GAP) / 2);
    const leftWidth = galleryWidth - rightWidth - CELL_GAP;
    const rightCellHeight = Math.floor((rightWidth - CELL_GAP) / 2);
    const leftHeight = rightCellHeight * 2 + CELL_GAP;
    const [img0, img1, img2] = images;
    if (img0 === undefined || img1 === undefined || img2 === undefined) return null;
    return (
      <View style={[styles.gallery, styles.row]}>
        {/* 左: 縦長 */}
        <ImageCell
          item={img0}
          label={makeLabel(0)}
          width={leftWidth}
          height={leftHeight}
        />
        <View style={[styles.column, { gap: CELL_GAP }]}>
          <ImageCell
            item={img1}
            label={makeLabel(1)}
            width={rightWidth}
            height={rightCellHeight}
          />
          <ImageCell
            item={img2}
            label={makeLabel(2)}
            width={rightWidth}
            height={rightCellHeight}
          />
        </View>
      </View>
    );
  }

  // 4 枚: 2x2 グリッド
  const cellWidth = Math.floor((galleryWidth - CELL_GAP) / 2);
  const cellHeight = cellWidth;
  const [img0, img1, img2, img3] = images;
  if (img0 === undefined || img1 === undefined || img2 === undefined || img3 === undefined) {
    return null;
  }
  return (
    <View style={styles.gallery}>
      <View style={[styles.row, { marginBottom: CELL_GAP }]}>
        <ImageCell item={img0} label={makeLabel(0)} width={cellWidth} height={cellHeight} />
        <View style={{ width: CELL_GAP }} />
        <ImageCell item={img1} label={makeLabel(1)} width={cellWidth} height={cellHeight} />
      </View>
      <View style={styles.row}>
        <ImageCell item={img2} label={makeLabel(2)} width={cellWidth} height={cellHeight} />
        <View style={{ width: CELL_GAP }} />
        <ImageCell item={img3} label={makeLabel(3)} width={cellWidth} height={cellHeight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: {
    marginHorizontal: GALLERY_NEGATIVE_MARGIN,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  column: {
    flexDirection: 'column',
  },
  imageCell: {
    backgroundColor: colorSurfaceMuted,
  },
});
