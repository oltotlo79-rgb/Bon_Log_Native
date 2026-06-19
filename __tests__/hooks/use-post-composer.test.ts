/**
 * @module __tests__/hooks/use-post-composer
 * usePostComposer フックのテスト。
 * isDirty / maxImages / 画像追加削除 / 動画追加削除 / reset を検証する。
 */

import { renderHook, act } from '@testing-library/react-native';
import { usePostComposer } from '@/hooks/use-post-composer';
import { MAX_POST_IMAGES_FREE, MAX_POST_IMAGES_PREMIUM } from '@/lib/constants/limits/media';

// expo-image-picker のモック（setup.ts には未登録のためここで定義）
const mockRequestMediaLibraryPermissions = jest.fn();
const mockLaunchImageLibrary = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissions(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibrary(...args),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'granted' });
  mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });
});

// ---------------------------------------------------------------------------
// maxImages
// ---------------------------------------------------------------------------

describe('maxImages', () => {
  it('無料ユーザーは MAX_POST_IMAGES_FREE', () => {
    const { result } = renderHook(() =>
      usePostComposer({ isPremium: false })
    );
    expect(result.current.maxImages).toBe(MAX_POST_IMAGES_FREE);
  });

  it('プレミアムユーザーは MAX_POST_IMAGES_PREMIUM', () => {
    const { result } = renderHook(() =>
      usePostComposer({ isPremium: true })
    );
    expect(result.current.maxImages).toBe(MAX_POST_IMAGES_PREMIUM);
  });
});

// ---------------------------------------------------------------------------
// isDirty
// ---------------------------------------------------------------------------

describe('isDirty', () => {
  it('初期状態は false', () => {
    const { result } = renderHook(() =>
      usePostComposer({ isPremium: false, initialValues: { content: '初期テキスト', genreIds: [], imageUris: [], videoUri: null } })
    );
    expect(result.current.isDirty).toBe(false);
  });

  it('content が変更されると true になる', () => {
    const { result } = renderHook(() =>
      usePostComposer({ isPremium: false, initialValues: { content: '', genreIds: [], imageUris: [], videoUri: null } })
    );

    act(() => {
      result.current.setContent('新しい内容');
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('selectedGenres が変更されると true になる', () => {
    const { result } = renderHook(() =>
      usePostComposer({ isPremium: false, initialValues: { content: '', genreIds: [], imageUris: [], videoUri: null } })
    );

    act(() => {
      result.current.setSelectedGenres(['松柏類']);
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('initialValues と同じ値に戻すと false になる', () => {
    const { result } = renderHook(() =>
      usePostComposer({ isPremium: false, initialValues: { content: '初期', genreIds: [], imageUris: [], videoUri: null } })
    );

    act(() => {
      result.current.setContent('変更');
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.setContent('初期');
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('initialValues が未指定の場合、空文字との差分で判定される', () => {
    const { result } = renderHook(() =>
      usePostComposer({ isPremium: false })
    );
    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.setContent('hello');
    });
    expect(result.current.isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// handleAddImage
// ---------------------------------------------------------------------------

describe('handleAddImage', () => {
  it('画像選択が成功すると images に追加される', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///photo1.jpg' }],
    });

    const { result } = renderHook(() => usePostComposer({ isPremium: false }));

    await act(async () => {
      await result.current.handleAddImage();
    });

    expect(result.current.images).toHaveLength(1);
    expect(result.current.images[0]?.uri).toBe('file:///photo1.jpg');
  });

  it('キャンセルされた場合は images に変化なし', async () => {
    mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });

    const { result } = renderHook(() => usePostComposer({ isPremium: false }));

    await act(async () => {
      await result.current.handleAddImage();
    });

    expect(result.current.images).toHaveLength(0);
  });

  it('maxImages に達している場合は launchImageLibraryAsync を呼ばない', async () => {
    const { result } = renderHook(() =>
      usePostComposer({
        isPremium: false,
        initialValues: { content: '', genreIds: [], imageUris: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'], videoUri: null },
      })
    );

    // 無料ユーザーは4枚が上限
    await act(async () => {
      await result.current.handleAddImage();
    });

    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
  });

  it('権限が付与されない場合は images に変化なし', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => usePostComposer({ isPremium: false }));

    await act(async () => {
      await result.current.handleAddImage();
    });

    expect(result.current.images).toHaveLength(0);
    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
  });

  it('複数枚選択しても maxImages を超えて追加されない', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'a.jpg' },
        { uri: 'b.jpg' },
        { uri: 'c.jpg' },
        { uri: 'd.jpg' },
        { uri: 'e.jpg' }, // 5枚目（無料の上限は4枚）
      ],
    });

    const { result } = renderHook(() => usePostComposer({ isPremium: false }));

    await act(async () => {
      await result.current.handleAddImage();
    });

    expect(result.current.images.length).toBeLessThanOrEqual(MAX_POST_IMAGES_FREE);
  });

  it('各画像に localId が付与される', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'photo.jpg' }],
    });

    const { result } = renderHook(() => usePostComposer({ isPremium: false }));

    await act(async () => {
      await result.current.handleAddImage();
    });

    expect(result.current.images[0]?.localId).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// handleRemoveImage
// ---------------------------------------------------------------------------

describe('handleRemoveImage', () => {
  it('指定した localId の画像が削除される', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'photo1.jpg' }],
    });

    const { result } = renderHook(() => usePostComposer({ isPremium: false }));

    await act(async () => {
      await result.current.handleAddImage();
    });

    const localId = result.current.images[0]?.localId;
    expect(localId).toBeTruthy();

    act(() => {
      result.current.handleRemoveImage(localId!);
    });

    expect(result.current.images).toHaveLength(0);
  });

  it('存在しない localId を指定しても何も起きない', () => {
    const { result } = renderHook(() =>
      usePostComposer({
        isPremium: false,
        initialValues: { content: '', genreIds: [], imageUris: ['photo.jpg'], videoUri: null },
      })
    );

    const initialLength = result.current.images.length;

    act(() => {
      result.current.handleRemoveImage('non-existent-id');
    });

    expect(result.current.images).toHaveLength(initialLength);
  });
});

// ---------------------------------------------------------------------------
// handleAddVideo / handleRemoveVideo
// ---------------------------------------------------------------------------

describe('handleAddVideo', () => {
  it('動画選択が成功すると videoUri が設定される', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///video.mp4' }],
    });

    const { result } = renderHook(() => usePostComposer({ isPremium: true }));

    await act(async () => {
      await result.current.handleAddVideo();
    });

    expect(result.current.videoUri).toBe('file:///video.mp4');
  });

  it('キャンセルされた場合は videoUri に変化なし', async () => {
    mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });

    const { result } = renderHook(() => usePostComposer({ isPremium: true }));

    await act(async () => {
      await result.current.handleAddVideo();
    });

    expect(result.current.videoUri).toBeNull();
  });

  it('権限が付与されない場合は videoUri に変化なし', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => usePostComposer({ isPremium: true }));

    await act(async () => {
      await result.current.handleAddVideo();
    });

    expect(result.current.videoUri).toBeNull();
  });
});

describe('handleRemoveVideo', () => {
  it('videoUri が null になる', () => {
    const { result } = renderHook(() =>
      usePostComposer({
        isPremium: true,
        initialValues: { content: '', genreIds: [], imageUris: [], videoUri: 'file:///video.mp4' },
      })
    );

    expect(result.current.videoUri).toBe('file:///video.mp4');

    act(() => {
      result.current.handleRemoveVideo();
    });

    expect(result.current.videoUri).toBeNull();
  });

  it('削除後に isDirty が true になる（初期に videoUri があった場合）', () => {
    const { result } = renderHook(() =>
      usePostComposer({
        isPremium: true,
        initialValues: { content: '', genreIds: [], imageUris: [], videoUri: 'file:///video.mp4' },
      })
    );

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.handleRemoveVideo();
    });

    expect(result.current.isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  it('content / selectedGenres / images / videoUri を初期値に戻す', async () => {
    const initialValues = {
      content: '初期テキスト',
      genreIds: ['松柏類'],
      imageUris: [],
      videoUri: null,
    };

    const { result } = renderHook(() => usePostComposer({ isPremium: false, initialValues }));

    act(() => {
      result.current.setContent('変更後のテキスト');
      result.current.setSelectedGenres([]);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.content).toBe('初期テキスト');
    expect(result.current.selectedGenres).toEqual(['松柏類']);
    expect(result.current.images).toHaveLength(0);
    expect(result.current.videoUri).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });

  it('initialValues が未指定の場合は空文字・空配列・null にリセットされる', async () => {
    const { result } = renderHook(() => usePostComposer({ isPremium: false }));

    act(() => {
      result.current.setContent('なにか書いた');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.content).toBe('');
    expect(result.current.selectedGenres).toEqual([]);
    expect(result.current.images).toHaveLength(0);
    expect(result.current.videoUri).toBeNull();
  });
});
