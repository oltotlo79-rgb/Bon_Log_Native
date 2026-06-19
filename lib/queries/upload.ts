/**
 * @module lib/queries/upload
 * メディアアップロード関数・ミューテーションフック。
 *
 * 画像: 圧縮 → POST /api/v1/upload/image（multipart/form-data）→ 公開 URL 返却。
 * 動画: POST /api/v1/upload/presigned（presigned URL 取得）→ R2 へ直接 PUT → fileUrl 返却。
 *       動画 PUT は手書き fetch の唯一の例外（api-client.md）。
 *
 * frontend は localUri を渡すと公開 URL (string) を受け取れる。
 */

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { compressImage } from '@/lib/utils/image-compress';
import { MAX_IMAGE_SIZE_BEFORE_COMPRESSION } from '@/lib/constants/limits/media';
import {
  ERR_IMAGE_SIZE_EXCEEDED,
  ERR_MEDIA_UPLOAD_FAILED,
} from '@/lib/constants/errors';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type ImageUploadResponse = components['schemas']['ImageUploadResponse'];
export type PresignedUploadResponse = components['schemas']['PresignedUploadResponse'];
export type VideoContentType = components['schemas']['PresignedUploadRequest']['contentType'];
export type PresignedFolder = components['schemas']['PresignedUploadRequest']['folder'];

// ---------------------------------------------------------------------------
// 画像アップロード
// ---------------------------------------------------------------------------

export type UploadImageParams = {
  /** expo-image-picker 等で取得したローカル URI */
  localUri: string;
  /** ファイルサイズ（バイト）。不明な場合は 0 を渡すと常に圧縮する */
  fileSizeBytes?: number;
};

/**
 * ローカル画像を圧縮して POST /api/v1/upload/image に送信し、公開 URL を返す。
 *
 * @throws {Error} 圧縮前サイズが MAX_IMAGE_SIZE_BEFORE_COMPRESSION を超える場合
 * @throws {ApiError} アップロード API が非 2xx を返した場合
 */
export async function uploadImage(params: UploadImageParams): Promise<string> {
  const { localUri, fileSizeBytes = 0 } = params;

  // 圧縮前のファイルサイズが上限を超える場合はリジェクトする
  if (fileSizeBytes > 0 && fileSizeBytes > MAX_IMAGE_SIZE_BEFORE_COMPRESSION) {
    throw new Error(ERR_IMAGE_SIZE_EXCEEDED);
  }

  const compressed = await compressImage(localUri, fileSizeBytes);

  // expo-image-manipulator の出力は file:// URI のため FormData で送信する
  const formData = new FormData();
  // @ts-expect-error RN の FormData.append は { uri, name, type } を受け付けるが、DOM の Blob 型とは異なる
  formData.append('file', { uri: compressed.uri, name: 'image.jpg', type: 'image/jpeg' });

  // openapi-fetch v0.17 は FormData body を fetch へそのまま渡す。
  // Content-Type は fetch が multipart/form-data + boundary を自動設定する。
  const { data, error } = await apiClient.POST('/api/v1/upload/image', {
    // @ts-expect-error openapi-fetch の multipart/form-data スキーマ型は { file: string } だが RN では FormData オブジェクトを渡す必要がある
    body: formData,
    bodySerializer: (body: unknown) => body,
  });

  if (error !== undefined || data === undefined) {
    throw error ?? new Error(ERR_MEDIA_UPLOAD_FAILED);
  }

  return data.url;
}

/**
 * 画像アップロードミューテーションフック。
 * frontend が useUploadImageMutation() を使ってアップロード状態を管理できる。
 */
export function useUploadImageMutation() {
  return useMutation<string, Error, UploadImageParams>({
    mutationFn: (params) => uploadImage(params),
  });
}

// ---------------------------------------------------------------------------
// 動画アップロード（presigned PUT）
// ---------------------------------------------------------------------------

export type UploadVideoParams = {
  /** expo-image-picker 等で取得したローカル URI */
  localUri: string;
  /** ファイルサイズ（バイト）。presigned URL の署名対象になるため正確な値が必要 */
  fileSize: number;
  /** 動画の MIME タイプ */
  contentType?: VideoContentType;
  /** アップロード先フォルダ（デフォルト: post-videos） */
  folder?: PresignedFolder;
};

/**
 * 動画を R2 へ直接アップロードして公開 URL を返す。
 * presigned URL への直接 PUT は api-client.md で認める唯一の手書き fetch 例外。
 *
 * @throws {ApiError} presigned URL 取得が非 2xx の場合（403 PREMIUM_REQUIRED を含む）
 * @throws {Error} R2 への直接 PUT が失敗した場合
 */
export async function uploadVideo(params: UploadVideoParams): Promise<string> {
  const {
    localUri,
    fileSize,
    contentType = 'video/mp4',
    folder = 'post-videos',
  } = params;

  // presigned PUT URL をサーバーから取得する
  const { data: presignedData, error: presignedError } = await apiClient.POST(
    '/api/v1/upload/presigned',
    {
      body: {
        contentType,
        fileSize,
        folder,
      },
    }
  );

  if (presignedError !== undefined || presignedData === undefined) {
    throw presignedError ?? new Error(ERR_MEDIA_UPLOAD_FAILED);
  }

  // R2 presigned URL への直接 PUT（手書き fetch の唯一の例外: api-client.md）
  // Content-Type と Content-Length は署名対象のため必須。
  // @ts-expect-error RN の fetch は { uri } オブジェクトをネイティブストリームとして扱うが、DOM の BodyInit 型にはない形式
  const rnPutBody: BodyInit = { uri: localUri };
  const putResponse = await fetch(presignedData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(presignedData.contentLength),
    },
    body: rnPutBody,
  });

  if (!putResponse.ok) {
    throw new Error(ERR_MEDIA_UPLOAD_FAILED);
  }

  return presignedData.fileUrl;
}

/**
 * 動画アップロードミューテーションフック（プレミアム限定）。
 */
export function useUploadVideoMutation() {
  return useMutation<string, Error, UploadVideoParams>({
    mutationFn: (params) => uploadVideo(params),
  });
}
