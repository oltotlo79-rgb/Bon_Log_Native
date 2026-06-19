/**
 * @module lib/utils/image-compress
 * expo-image-manipulator を使った画像圧縮ユーティリティ。
 * 副作用（ファイルI/O）を含むが純粋な変換ロジックを担う。
 * アップロード前に呼び出してサイズ・解像度を制限する。
 */

import * as ImageManipulator from 'expo-image-manipulator';
import {
  MAX_IMAGE_DIMENSION,
  DEFAULT_IMAGE_QUALITY,
  SKIP_COMPRESSION_THRESHOLD,
  AVATAR_MAX_DIMENSION,
  AVATAR_COMPRESSION_MAX_SIZE_MB,
  AVATAR_COMPRESSION_QUALITY_HIGH,
  AVATAR_COMPRESSION_QUALITY_LOW,
  HEADER_MAX_DIMENSION,
  HEADER_COMPRESSION_MAX_SIZE_MB,
  HEADER_COMPRESSION_QUALITY_HIGH,
  HEADER_COMPRESSION_QUALITY_LOW,
  COMPRESSION_QUALITY_THRESHOLD_BYTES,
} from '@/lib/constants/limits/media';

export type CompressedImage = {
  uri: string;
  width: number;
  height: number;
};

export type ImageCompressOptions = {
  maxDimension?: number;
  quality?: number;
};

/**
 * 画像を圧縮してローカル URI を返す。
 * ファイルサイズが SKIP_COMPRESSION_THRESHOLD 以下の場合は圧縮をスキップする。
 *
 * @param localUri - expo-image-picker 等で取得したローカル URI
 * @param fileSizeBytes - 圧縮判定に使うファイルサイズ（バイト）。不明な場合は 0 を渡すと常に圧縮
 * @param options - 最大解像度・品質の上書き
 */
export async function compressImage(
  localUri: string,
  fileSizeBytes: number,
  options: ImageCompressOptions = {}
): Promise<CompressedImage> {
  const maxDimension = options.maxDimension ?? MAX_IMAGE_DIMENSION;
  const quality = options.quality ?? DEFAULT_IMAGE_QUALITY;

  // ファイルサイズがしきい値以下なら圧縮せずそのまま返す
  if (fileSizeBytes > 0 && fileSizeBytes <= SKIP_COMPRESSION_THRESHOLD) {
    const result = await ImageManipulator.manipulateAsync(localUri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: result.uri, width: result.width, height: result.height };
  }

  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: maxDimension } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * アバター用に画像を圧縮する。
 * 最大解像度 AVATAR_MAX_DIMENSION px・目標サイズ AVATAR_COMPRESSION_MAX_SIZE_MB MB。
 */
export async function compressAvatarImage(localUri: string): Promise<CompressedImage> {
  const targetSizeBytes = AVATAR_COMPRESSION_MAX_SIZE_MB * 1024 * 1024;
  const quality = targetSizeBytes > COMPRESSION_QUALITY_THRESHOLD_BYTES
    ? AVATAR_COMPRESSION_QUALITY_HIGH
    : AVATAR_COMPRESSION_QUALITY_LOW;

  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: AVATAR_MAX_DIMENSION } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * ヘッダー画像用に画像を圧縮する。
 * 最大解像度 HEADER_MAX_DIMENSION px・目標サイズ HEADER_COMPRESSION_MAX_SIZE_MB MB。
 */
export async function compressHeaderImage(localUri: string): Promise<CompressedImage> {
  const targetSizeBytes = HEADER_COMPRESSION_MAX_SIZE_MB * 1024 * 1024;
  const quality = targetSizeBytes > COMPRESSION_QUALITY_THRESHOLD_BYTES
    ? HEADER_COMPRESSION_QUALITY_HIGH
    : HEADER_COMPRESSION_QUALITY_LOW;

  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: HEADER_MAX_DIMENSION } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return { uri: result.uri, width: result.width, height: result.height };
}
