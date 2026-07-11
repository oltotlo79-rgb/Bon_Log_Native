/**
 * @module components/post/PostImageGallery
 * 投稿に添付された 1〜4 件の画像グリッド表示。
 * サムネイルタップで ImageViewerModal をフルスクリーン表示する。
 *
 * 幅は screenWidth からの逆算ではなく、親（PostCard の contentInner）から自然に
 * 継承した 100% を基準に flex / aspectRatio でセル比率を組む。墨筆枠
 * （post-frame.svg）はカード実寸へ非一様伸縮されるため、screenWidth と固定の
 * 打ち消しマージンに基づく計算では枠内セーフインセットとズレて画像が枠に重なる
 * （実機報告の原因）。相対レイアウトにすることで contentInner の内側に常に収まる。
 * 仕様: docs/design/post-card.md §7
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colorSurfaceMuted, durationFast } from '@/lib/constants/design-tokens';
import { ImageViewerModal } from '@/components/common/ImageViewerModal';
import type { ImageViewerImage } from '@/components/common/ImageViewerModal';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** セル間溝（仕様: 固定 2pt）*/
const CELL_GAP = 2;

/** 画像 1 枚時のアスペクト比（16:9） */
const SINGLE_IMAGE_ASPECT_RATIO = 16 / 9;

/** 画像 2〜4 枚時の各セルのアスペクト比（正方形） */
const GRID_CELL_ASPECT_RATIO = 1;

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
  style: StyleProp<ViewStyle>;
  onPress: () => void;
};

const ImageCell = React.memo(function ImageCell({
  item,
  label,
  style,
  onPress,
}: ImageCellProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.cellPressable, style, pressed && styles.cellPressed]}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.cellImage}
        contentFit="cover"
        transition={durationFast}
        recyclingKey={item.id}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostImageGallery({ media, authorNickname }: PostImageGalleryProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // 画像のみを対象とし、sortOrder でソートして最大 4 枚に絞る
  const images = useMemo(
    () =>
      media
        .filter((m) => m.type === 'image')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 4),
    [media]
  );

  // ImageViewerModal に渡す形式へ変換する
  const viewerImages = useMemo<ImageViewerImage[]>(
    () =>
      images.map((img, i) => ({
        uri: img.url,
        accessibilityLabel: `${authorNickname}の投稿画像 ${images.length}枚中 ${i + 1}枚目`,
      })),
    [images, authorNickname]
  );

  const handleOpenViewer = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerIndex(null);
  }, []);

  if (images.length === 0) return null;

  function makeLabel(index: number): string {
    return `${authorNickname}の投稿画像 ${images.length}枚中 ${index + 1}枚目`;
  }

  const renderGallery = () => {
    if (images.length === 1) {
      const item = images[0];
      if (item === undefined) return null;
      return (
        <View style={styles.gallery}>
          <ImageCell
            item={item}
            label={makeLabel(0)}
            style={styles.cellSingle}
            onPress={() => handleOpenViewer(0)}
          />
        </View>
      );
    }

    if (images.length === 2) {
      return (
        <View style={[styles.gallery, styles.row]}>
          {images.map((item, i) => (
            <ImageCell
              key={item.id}
              item={item}
              label={makeLabel(i)}
              style={styles.cellGridFlex}
              onPress={() => handleOpenViewer(i)}
            />
          ))}
        </View>
      );
    }

    if (images.length === 3) {
      const [img0, img1, img2] = images;
      if (img0 === undefined || img1 === undefined || img2 === undefined) return null;
      return (
        <View style={[styles.gallery, styles.row]}>
          <ImageCell
            item={img0}
            label={makeLabel(0)}
            style={styles.cellFillHeight}
            onPress={() => handleOpenViewer(0)}
          />
          {/* 右列: 2 セルの高さ + 溝ぶんに左セルが stretch で自動的に一致する */}
          <View style={styles.column}>
            <ImageCell
              item={img1}
              label={makeLabel(1)}
              style={styles.cellGridStretch}
              onPress={() => handleOpenViewer(1)}
            />
            <ImageCell
              item={img2}
              label={makeLabel(2)}
              style={styles.cellGridStretch}
              onPress={() => handleOpenViewer(2)}
            />
          </View>
        </View>
      );
    }

    // 4 枚: 2x2 グリッド
    const [img0, img1, img2, img3] = images;
    if (img0 === undefined || img1 === undefined || img2 === undefined || img3 === undefined) {
      return null;
    }
    return (
      <View style={styles.gallery}>
        <View style={styles.row}>
          <ImageCell
            item={img0}
            label={makeLabel(0)}
            style={styles.cellGridFlex}
            onPress={() => handleOpenViewer(0)}
          />
          <ImageCell
            item={img1}
            label={makeLabel(1)}
            style={styles.cellGridFlex}
            onPress={() => handleOpenViewer(1)}
          />
        </View>
        <View style={styles.row}>
          <ImageCell
            item={img2}
            label={makeLabel(2)}
            style={styles.cellGridFlex}
            onPress={() => handleOpenViewer(2)}
          />
          <ImageCell
            item={img3}
            label={makeLabel(3)}
            style={styles.cellGridFlex}
            onPress={() => handleOpenViewer(3)}
          />
        </View>
      </View>
    );
  };

  return (
    <>
      {renderGallery()}
      <ImageViewerModal
        images={viewerImages}
        initialIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={handleCloseViewer}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gallery: {
    width: '100%',
    overflow: 'hidden',
    gap: CELL_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  column: {
    flex: 1,
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  cellPressable: {
    overflow: 'hidden',
    backgroundColor: colorSurfaceMuted,
  },
  cellPressed: {
    opacity: 0.85,
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  cellSingle: {
    width: '100%',
    aspectRatio: SINGLE_IMAGE_ASPECT_RATIO,
  },
  cellGridFlex: {
    flex: 1,
    aspectRatio: GRID_CELL_ASPECT_RATIO,
  },
  cellGridStretch: {
    aspectRatio: GRID_CELL_ASPECT_RATIO,
  },
  cellFillHeight: {
    flex: 1,
  },
});
