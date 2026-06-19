/**
 * @module lib/constants/limits/media
 * メディア・ファイル関連の制限値（クライアント事前検証用ミラー）。
 * 値の正はサーバー。サーバーエラー (400/429) のハンドリングは必須（api-client.md）。
 */

/** 画像の最大サイズ（MB） */
export const MAX_IMAGE_SIZE_MB = 4;

/** 画像の最大サイズ（バイト） */
export const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/** 動画の最大サイズ（バイト、80MB） */
export const MAX_VIDEO_SIZE = 80 * 1024 * 1024;

/** 無料プラン: 投稿に添付可能な画像の最大枚数 */
export const MAX_POST_IMAGES_FREE = 4;

/** プレミアムプラン: 投稿に添付可能な画像の最大枚数 */
export const MAX_POST_IMAGES_PREMIUM = 6;

/** 無料プラン: 投稿に添付可能な動画の最大本数（動画投稿はプレミアム限定） */
export const MAX_POST_VIDEOS_FREE = 0;

/** プレミアムプラン: 投稿に添付可能な動画の最大本数 */
export const MAX_POST_VIDEOS_PREMIUM = 1;

/** コメントに添付可能な画像の最大枚数 */
export const MAX_COMMENT_IMAGES = 2;

/** 無料プラン: コメントに添付可能な動画の最大本数（プレミアム限定） */
export const MAX_COMMENT_VIDEOS_FREE = 0;

/** プレミアムプラン: コメントに添付可能な動画の最大本数 */
export const MAX_COMMENT_VIDEOS_PREMIUM = 1;

/** 圧縮前の画像最大サイズ（バイト、10MB） */
export const MAX_IMAGE_SIZE_BEFORE_COMPRESSION = 10 * 1024 * 1024;

/** 圧縮スキップのしきい値（バイト、500KB） */
export const SKIP_COMPRESSION_THRESHOLD = 500 * 1024;

/** 画像の最大幅または高さ（px） */
export const MAX_IMAGE_DIMENSION = 1920;

/** デフォルト画像品質（0〜1） */
export const DEFAULT_IMAGE_QUALITY = 0.8;

/** アバター圧縮後の最大サイズ（MB） */
export const AVATAR_COMPRESSION_MAX_SIZE_MB = 0.5;

/** アバター最大解像度（px） */
export const AVATAR_MAX_DIMENSION = 512;

/** ヘッダー圧縮後の最大サイズ（MB） */
export const HEADER_COMPRESSION_MAX_SIZE_MB = 1;

/** ヘッダー最大解像度（px） */
export const HEADER_MAX_DIMENSION = 1500;

/** プロフィール画像に許可される MIME タイプ */
export const ALLOWED_PROFILE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** AllowedProfileImageType の union 型 */
export type AllowedProfileImageType = (typeof ALLOWED_PROFILE_IMAGE_TYPES)[number];

// ---------------------------------------------------------------------------
// 圧縮品質（0〜1 の JPEG 品質。目標サイズが大きいほど高品質で出力する）
// ---------------------------------------------------------------------------

/**
 * 目標サイズ判定のしきい値（バイト）。
 * AVATAR_COMPRESSION_MAX_SIZE_MB / HEADER_COMPRESSION_MAX_SIZE_MB のバイト換算値と
 * 比較し、このしきい値を超える場合は高品質、以下の場合は低品質を使う。
 */
export const COMPRESSION_QUALITY_THRESHOLD_BYTES = 500 * 1024;

/** アバター圧縮: 目標サイズが COMPRESSION_QUALITY_THRESHOLD_BYTES 超の場合の品質 */
export const AVATAR_COMPRESSION_QUALITY_HIGH = 0.9;

/** アバター圧縮: 目標サイズが COMPRESSION_QUALITY_THRESHOLD_BYTES 以下の場合の品質 */
export const AVATAR_COMPRESSION_QUALITY_LOW = 0.75;

/** ヘッダー圧縮: 目標サイズが COMPRESSION_QUALITY_THRESHOLD_BYTES 超の場合の品質 */
export const HEADER_COMPRESSION_QUALITY_HIGH = 0.85;

/** ヘッダー圧縮: 目標サイズが COMPRESSION_QUALITY_THRESHOLD_BYTES 以下の場合の品質 */
export const HEADER_COMPRESSION_QUALITY_LOW = 0.7;
