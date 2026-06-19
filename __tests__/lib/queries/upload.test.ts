/**
 * @module __tests__/lib/queries/upload
 * uploadImage / uploadVideo 関数および useUploadImageMutation / useUploadVideoMutation フックのテスト。
 *
 * モック境界: lib/api/client（apiClient）および lib/utils/image-compress。
 * 動画の R2 への直接 PUT は global.fetch をモックしてテストする。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { ERR_IMAGE_SIZE_EXCEEDED, ERR_MEDIA_UPLOAD_FAILED } from '@/lib/constants/errors';
import { MAX_IMAGE_SIZE_BEFORE_COMPRESSION, SKIP_COMPRESSION_THRESHOLD } from '@/lib/constants/limits/media';
import { uploadImage, uploadVideo, useUploadImageMutation, useUploadVideoMutation } from '@/lib/queries/upload';

const mockApiPost = jest.fn();
const mockCompressImage = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: jest.fn(),
    POST: (...args: unknown[]) => mockApiPost(...args),
    PATCH: jest.fn(),
    DELETE: jest.fn(),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

jest.mock('@/lib/utils/image-compress', () => ({
  compressImage: (...args: unknown[]) => mockCompressImage(...args),
}));

function makeApiError(code: MobileApiErrorCode, status: number): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

const COMPRESSED = {
  uri: 'file:///tmp/compressed.jpg',
  width: 1920,
  height: 1080,
};

const LOCAL_URI = 'file:///local/photo.jpg';
const PUBLIC_URL = 'https://cdn.bon-log.com/images/photo.jpg';

function createWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCompressImage.mockResolvedValue(COMPRESSED);
});

// ---------------------------------------------------------------------------
// uploadImage
// ---------------------------------------------------------------------------

describe('uploadImage', () => {
  it('正常系: 圧縮 → FormData POST → 公開 URL を返す', async () => {
    mockApiPost.mockResolvedValue({ data: { url: PUBLIC_URL }, error: undefined });

    const result = await uploadImage({ localUri: LOCAL_URI });

    expect(mockCompressImage).toHaveBeenCalledWith(LOCAL_URI, 0);
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/upload/image',
      expect.objectContaining({ body: expect.anything() })
    );
    expect(result).toBe(PUBLIC_URL);
  });

  it('fileSizeBytes を渡すと compressImage に伝達される', async () => {
    mockApiPost.mockResolvedValue({ data: { url: PUBLIC_URL }, error: undefined });

    await uploadImage({ localUri: LOCAL_URI, fileSizeBytes: SKIP_COMPRESSION_THRESHOLD - 1 });

    expect(mockCompressImage).toHaveBeenCalledWith(LOCAL_URI, SKIP_COMPRESSION_THRESHOLD - 1);
  });

  it('fileSizeBytes が MAX_IMAGE_SIZE_BEFORE_COMPRESSION を超える場合は ERR_IMAGE_SIZE_EXCEEDED を throw する', async () => {
    await expect(
      uploadImage({ localUri: LOCAL_URI, fileSizeBytes: MAX_IMAGE_SIZE_BEFORE_COMPRESSION + 1 })
    ).rejects.toThrow(ERR_IMAGE_SIZE_EXCEEDED);

    // API は呼ばれない
    expect(mockCompressImage).not.toHaveBeenCalled();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('fileSizeBytes が丁度 MAX_IMAGE_SIZE_BEFORE_COMPRESSION の場合は throw しない', async () => {
    mockApiPost.mockResolvedValue({ data: { url: PUBLIC_URL }, error: undefined });

    await expect(
      uploadImage({ localUri: LOCAL_URI, fileSizeBytes: MAX_IMAGE_SIZE_BEFORE_COMPRESSION })
    ).resolves.toBe(PUBLIC_URL);
  });

  it('fileSizeBytes が 0 の場合は常に compressImage を呼ぶ（サイズ不明）', async () => {
    mockApiPost.mockResolvedValue({ data: { url: PUBLIC_URL }, error: undefined });

    await uploadImage({ localUri: LOCAL_URI, fileSizeBytes: 0 });

    expect(mockCompressImage).toHaveBeenCalledWith(LOCAL_URI, 0);
  });

  it('API が ApiError を返した場合はそのまま throw される', async () => {
    const apiErr = makeApiError('VALIDATION_ERROR', 400);
    mockApiPost.mockResolvedValue({ data: undefined, error: apiErr });

    await expect(uploadImage({ localUri: LOCAL_URI })).rejects.toThrow(apiErr);
  });

  it('API の error が undefined かつ data も undefined の場合は ERR_MEDIA_UPLOAD_FAILED を throw する', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: undefined });

    await expect(uploadImage({ localUri: LOCAL_URI })).rejects.toThrow(ERR_MEDIA_UPLOAD_FAILED);
  });

  it('compressImage が失敗した場合はエラーが伝播する', async () => {
    mockCompressImage.mockRejectedValue(new Error('Compression failed'));

    await expect(uploadImage({ localUri: LOCAL_URI })).rejects.toThrow('Compression failed');

    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// uploadVideo
// ---------------------------------------------------------------------------

describe('uploadVideo', () => {
  const PRESIGNED_DATA = {
    uploadUrl: 'https://r2.example.com/presigned-put-url',
    fileUrl: 'https://cdn.bon-log.com/videos/video.mp4',
    contentLength: 5000000,
  };

  const VIDEO_PARAMS = {
    localUri: 'file:///local/video.mp4',
    fileSize: 5000000,
    contentType: 'video/mp4' as const,
    folder: 'post-videos' as const,
  };

  it('正常系: presigned URL 取得 → R2 PUT → fileUrl を返す', async () => {
    mockApiPost.mockResolvedValue({ data: PRESIGNED_DATA, error: undefined });
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await uploadVideo(VIDEO_PARAMS);

    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/upload/presigned',
      expect.objectContaining({
        body: {
          contentType: 'video/mp4',
          fileSize: 5000000,
          folder: 'post-videos',
        },
      })
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      PRESIGNED_DATA.uploadUrl,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'video/mp4',
        }),
      })
    );
    expect(result).toBe(PRESIGNED_DATA.fileUrl);
  });

  it('contentType と folder のデフォルト値が適用される', async () => {
    mockApiPost.mockResolvedValue({ data: PRESIGNED_DATA, error: undefined });
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await uploadVideo({ localUri: 'file:///local/video.mp4', fileSize: 1000 });

    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/upload/presigned',
      expect.objectContaining({
        body: expect.objectContaining({
          contentType: 'video/mp4',
          folder: 'post-videos',
        }),
      })
    );
  });

  it('presigned URL 取得で 403 PREMIUM_REQUIRED が返った場合は ApiError を throw する', async () => {
    const apiErr = makeApiError('PREMIUM_REQUIRED', 403);
    mockApiPost.mockResolvedValue({ data: undefined, error: apiErr });

    await expect(uploadVideo(VIDEO_PARAMS)).rejects.toThrow(apiErr);

    // R2 への PUT は行わない
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('presigned URL 取得で error/data が undefined の場合は ERR_MEDIA_UPLOAD_FAILED を throw する', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: undefined });

    await expect(uploadVideo(VIDEO_PARAMS)).rejects.toThrow(ERR_MEDIA_UPLOAD_FAILED);
  });

  it('R2 への PUT が ok でない場合は ERR_MEDIA_UPLOAD_FAILED を throw する', async () => {
    mockApiPost.mockResolvedValue({ data: PRESIGNED_DATA, error: undefined });
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });

    await expect(uploadVideo(VIDEO_PARAMS)).rejects.toThrow(ERR_MEDIA_UPLOAD_FAILED);
  });

  it('R2 への PUT が例外を throw した場合はエラーが伝播する', async () => {
    mockApiPost.mockResolvedValue({ data: PRESIGNED_DATA, error: undefined });
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(uploadVideo(VIDEO_PARAMS)).rejects.toThrow('Network error');
  });
});

// ---------------------------------------------------------------------------
// useUploadImageMutation
// ---------------------------------------------------------------------------

describe('useUploadImageMutation', () => {
  it('成功で公開 URL が返る', async () => {
    mockApiPost.mockResolvedValue({ data: { url: PUBLIC_URL }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUploadImageMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ localUri: LOCAL_URI });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(PUBLIC_URL);
  });

  it('エラー時に isError が true になる', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: makeApiError('VALIDATION_ERROR', 400) });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUploadImageMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ localUri: LOCAL_URI });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useUploadVideoMutation
// ---------------------------------------------------------------------------

describe('useUploadVideoMutation', () => {
  const PRESIGNED_DATA = {
    uploadUrl: 'https://r2.example.com/put',
    fileUrl: 'https://cdn.bon-log.com/videos/video.mp4',
    contentLength: 1000,
  };

  it('成功で公開 URL が返る', async () => {
    mockApiPost.mockResolvedValue({ data: PRESIGNED_DATA, error: undefined });
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUploadVideoMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ localUri: 'file:///video.mp4', fileSize: 1000 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(PRESIGNED_DATA.fileUrl);
  });

  it('presigned 取得失敗時に isError が true になる', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: makeApiError('PREMIUM_REQUIRED', 403) });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUploadVideoMutation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ localUri: 'file:///video.mp4', fileSize: 1000 });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
