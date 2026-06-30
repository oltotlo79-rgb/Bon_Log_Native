/**
 * @module components/post/QuotedPostCard
 * 引用投稿の埋め込みカード。本文の下に枠線付きで小さく表示する。
 * Web: components/post/QuotedPost.tsx に相当。
 * タップで引用元投稿の詳細画面へ遷移する。
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  colorBorder,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  radiusMd,
  textSm,
  textXs,
  durationFast,
} from '@/lib/constants/design-tokens';
import { routePostDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const QUOTED_AVATAR_SIZE = 20;
/** 引用本文の最大行数（Web: line-clamp-3 相当）*/
const QUOTED_CONTENT_LINES = 3;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type QuotedPostMedia = {
  id: string;
  url: string;
  type: string;
  sortOrder: number;
};

export type QuotedPostCardProps = {
  post: {
    id: string;
    content: string | null;
    user: {
      id: string;
      nickname: string;
      avatarUrl: string | null;
    };
    media?: readonly QuotedPostMedia[];
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const QuotedPostCard = React.memo(function QuotedPostCard({
  post,
}: QuotedPostCardProps) {
  const handlePress = useMemo(
    () => () => {
      router.push(routePostDetail(post.id));
    },
    [post.id]
  );

  // 引用投稿に画像が添付されている場合、最初の1枚をサムネイルとして表示する
  const firstImage = useMemo(() => {
    const images =
      post.media?.filter((m) => m.type === 'image').sort((a, b) => a.sortOrder - b.sortOrder) ??
      [];
    return images[0] ?? null;
  }, [post.media]);

  const cardAccessLabel = `${post.user.nickname}の引用元投稿を表示`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={cardAccessLabel}
    >
      {/* ユーザー行 */}
      <View style={styles.userRow}>
        {post.user.avatarUrl !== null ? (
          <Image
            source={{ uri: post.user.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={durationFast}
            recyclingKey={post.user.id}
            accessibilityRole="image"
            accessibilityLabel={`${post.user.nickname}のプロフィール画像`}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText} accessibilityElementsHidden>
              {post.user.nickname.charAt(0)}
            </Text>
          </View>
        )}

        <Text style={styles.nickname} numberOfLines={1} ellipsizeMode="tail">
          {post.user.nickname}
        </Text>
      </View>

      {/* 引用本文 */}
      {post.content !== null && post.content !== undefined && post.content.length > 0 && (
        <Text
          style={styles.content}
          numberOfLines={QUOTED_CONTENT_LINES}
          ellipsizeMode="tail"
        >
          {post.content}
        </Text>
      )}

      {/* 画像サムネイル（1枚目のみ小さく表示） */}
      {firstImage !== null && (
        <Image
          source={{ uri: firstImage.url }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={durationFast}
          recyclingKey={firstImage.id}
          accessibilityRole="image"
          accessibilityLabel={`${post.user.nickname}の引用元画像`}
        />
      )}
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
  },
  containerPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  avatar: {
    width: QUOTED_AVATAR_SIZE,
    height: QUOTED_AVATAR_SIZE,
    borderRadius: QUOTED_AVATAR_SIZE / 2,
    flexShrink: 0,
  },
  avatarFallback: {
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    ...textXs,
    color: colorTextSecondary,
  },
  nickname: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  content: {
    ...textSm,
    color: colorTextPrimary,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: radiusMd - 2,
    backgroundColor: colorSurfaceMuted,
    marginTop: spacing2,
  },
});
