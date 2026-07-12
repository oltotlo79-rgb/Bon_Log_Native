/**
 * @module hooks/use-comment-media
 * コメント入力バーの画像・動画添付の選択状態を管理するフック。
 * 選択フロー（権限確認 → expo-image-picker 起動）は hooks/use-post-composer.ts と同一実装を
 * コメントの上限（画像 MAX_COMMENT_IMAGES / 動画はプレミアムのみ MAX_COMMENT_VIDEOS_PREMIUM）向けに提供する。
 * 実際のアップロード（圧縮 → presigned）は呼び出し側（CommentInput の送信時）が担う。
 */

import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';
import type { AttachedImage } from '@/components/post/ImageAttachmentGrid';
import {
  MAX_COMMENT_IMAGES,
  MAX_COMMENT_VIDEOS_FREE,
  MAX_COMMENT_VIDEOS_PREMIUM,
} from '@/lib/constants/limits/media';

let _idCounter = 0;
function generateLocalId(): string {
  _idCounter += 1;
  return `comment-media-${Date.now()}-${_idCounter}`;
}

type UseCommentMediaParams = {
  isPremium: boolean;
};

export function useCommentMedia({ isPremium }: UseCommentMediaParams) {
  const maxVideos = isPremium ? MAX_COMMENT_VIDEOS_PREMIUM : MAX_COMMENT_VIDEOS_FREE;

  const [images, setImages] = useState<AttachedImage[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  // expo-image-picker が返す fileSize を保持する。presigned PUT の Content-Length に使う。
  const [videoFileSize, setVideoFileSize] = useState<number | undefined>(undefined);

  const handleAddImage = useCallback(async () => {
    const remaining = MAX_COMMENT_IMAGES - images.length;
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
      setImages((prev) => [...prev, ...newImages].slice(0, MAX_COMMENT_IMAGES));
    }
  }, [images.length]);

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
    setImages([]);
    setVideoUri(null);
    setVideoFileSize(undefined);
  }, []);

  return {
    images,
    videoUri,
    videoFileSize,
    maxImages: MAX_COMMENT_IMAGES,
    maxVideos,
    handleAddImage,
    handleRemoveImage,
    handleAddVideo,
    handleRemoveVideo,
    reset,
  };
}
