/**
 * @module __tests__/lib/utils/image-compress
 * compressImage / compressAvatarImage / compressHeaderImage のテスト。
 *
 * expo-image-manipulator はセットアップで一元モック済みのため、
 * ここでは呼び出し引数と戻り値の変換ロジックを検証する。
 */

import {
  compressImage,
  compressAvatarImage,
  compressHeaderImage,
} from '@/lib/utils/image-compress';
import {
  SKIP_COMPRESSION_THRESHOLD,
  MAX_IMAGE_DIMENSION,
  DEFAULT_IMAGE_QUALITY,
  AVATAR_MAX_DIMENSION,
  HEADER_MAX_DIMENSION,
} from '@/lib/constants/limits/media';

// expo-image-manipulator のモック（setup.ts には未登録なためここで定義）
const mockManipulateAsync = jest.fn();

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

const LOCAL_URI = 'file:///local/photo.jpg';

const MANIPULATED_RESULT = {
  uri: 'file:///tmp/output.jpg',
  width: 1920,
  height: 1080,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockManipulateAsync.mockResolvedValue(MANIPULATED_RESULT);
});

// ---------------------------------------------------------------------------
// compressImage
// ---------------------------------------------------------------------------

describe('compressImage', () => {
  describe('fileSizeBytes が SKIP_COMPRESSION_THRESHOLD 以下の場合', () => {
    it('compress: 1（無劣化）で manipulateAsync を呼び、resize アクションを渡さない', async () => {
      const result = await compressImage(LOCAL_URI, SKIP_COMPRESSION_THRESHOLD);

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        LOCAL_URI,
        [],
        expect.objectContaining({ compress: 1 })
      );
      expect(result).toEqual({
        uri: MANIPULATED_RESULT.uri,
        width: MANIPULATED_RESULT.width,
        height: MANIPULATED_RESULT.height,
      });
    });

    it('fileSizeBytes が 1 の場合もスキップ（threshold 以下）', async () => {
      await compressImage(LOCAL_URI, 1);

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        LOCAL_URI,
        [],
        expect.objectContaining({ compress: 1 })
      );
    });
  });

  describe('fileSizeBytes が 0 の場合', () => {
    it('常に圧縮を行う（size 不明は 0 を渡す規約）', async () => {
      await compressImage(LOCAL_URI, 0);

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        LOCAL_URI,
        expect.arrayContaining([expect.objectContaining({ resize: { width: MAX_IMAGE_DIMENSION } })]),
        expect.objectContaining({ compress: DEFAULT_IMAGE_QUALITY })
      );
    });
  });

  describe('fileSizeBytes が SKIP_COMPRESSION_THRESHOLD より大きい場合', () => {
    it('resize と quality 圧縮を行う', async () => {
      const largeSizeBytes = SKIP_COMPRESSION_THRESHOLD + 1;
      await compressImage(LOCAL_URI, largeSizeBytes);

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        LOCAL_URI,
        [{ resize: { width: MAX_IMAGE_DIMENSION } }],
        expect.objectContaining({ compress: DEFAULT_IMAGE_QUALITY })
      );
    });

    it('JPEG フォーマットで出力する', async () => {
      await compressImage(LOCAL_URI, SKIP_COMPRESSION_THRESHOLD + 1);

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        LOCAL_URI,
        expect.anything(),
        expect.objectContaining({ format: 'jpeg' })
      );
    });
  });

  describe('options による上書き', () => {
    it('maxDimension オプションで最大解像度を上書きできる', async () => {
      await compressImage(LOCAL_URI, SKIP_COMPRESSION_THRESHOLD + 1, { maxDimension: 800 });

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        LOCAL_URI,
        [{ resize: { width: 800 } }],
        expect.anything()
      );
    });

    it('quality オプションで品質を上書きできる', async () => {
      await compressImage(LOCAL_URI, SKIP_COMPRESSION_THRESHOLD + 1, { quality: 0.5 });

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        LOCAL_URI,
        expect.anything(),
        expect.objectContaining({ compress: 0.5 })
      );
    });
  });

  it('manipulateAsync の結果から CompressedImage を返す', async () => {
    const customResult = { uri: 'file:///custom.jpg', width: 800, height: 600 };
    mockManipulateAsync.mockResolvedValue(customResult);

    const result = await compressImage(LOCAL_URI, SKIP_COMPRESSION_THRESHOLD + 1);

    expect(result).toEqual({ uri: 'file:///custom.jpg', width: 800, height: 600 });
  });

  it('manipulateAsync が失敗した場合はエラーが伝播する', async () => {
    mockManipulateAsync.mockRejectedValue(new Error('Manipulator error'));

    await expect(compressImage(LOCAL_URI, 0)).rejects.toThrow('Manipulator error');
  });
});

// ---------------------------------------------------------------------------
// compressAvatarImage
// ---------------------------------------------------------------------------

describe('compressAvatarImage', () => {
  it('AVATAR_MAX_DIMENSION でリサイズする', async () => {
    await compressAvatarImage(LOCAL_URI);

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      LOCAL_URI,
      [{ resize: { width: AVATAR_MAX_DIMENSION } }],
      expect.anything()
    );
  });

  it('JPEG フォーマットで出力する', async () => {
    await compressAvatarImage(LOCAL_URI);

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      LOCAL_URI,
      expect.anything(),
      expect.objectContaining({ format: 'jpeg' })
    );
  });

  it('CompressedImage を返す', async () => {
    const result = await compressAvatarImage(LOCAL_URI);

    expect(result).toEqual({
      uri: MANIPULATED_RESULT.uri,
      width: MANIPULATED_RESULT.width,
      height: MANIPULATED_RESULT.height,
    });
  });

  it('品質値が 0〜1 の範囲内である', async () => {
    await compressAvatarImage(LOCAL_URI);

    const callArgs = mockManipulateAsync.mock.calls[0];
    const options = callArgs[2] as { compress: number };
    expect(options.compress).toBeGreaterThan(0);
    expect(options.compress).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// compressHeaderImage
// ---------------------------------------------------------------------------

describe('compressHeaderImage', () => {
  it('HEADER_MAX_DIMENSION でリサイズする', async () => {
    await compressHeaderImage(LOCAL_URI);

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      LOCAL_URI,
      [{ resize: { width: HEADER_MAX_DIMENSION } }],
      expect.anything()
    );
  });

  it('JPEG フォーマットで出力する', async () => {
    await compressHeaderImage(LOCAL_URI);

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      LOCAL_URI,
      expect.anything(),
      expect.objectContaining({ format: 'jpeg' })
    );
  });

  it('CompressedImage を返す', async () => {
    const result = await compressHeaderImage(LOCAL_URI);

    expect(result).toEqual({
      uri: MANIPULATED_RESULT.uri,
      width: MANIPULATED_RESULT.width,
      height: MANIPULATED_RESULT.height,
    });
  });

  it('品質値が 0〜1 の範囲内である', async () => {
    await compressHeaderImage(LOCAL_URI);

    const callArgs = mockManipulateAsync.mock.calls[0];
    const options = callArgs[2] as { compress: number };
    expect(options.compress).toBeGreaterThan(0);
    expect(options.compress).toBeLessThanOrEqual(1);
  });

  it('アバターより大きい HEADER_MAX_DIMENSION でリサイズする（ヘッダーは横長）', () => {
    expect(HEADER_MAX_DIMENSION).toBeGreaterThan(AVATAR_MAX_DIMENSION);
  });
});
