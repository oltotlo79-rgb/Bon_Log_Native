/**
 * @module components/common/UserAvatar
 * ユーザーアバター表示の共通コンポーネント。
 * avatarUrl が未設定の場合、userId のハッシュ値で5種の円相（enso）墨絵から1つを選ぶ。
 * 選択アルゴリズムは Web 版 lib/utils/avatar.ts の getDefaultAvatarPath と同一。
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  colorBorder,
  radiusFull,
  durationFast,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// enso 画像のプリロード（静的 require は Metro がバンドル時に解決する）
// ---------------------------------------------------------------------------

const ENSO_IMAGES = [
  require('@/assets/images/avatars/enso-avatar-1.webp'),
  require('@/assets/images/avatars/enso-avatar-2.webp'),
  require('@/assets/images/avatars/enso-avatar-3.webp'),
  require('@/assets/images/avatars/enso-avatar-4.webp'),
  require('@/assets/images/avatars/enso-avatar-5.webp'),
] as const;

// ---------------------------------------------------------------------------
// userId → enso インデックス（Web 版と同一ロジック）
// ---------------------------------------------------------------------------

function getEnsoImage(userId: string): (typeof ENSO_IMAGES)[number] {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % 5;
  return ENSO_IMAGES[index];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UserAvatarProps = {
  /** プロフィール画像 URL。null / undefined の場合は enso にフォールバック */
  avatarUrl: string | null | undefined;
  /** userId がある場合は5種の enso から決定論的に1つを選ぶ。ない場合は enso-1 固定 */
  userId?: string;
  /** アバターの一辺サイズ（px）*/
  size: number;
  /** 画像の説明テキスト（アクセシビリティ用）*/
  accessibilityLabel: string;
  /** expo-image の recyclingKey に使う（FlatList 内での再利用最適化）*/
  recyclingKey?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserAvatar({
  avatarUrl,
  userId,
  size,
  accessibilityLabel,
  recyclingKey,
}: UserAvatarProps) {
  const style = [
    styles.base,
    { width: size, height: size, borderRadius: size / 2 },
  ];

  if (avatarUrl !== null && avatarUrl !== undefined) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={style}
        contentFit="cover"
        transition={durationFast}
        recyclingKey={recyclingKey}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  const ensoSource =
    userId !== undefined && userId.length > 0
      ? getEnsoImage(userId)
      : ENSO_IMAGES[0];

  return (
    <Image
      source={ensoSource}
      style={style}
      contentFit="cover"
      transition={durationFast}
      recyclingKey={recyclingKey}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    borderRadius: radiusFull,
    borderWidth: 1.5,
    borderColor: colorBorder,
  },
});
