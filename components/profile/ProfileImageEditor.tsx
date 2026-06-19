/**
 * @module components/profile/ProfileImageEditor
 * ヘッダー画像（横長）とアバター画像（円形）を編集するエリア。
 * 仕様: docs/design/profile-edit.md §6
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { compressAvatarImage, compressHeaderImage } from '@/lib/utils/image-compress';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorder,
  spacing4,
  radiusFull,
  textXl,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 80;
const AVATAR_BORDER_WIDTH = 3;
const AVATAR_EDIT_BUTTON_SIZE = 28;
const AVATAR_EDIT_ICON_SIZE = 12;
const HEADER_EDIT_BUTTON_SIZE = 44;
const HEADER_EDIT_ICON_SIZE = 16;
const HEADER_ASPECT_RATIO = 4;
const CAMERA_PLACEHOLDER_ICON_SIZE = 24;
/** ヘッダー下からアバターが重なる量（アバター半径分） */
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ProfileImageEditorProps = {
  avatarUrl: string | null;
  headerUrl: string | null;
  avatarLocalUri: string | null;
  headerLocalUri: string | null;
  nickname: string;
  onAvatarChange: (localUri: string) => void;
  onHeaderChange: (localUri: string) => void;
  onAvatarRemove: () => void;
  onHeaderRemove: () => void;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileImageEditor({
  avatarUrl,
  headerUrl,
  avatarLocalUri,
  headerLocalUri,
  nickname,
  onAvatarChange,
  onHeaderChange,
  onAvatarRemove,
  onHeaderRemove,
  isDisabled,
}: ProfileImageEditorProps) {
  const { width } = useWindowDimensions();
  const headerHeight = Math.round((width - spacing4 * 2) / HEADER_ASPECT_RATIO);

  const handlePickImage = useCallback(
    (type: 'avatar' | 'header', hasCurrentImage: boolean) => {
      if (isDisabled) return;

      const handleLibraryPick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            '写真へのアクセスが必要です',
            '設定アプリから写真ライブラリへのアクセスを許可してください。',
            [{ text: 'OK' }]
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1,
        });
        if (!result.canceled && result.assets.length > 0) {
          const localUri = result.assets[0].uri;
          if (type === 'avatar') {
            const compressed = await compressAvatarImage(localUri);
            onAvatarChange(compressed.uri);
          } else {
            const compressed = await compressHeaderImage(localUri);
            onHeaderChange(compressed.uri);
          }
        }
      };

      const handleCameraPick = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'カメラへのアクセスが必要です',
            '設定アプリからカメラへのアクセスを許可してください。',
            [{ text: 'OK' }]
          );
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1,
        });
        if (!result.canceled && result.assets.length > 0) {
          const localUri = result.assets[0].uri;
          if (type === 'avatar') {
            const compressed = await compressAvatarImage(localUri);
            onAvatarChange(compressed.uri);
          } else {
            const compressed = await compressHeaderImage(localUri);
            onHeaderChange(compressed.uri);
          }
        }
      };

      Alert.alert(
        type === 'avatar' ? 'プロフィール写真を変更' : 'ヘッダー画像を変更',
        undefined,
        [
          { text: '写真ライブラリから選択', onPress: handleLibraryPick },
          { text: 'カメラで撮影', onPress: handleCameraPick },
          ...(hasCurrentImage
            ? [
                {
                  text: '現在の画像を削除',
                  style: 'destructive' as const,
                  onPress: () => {
                    if (type === 'avatar') {
                      onAvatarRemove();
                    } else {
                      onHeaderRemove();
                    }
                  },
                },
              ]
            : []),
          { text: 'キャンセル', style: 'cancel' as const },
        ]
      );
    },
    [isDisabled, onAvatarChange, onHeaderChange, onAvatarRemove, onHeaderRemove]
  );

  const currentAvatarSource = avatarLocalUri ?? avatarUrl;
  const currentHeaderSource = headerLocalUri ?? headerUrl;
  const hasAvatar = currentAvatarSource !== null;
  const hasHeader = currentHeaderSource !== null;
  const avatarInitial = nickname.length > 0 ? nickname.charAt(0) : '?';

  return (
    <View style={[styles.container, { paddingBottom: AVATAR_OVERLAP + spacing4 }]}>
      {/* ヘッダー画像エリア */}
      <TouchableOpacity
        style={[styles.headerImageContainer, { height: headerHeight }]}
        onPress={() => handlePickImage('header', hasHeader)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`ヘッダー画像を変更。現在${hasHeader ? '設定済み' : '未設定'}`}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        {hasHeader ? (
          <Image
            source={{ uri: currentHeaderSource }}
            style={styles.headerImage}
            contentFit="cover"
            accessibilityLabel="ヘッダー画像"
          />
        ) : (
          <View style={[styles.headerImagePlaceholder, { height: headerHeight }]}>
            <Ionicons
              name="camera-outline"
              size={CAMERA_PLACEHOLDER_ICON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        )}

        {/* ヘッダー編集ボタン（右下） */}
        <View style={styles.headerEditButton}>
          <Ionicons
            name="pencil"
            size={HEADER_EDIT_ICON_SIZE}
            color={colorActionPrimaryText}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      </TouchableOpacity>

      {/* アバター画像エリア（ヘッダー左下オーバーラップ） */}
      <TouchableOpacity
        style={[styles.avatarContainer, { top: headerHeight - AVATAR_OVERLAP }]}
        onPress={() => handlePickImage('avatar', hasAvatar)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`プロフィール写真を変更。現在${hasAvatar ? '設定済み' : '未設定'}`}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        {hasAvatar ? (
          <Image
            source={{ uri: currentAvatarSource }}
            style={styles.avatarImage}
            contentFit="cover"
            accessibilityLabel="プロフィール写真"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitialText} accessibilityElementsHidden>
              {avatarInitial}
            </Text>
          </View>
        )}

        {/* アバター編集ボタン（右下オーバーレイ） */}
        <View style={styles.avatarEditButton}>
          <Ionicons
            name="pencil"
            size={AVATAR_EDIT_ICON_SIZE}
            color={colorActionPrimaryText}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  headerImageContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerImagePlaceholder: {
    width: '100%',
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEditButton: {
    position: 'absolute',
    bottom: spacing4,
    right: spacing4,
    width: HEADER_EDIT_BUTTON_SIZE,
    height: HEADER_EDIT_BUTTON_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'absolute',
    left: spacing4,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radiusFull,
    borderWidth: AVATAR_BORDER_WIDTH,
    borderColor: colorBackground,
    overflow: 'hidden',
    backgroundColor: colorSurface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    ...textXl,
    color: colorTextSecondary,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: AVATAR_EDIT_BUTTON_SIZE,
    height: AVATAR_EDIT_BUTTON_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colorBorder,
  },
});
