/**
 * @module hooks/use-post-composer
 * 投稿コンポーザ（新規作成・編集）の入力状態を管理するフック。
 * フォームの dirty 判定・画像の追加/削除・動画選択を一元管理する。
 */

import { useState, useCallback, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';
import type { AttachedImage } from '@/components/post/ImageAttachmentGrid';
import { MAX_POST_IMAGES_FREE, MAX_POST_IMAGES_PREMIUM } from '@/lib/constants/limits/media';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type PostComposerInitialValues = {
  content: string;
  genreIds: string[];
  imageUris: string[];
  videoUri: string | null;
};

type UsePostComposerParams = {
  isPremium: boolean;
  initialValues?: PostComposerInitialValues;
};

// ---------------------------------------------------------------------------
// ユニーク ID 生成（localId 用）
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateLocalId(): string {
  _idCounter += 1;
  return `local-${Date.now()}-${_idCounter}`;
}

// ---------------------------------------------------------------------------
// フック
// ---------------------------------------------------------------------------

export function usePostComposer({ isPremium, initialValues }: UsePostComposerParams) {
  const maxImages = isPremium ? MAX_POST_IMAGES_PREMIUM : MAX_POST_IMAGES_FREE;

  const [content, setContent] = useState(initialValues?.content ?? '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialValues?.genreIds ?? []);
  const [images, setImages] = useState<AttachedImage[]>(() =>
    (initialValues?.imageUris ?? []).map((uri) => ({ uri, localId: generateLocalId() }))
  );
  const [videoUri, setVideoUri] = useState<string | null>(initialValues?.videoUri ?? null);
  // expo-image-picker が返す fileSize を保持する。presigned PUT の Content-Length に使う。
  const [videoFileSize, setVideoFileSize] = useState<number | undefined>(undefined);

  const isDirty = useMemo(() => {
    const initialContent = initialValues?.content ?? '';
    const initialGenreIds = initialValues?.genreIds ?? [];
    const initialImageUris = initialValues?.imageUris ?? [];
    const initialVideo = initialValues?.videoUri ?? null;

    if (content !== initialContent) return true;
    if (selectedGenres.length !== initialGenreIds.length) return true;
    if (!selectedGenres.every((g) => initialGenreIds.includes(g))) return true;
    if (images.length !== initialImageUris.length) return true;
    if (videoUri !== initialVideo) return true;
    return false;
  }, [content, selectedGenres, images, videoUri, initialValues]);

  const handleAddImage = useCallback(async () => {
    const remaining = maxImages - images.length;
    if (remaining <= 0) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'ios') {
        Alert.alert(
          '写真へのアクセスが必要です',
          '設定アプリから写真へのアクセスを許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => void Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert(
          '写真へのアクセスが必要です',
          '設定アプリから写真へのアクセスを許可してください。'
        );
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });

    if (!result.canceled) {
      const newImages: AttachedImage[] = result.assets.map((asset) => ({
        uri: asset.uri,
        localId: generateLocalId(),
      }));
      setImages((prev) => [...prev, ...newImages].slice(0, maxImages));
    }
  }, [images.length, maxImages]);

  const handleRemoveImage = useCallback((localId: string) => {
    setImages((prev) => prev.filter((img) => img.localId !== localId));
  }, []);

  const handleAddVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '写真・動画へのアクセスが必要です',
        '設定アプリから許可してください。'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset !== undefined) {
        setVideoUri(asset.uri);
        // asset.fileSize は端末・OS によって undefined になり得る（取得不可時は undefined のまま渡す）
        setVideoFileSize(asset.fileSize ?? undefined);
      }
    }
  }, []);

  const handleRemoveVideo = useCallback(() => {
    setVideoUri(null);
    setVideoFileSize(undefined);
  }, []);

  const reset = useCallback(() => {
    setContent(initialValues?.content ?? '');
    setSelectedGenres(initialValues?.genreIds ?? []);
    setImages(
      (initialValues?.imageUris ?? []).map((uri) => ({ uri, localId: generateLocalId() }))
    );
    setVideoUri(initialValues?.videoUri ?? null);
    setVideoFileSize(undefined);
  }, [initialValues]);

  return {
    content,
    setContent,
    selectedGenres,
    setSelectedGenres,
    images,
    videoUri,
    videoFileSize,
    isDirty,
    maxImages,
    handleAddImage,
    handleRemoveImage,
    handleAddVideo,
    handleRemoveVideo,
    reset,
  };
}
