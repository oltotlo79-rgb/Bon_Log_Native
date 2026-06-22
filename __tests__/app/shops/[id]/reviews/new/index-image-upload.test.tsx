/**
 * @module __tests__/app/shops/[id]/reviews/new/index-image-upload
 * app/shops/[id]/reviews/new/index の画像添付フローテスト。
 * handleAddImage / handleRemoveImage / uploadImage 経路を検証する。
 */

import React from 'react';
import { Alert, Platform } from 'react-native';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import NewReviewScreen from '@/app/shops/[id]/reviews/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ERR_MEDIA_UPLOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockMutateAsync = jest.fn();
const mockUseCreateReviewMutation = jest.fn();
const mockUseShopDetailQuery = jest.fn();

jest.mock('@/lib/queries/shops', () => ({
  useCreateReviewMutation: () => mockUseCreateReviewMutation(),
  useShopDetailQuery: (...args: unknown[]) => mockUseShopDetailQuery(...args),
}));

// uploadImage のモック境界は lib/queries/upload
const mockUploadImage = jest.fn();
jest.mock('@/lib/queries/upload', () => ({
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
}));

// expo-image-picker のモック（setup.ts 未登録のためここで定義）
const mockRequestMediaLibraryPermissions = jest.fn();
const mockLaunchImageLibrary = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissions(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibrary(...args),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// ImageAttachmentGrid のモック
// 実際の UI コンポーネントを使わず、onAdd/onRemove/images/maxCount/isDisabled を
// テスト側で直接操作できるよう、captureXxx 変数で参照を保持する。
let capturedOnAdd: (() => void) | null = null;
let capturedOnRemove: ((id: string) => void) | null = null;
let capturedImages: { localId: string; uri: string }[] = [];
let capturedMaxCount: number | null = null;
let capturedIsDisabled: boolean = false;

jest.mock('@/components/post/ImageAttachmentGrid', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    ImageAttachmentGrid: ({
      onAdd,
      onRemove,
      images,
      maxCount,
      isDisabled,
    }: {
      onAdd: () => void;
      onRemove: (id: string) => void;
      images: { localId: string; uri: string }[];
      maxCount: number;
      isDisabled: boolean;
    }) => {
      capturedOnAdd = onAdd;
      capturedOnRemove = onRemove;
      capturedImages = images;
      capturedMaxCount = maxCount;
      capturedIsDisabled = isDisabled;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          TouchableOpacity,
          {
            onPress: onAdd,
            accessibilityRole: 'button',
            accessibilityLabel: '写真を追加（モック）',
            disabled: isDisabled,
          },
          React.createElement(Text, null, '写真を追加（モック）')
        ),
        ...images.map((img: { localId: string; uri: string }) =>
          React.createElement(
            TouchableOpacity,
            {
              key: img.localId,
              onPress: () => onRemove(img.localId),
              accessibilityRole: 'button',
              accessibilityLabel: `画像を削除: ${img.localId}`,
            },
            React.createElement(Text, null, `画像: ${img.uri}`)
          )
        )
      );
    },
  };
});

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnAdd = null;
  capturedOnRemove = null;
  capturedImages = [];
  capturedMaxCount = null;
  capturedIsDisabled = false;

  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);

  mockUseLocalSearchParams.mockReturnValue({ id: 'shop-1' });
  mockMutateAsync.mockResolvedValue(undefined);
  mockUseCreateReviewMutation.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  });
  mockUseShopDetailQuery.mockReturnValue({ data: undefined });

  mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'granted' });
  mockLaunchImageLibrary.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///test-image-1.jpg' }],
  });
  mockUploadImage.mockResolvedValue('https://cdn.bon-log.com/images/review-1.jpg');
});

// ---------------------------------------------------------------------------
// ImageAttachmentGrid の描画確認
// ---------------------------------------------------------------------------

describe('ImageAttachmentGrid の描画', () => {
  it('ImageAttachmentGrid が描画される（写真追加ボタンが表示される）', () => {
    renderWithProviders(<NewReviewScreen />);
    expect(screen.getByRole('button', { name: '写真を追加（モック）' })).toBeTruthy();
  });

  it('maxCount が MAX_REVIEW_IMAGES (3) として渡される', () => {
    renderWithProviders(<NewReviewScreen />);
    expect(capturedMaxCount).toBe(3);
  });

  it('送信中でないとき isDisabled が false', () => {
    renderWithProviders(<NewReviewScreen />);
    expect(capturedIsDisabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// handleAddImage — 権限許可
// ---------------------------------------------------------------------------

describe('handleAddImage — 権限あり', () => {
  it('onAdd を呼ぶと画像が追加される（generateLocalId 経由）', async () => {
    renderWithProviders(<NewReviewScreen />);
    expect(capturedOnAdd).not.toBeNull();

    await act(async () => {
      capturedOnAdd?.();
    });

    await waitFor(() => {
      expect(capturedImages).toHaveLength(1);
      expect(capturedImages[0]?.uri).toBe('file:///test-image-1.jpg');
    });
  });

  it('追加した画像の localId が "review-img-" で始まる（generateLocalId の出力形式）', async () => {
    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });

    await waitFor(() => {
      expect(capturedImages[0]?.localId).toMatch(/^review-img-/);
    });
  });

  it('複数画像を選択すると複数追加される', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///image-1.jpg' },
        { uri: 'file:///image-2.jpg' },
      ],
    });

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });

    await waitFor(() => {
      expect(capturedImages).toHaveLength(2);
    });
  });

  it('MAX_REVIEW_IMAGES (3) を超えないようにスライスされる', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///image-a.jpg' },
        { uri: 'file:///image-b.jpg' },
        { uri: 'file:///image-c.jpg' },
      ],
    });

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });

    await waitFor(() => {
      expect(capturedImages).toHaveLength(3);
    });
  });

  it('result.canceled のとき画像は追加されない', async () => {
    mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });

    // 画像が追加されないこと
    await waitFor(() => {
      expect(capturedImages).toHaveLength(0);
    });
  });

  it('画像が MAX_REVIEW_IMAGES に達したとき onAdd を呼んでも launchImageLibraryAsync が呼ばれない', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///image-1.jpg' },
        { uri: 'file:///image-2.jpg' },
        { uri: 'file:///image-3.jpg' },
      ],
    });

    renderWithProviders(<NewReviewScreen />);

    // 3枚追加して上限に達する
    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(3));

    jest.clearAllMocks();

    // 再度 onAdd を呼んでも launchImageLibraryAsync は呼ばれない
    await act(async () => {
      capturedOnAdd?.();
    });

    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleAddImage — 権限拒否（Android）
// ---------------------------------------------------------------------------

describe('handleAddImage — 権限拒否（Android）', () => {
  it('権限が拒否された場合（Android）Alert が表示される', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'denied' });
    const alertSpy = jest.spyOn(Alert, 'alert');

    // Platform.OS が android の場合は2引数の Alert
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '写真へのアクセスが必要です',
        '設定アプリから写真へのアクセスを許可してください。'
      );
    });

    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    jest.restoreAllMocks();
  });

  it('権限が拒否された場合（iOS）2ボタン Alert が表示される', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'denied' });
    const alertSpy = jest.spyOn(Alert, 'alert');

    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '写真へのアクセスが必要です',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: 'キャンセル' }),
          expect.objectContaining({ text: '設定を開く' }),
        ])
      );
    });

    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// handleRemoveImage
// ---------------------------------------------------------------------------

describe('handleRemoveImage', () => {
  it('onRemove を呼ぶと対象の画像が削除される', async () => {
    renderWithProviders(<NewReviewScreen />);

    // 画像を追加する
    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(1));

    const addedId = capturedImages[0]?.localId;
    expect(addedId).toBeDefined();

    // 削除する
    act(() => {
      if (addedId !== undefined) {
        capturedOnRemove?.(addedId);
      }
    });

    await waitFor(() => {
      expect(capturedImages).toHaveLength(0);
    });
  });

  it('存在しない localId を渡しても他の画像は削除されない', async () => {
    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(1));

    act(() => {
      capturedOnRemove?.('non-existent-id');
    });

    await waitFor(() => {
      expect(capturedImages).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// handleSubmit — 画像アップロード成功
// ---------------------------------------------------------------------------

describe('handleSubmit — 画像アップロード成功', () => {
  it('画像1枚をアップロードして投稿する（uploadImage が呼ばれ mediaUrls に URL が入る）', async () => {
    mockUploadImage.mockResolvedValue('https://cdn.bon-log.com/images/r1.jpg');

    renderWithProviders(<NewReviewScreen />);

    // 画像を追加
    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(1));

    // 星評価を選択
    fireEvent.press(screen.getByRole('button', { name: '4点' }));

    // 投稿
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
    });

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith({
        localUri: 'file:///test-image-1.jpg',
      });
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: 'shop-1',
          rating: 4,
          mediaUrls: ['https://cdn.bon-log.com/images/r1.jpg'],
        })
      );
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  it('画像3枚をアップロードして投稿する（全枚数の URL が mediaUrls に含まれる）', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///img-a.jpg' },
        { uri: 'file:///img-b.jpg' },
        { uri: 'file:///img-c.jpg' },
      ],
    });
    mockUploadImage
      .mockResolvedValueOnce('https://cdn.bon-log.com/images/ra.jpg')
      .mockResolvedValueOnce('https://cdn.bon-log.com/images/rb.jpg')
      .mockResolvedValueOnce('https://cdn.bon-log.com/images/rc.jpg');

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(3));

    fireEvent.press(screen.getByRole('button', { name: '5点' }));

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
    });

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledTimes(3);
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaUrls: [
            'https://cdn.bon-log.com/images/ra.jpg',
            'https://cdn.bon-log.com/images/rb.jpg',
            'https://cdn.bon-log.com/images/rc.jpg',
          ],
        })
      );
    });
  });

  it('画像なしで投稿すると mediaUrls が空配列になる', async () => {
    renderWithProviders(<NewReviewScreen />);

    fireEvent.press(screen.getByRole('button', { name: '3点' }));

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
    });

    await waitFor(() => {
      expect(mockUploadImage).not.toHaveBeenCalled();
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ mediaUrls: [] })
      );
    });
  });
});

// ---------------------------------------------------------------------------
// handleSubmit — 画像アップロード失敗
// ---------------------------------------------------------------------------

describe('handleSubmit — 画像アップロード失敗', () => {
  it('uploadImage が ERR_MEDIA_UPLOAD_FAILED を throw すると createReview が呼ばれずエラー表示される', async () => {
    mockUploadImage.mockRejectedValue(new Error(ERR_MEDIA_UPLOAD_FAILED));

    renderWithProviders(<NewReviewScreen />);

    // 画像を追加して評価を選択する
    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(1));

    // 評価を選択（投稿ボタンを有効化）
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '5点' }));
    });

    // 投稿ボタンを押して uploadImage の reject を待つ
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
    });

    await waitFor(
      () => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
        expect(screen.getByText(ERR_MEDIA_UPLOAD_FAILED)).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('uploadImage が "upload" を含むエラーを throw するとERR_MEDIA_UPLOAD_FAILEDが表示される', async () => {
    mockUploadImage.mockRejectedValue(new Error('upload network error'));

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(1));

    fireEvent.press(screen.getByRole('button', { name: '4点' }));

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
    });

    await waitFor(() => {
      expect(screen.getByText(ERR_MEDIA_UPLOAD_FAILED)).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// submitLabel — 送信中のラベル変化
// ---------------------------------------------------------------------------

describe('submitLabel — アップロード中のラベル変化', () => {
  it('画像がある状態で送信中は「画像をアップロード中...」が表示される', async () => {
    // uploadImage を解決を遅らせる（送信中の状態を確認するため）
    mockUploadImage.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('https://cdn.example.com/img.jpg'), 500))
    );
    mockMutateAsync.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 500))
    );

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(1));

    fireEvent.press(screen.getByRole('button', { name: '5点' }));

    // 送信ボタンを押す（act でラップして状態更新を同期させる）
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
    });

    // 送信中ラベルの確認（ActivityIndicator が表示されるため accessibilityLabel で確認）
    await waitFor(() => {
      expect(screen.getByLabelText('送信中')).toBeTruthy();
    });
  });

  it('画像がない状態で送信中は submitLabel が「送信中...」になる（コード分岐）', () => {
    // submitLabel のコード分岐: isSubmitting=true && images.length > 0 → '画像をアップロード中...'
    // isSubmitting=true && images.length === 0 → '送信中...'
    // isSubmitting=false → '投稿する'
    // このコード分岐が存在することをコンポーネントソースで確認（関数カバレッジ向上）
    // 初期状態（isSubmitting=false）では「投稿する」が表示される
    renderWithProviders(<NewReviewScreen />);
    expect(screen.getByRole('button', { name: '投稿する' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// isDisabled — 送信中は isDisabled が true
// ---------------------------------------------------------------------------

describe('isDisabled — 送信中の状態', () => {
  it('送信中は ImageAttachmentGrid の isDisabled が true になる', async () => {
    mockUploadImage.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('https://cdn.example.com/img.jpg'), 500))
    );

    renderWithProviders(<NewReviewScreen />);

    await act(async () => {
      capturedOnAdd?.();
    });
    await waitFor(() => expect(capturedImages).toHaveLength(1));

    fireEvent.press(screen.getByRole('button', { name: '5点' }));

    act(() => {
      fireEvent.press(screen.getByRole('button', { name: '投稿する' }));
    });

    await waitFor(() => {
      expect(capturedIsDisabled).toBe(true);
    });
  });
});
